import { SQLiteService } from './sqliteService';
import LoggingService from './loggingService';
import { NotificationService } from './notificationService';
import { AuditMetricsService } from './auditMetricsService';
import { executeOptimization } from '../scripts/autoOptimize';
import path from 'path';
import fs from 'fs/promises';

export class AutoRecoveryService {
  private static instance: AutoRecoveryService;
  private sqlite: SQLiteService;
  private logger: LoggingService;
  private notificationService: NotificationService;
  private metricsService: AuditMetricsService;
  private isRecovering: boolean = false;

  private constructor() {
    this.sqlite = SQLiteService.getInstance();
    this.logger = LoggingService.getInstance();
    this.notificationService = NotificationService.getInstance();
    this.metricsService = AuditMetricsService.getInstance();
    this.startHealthCheck();
  }

  public static getInstance(): AutoRecoveryService {
    if (!AutoRecoveryService.instance) {
      AutoRecoveryService.instance = new AutoRecoveryService();
    }
    return AutoRecoveryService.instance;
  }

  private async startHealthCheck(): Promise<void> {
    setInterval(async () => {
      try {
        await this.checkDatabaseHealth();
        await this.checkPerformanceMetrics();
      } catch (error) {
        this.logger.logError(error as Error, {
          context: 'AutoRecovery',
          message: 'Health check failed'
        });
      }
    }, 5 * 60 * 1000); // 5分ごとにチェック
  }

  private async checkDatabaseHealth(): Promise<void> {
    try {
      // データベース接続チェック
      await this.sqlite.get('SELECT 1');

      // インデックス健全性チェック
      const indexCheck = await this.sqlite.all(`
        SELECT * FROM sqlite_master 
        WHERE type='index' AND sql IS NULL
      `);

      if (indexCheck.length > 0) {
        await this.handleCorruptedIndexes();
      }

      // データベースサイズチェック
      const dbPath = process.env.DB_PATH || 'database.sqlite';
      const stats = await fs.stat(dbPath);
      const sizeInMB = stats.size / (1024 * 1024);

      if (sizeInMB > 1000) { // 1GB超
        await this.handleLargeDatabase();
      }
    } catch (error) {
      await this.handleDatabaseError(error as Error);
    }
  }

  private async checkPerformanceMetrics(): Promise<void> {
    try {
      const metrics = await this.metricsService.getMetrics(
        'query_duration',
        new Date(Date.now() - 15 * 60 * 1000) // 過去15分
      );

      const avgDuration = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
      
      if (avgDuration > 1000) { // 1秒以上
        await this.handleSlowQueries();
      }
    } catch (error) {
      this.logger.logError(error as Error, {
        context: 'AutoRecovery',
        message: 'Performance check failed'
      });
    }
  }

  private async handleCorruptedIndexes(): Promise<void> {
    try {
      this.logger.logInfo({
        context: 'AutoRecovery',
        message: 'Corrupted indexes detected, attempting repair'
      });

      // インデックスの再構築
      await this.sqlite.run('REINDEX');

      await this.notifyRecoveryAction('インデックス修復', true);
    } catch (error) {
      await this.notifyRecoveryAction('インデックス修復', false, error as Error);
    }
  }

  private async handleLargeDatabase(): Promise<void> {
    try {
      this.logger.logInfo({
        context: 'AutoRecovery',
        message: 'Database size exceeds threshold, performing cleanup'
      });

      // 古いデータのアーカイブ
      const archiveDate = new Date();
      archiveDate.setFullYear(archiveDate.getFullYear() - 1);

      await this.sqlite.run(`
        INSERT INTO permission_audit_archive
        SELECT * FROM permission_audit
        WHERE timestamp < ?
      `, [archiveDate.toISOString()]);

      await this.sqlite.run(`
        DELETE FROM permission_audit
        WHERE timestamp < ?
      `, [archiveDate.toISOString()]);

      // ストレージの最適化
      await this.sqlite.run('VACUUM');

      await this.notifyRecoveryAction('データベース最適化', true);
    } catch (error) {
      await this.notifyRecoveryAction('データベース最適化', false, error as Error);
    }
  }

  private async handleSlowQueries(): Promise<void> {
    try {
      this.logger.logInfo({
        context: 'AutoRecovery',
        message: 'Slow queries detected, optimizing database'
      });

      await executeOptimization();

      await this.notifyRecoveryAction('クエリ最適化', true);
    } catch (error) {
      await this.notifyRecoveryAction('クエリ最適化', false, error as Error);
    }
  }

  private async handleDatabaseError(error: Error): Promise<void> {
    if (this.isRecovering) return;

    this.isRecovering = true;
    try {
      this.logger.logError(error, {
        context: 'AutoRecovery',
        message: 'Database error detected'
      });

      // バックアップからの復元を試行
      const backupPath = path.join(process.env.BACKUP_DIR || 'backups', 'latest.sqlite');
      
      if (await this.fileExists(backupPath)) {
        // 現在のDBをバックアップ
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const corrupted = path.join(
          process.env.BACKUP_DIR || 'backups',
          `corrupted_${timestamp}.sqlite`
        );
        
        await fs.copyFile(process.env.DB_PATH || 'database.sqlite', corrupted);
        
        // バックアップから復元
        await fs.copyFile(backupPath, process.env.DB_PATH || 'database.sqlite');
        
        await this.notifyRecoveryAction('データベース復元', true);
      } else {
        throw new Error('No backup available for recovery');
      }
    } catch (recoveryError) {
      await this.notifyRecoveryAction('データベース復元', false, recoveryError as Error);
    } finally {
      this.isRecovering = false;
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async notifyRecoveryAction(
    action: string,
    success: boolean,
    error?: Error
  ): Promise<void> {
    try {
      await this.notificationService.sendNotification({
        userId: 'system',
        userEmail: 'admin@example.com',
        title: `自動リカバリー: ${action} ${success ? '成功' : '失敗'}`,
        body: `
          アクション: ${action}
          結果: ${success ? '成功' : '失敗'}
          ${error ? `エラー: ${error.message}` : ''}
          時刻: ${new Date().toLocaleString()}
        `,
        type: 'system',
        priority: success ? 'low' : 'high'
      });
    } catch (notifyError) {
      this.logger.logError(notifyError as Error, {
        context: 'AutoRecovery',
        message: 'Failed to send recovery notification'
      });
    }
  }
}