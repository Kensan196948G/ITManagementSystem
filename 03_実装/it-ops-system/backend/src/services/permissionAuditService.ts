import { SQLiteService } from './sqliteService';
import LoggingService from './loggingService';
import { AuthService } from './authService';
import { NotificationService } from './notificationService';
import { Request } from 'express';
import { AuditMetricsService } from './auditMetricsService';

const logger = LoggingService.getInstance();

/**
 * 権限変更監査のタイプ定義
 */
export interface PermissionAuditRecord {
  id?: number;
  timestamp: Date;
  actorId: string;
  actorEmail: string;
  targetId: string;
  targetEmail: string;
  action: 'add' | 'remove' | 'modify';
  resourceType: string;
  resourceName: string;
  permissionBefore?: string;
  permissionAfter?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  applicationId?: string;
}

/**
 * 権限変更監査レポートのフィルター
 */
export interface AuditReportFilter {
  startDate?: Date;
  endDate?: Date;
  actorEmail?: string;
  targetEmail?: string;
  action?: string;
  resourceType?: string;
  limit?: number;
  offset?: number;
}

/**
 * 権限変更監査サービス
 * 権限変更の記録、検索、レポート生成を提供
 */
export class PermissionAuditService {
  private static instance: PermissionAuditService;
  private sqlite: SQLiteService;
  private authService: AuthService;
  private notificationService: NotificationService;
  private metricsService: AuditMetricsService;

  private constructor() {
    this.sqlite = SQLiteService.getInstance();
    this.authService = AuthService.getInstance();
    this.notificationService = NotificationService.getInstance();
    this.metricsService = AuditMetricsService.getInstance();
    this.initializeDatabase();
  }

  public static getInstance(): PermissionAuditService {
    if (!PermissionAuditService.instance) {
      PermissionAuditService.instance = new PermissionAuditService();
    }
    return PermissionAuditService.instance;
  }

  /**
   * 監査テーブルの初期化
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // 監査テーブルの作成
      await this.sqlite.run(`
        CREATE TABLE IF NOT EXISTS permission_audit (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          actor_email TEXT NOT NULL,
          target_id TEXT NOT NULL,
          target_email TEXT NOT NULL,
          action TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_name TEXT NOT NULL,
          permission_before TEXT,
          permission_after TEXT,
          reason TEXT,
          ip_address TEXT,
          user_agent TEXT,
          application_id TEXT
        )
      `);

      // レビューテーブルの作成
      await this.sqlite.run(`
        CREATE TABLE IF NOT EXISTS permission_audit_reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          audit_id INTEGER NOT NULL,
          reviewer_id TEXT NOT NULL,
          reviewer_email TEXT NOT NULL,
          reviewed_at TEXT NOT NULL,
          approved INTEGER NOT NULL,
          comments TEXT,
          FOREIGN KEY (audit_id) REFERENCES permission_audit (id)
        )
      `);

      // インデックスの作成
      await this.sqlite.run(`
        CREATE INDEX IF NOT EXISTS idx_permission_audit_actor_email 
        ON permission_audit (actor_email)
      `);

      await this.sqlite.run(`
        CREATE INDEX IF NOT EXISTS idx_permission_audit_target_email 
        ON permission_audit (target_email)
      `);

      await this.sqlite.run(`
        CREATE INDEX IF NOT EXISTS idx_permission_audit_timestamp 
        ON permission_audit (timestamp)
      `);

      logger.logInfo({
        message: 'PermissionAuditService initialized - Database tables created'
      });
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionAuditService',
        message: 'Failed to initialize audit database tables'
      });
      throw error;
    }
  }

  /**
   * 権限変更の記録
   * @param record 監査レコード
   * @returns 挿入されたレコードのID
   */
  public async recordChange(record: PermissionAuditRecord): Promise<number> {
    try {
      const result = await this.sqlite.run(
        `INSERT INTO permission_audit (
          timestamp, actor_id, actor_email, target_id, target_email,
          action, resource_type, resource_name, permission_before,
          permission_after, reason, ip_address, user_agent, application_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.timestamp.toISOString(),
          record.actorId,
          record.actorEmail,
          record.targetId,
          record.targetEmail,
          record.action,
          record.resourceType,
          record.resourceName,
          record.permissionBefore || null,
          record.permissionAfter || null,
          record.reason || null,
          record.ipAddress || null,
          record.userAgent || null,
          record.applicationId || null
        ]
      );

      // メトリクスの記録
      await this.metricsService.recordMetric('permission_changes_total', 1, {
        action: record.action,
        resourceType: record.resourceType
      });

      // 権限変更通知の送信
      await this.notifyPermissionChange(record);

      logger.logInfo({
        message: 'Permission change recorded',
        details: {
          actor: record.actorEmail,
          target: record.targetEmail,
          action: record.action,
          resourceType: record.resourceType
        }
      });

      return result.lastID as number;
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionAuditService',
        message: 'Failed to record permission change',
        details: {
          actor: record.actorEmail,
          target: record.targetEmail
        }
      });
      throw error;
    }
  }

  /**
   * 権限変更の通知を送信
   * @param record 監査レコード
   */
  private async notifyPermissionChange(record: PermissionAuditRecord): Promise<void> {
    try {
      // グローバル管理者に通知
      const globalAdmins = await this.getGlobalAdmins();
      
      // アクション別のメッセージを設定
      let actionText = '';
      switch (record.action) {
        case 'add':
          actionText = '追加';
          break;
        case 'remove':
          actionText = '削除';
          break;
        case 'modify':
          actionText = '変更';
          break;
      }

      const notificationTitle = `権限${actionText}通知: ${record.targetEmail}`;
      const notificationBody = `
        ユーザー ${record.targetEmail} の権限が${actionText}されました。
        変更者: ${record.actorEmail}
        リソース: ${record.resourceType}/${record.resourceName}
        ${record.reason ? `理由: ${record.reason}` : ''}
        日時: ${record.timestamp.toLocaleString()}
      `;

      // グローバル管理者に通知
      for (const admin of globalAdmins) {
        await this.notificationService.sendNotification({
          userEmail: admin.email,
          title: notificationTitle,
          message: notificationBody,
          type: 'security',
          severity: 'error',
          data: {
            type: 'permission',
            id: record.targetId
          }
        });
      }

      // 対象ユーザーにも通知（自分自身が変更した場合を除く）
      if (record.actorEmail !== record.targetEmail) {
        await this.notificationService.sendNotification({
          userEmail: record.targetEmail,
          title: `あなたの権限が${actionText}されました`,
          message: `
            ${record.actorEmail} によって、あなたの権限が${actionText}されました。
            リソース: ${record.resourceType}/${record.resourceName}
            ${record.reason ? `理由: ${record.reason}` : ''}
            日時: ${record.timestamp.toLocaleString()}
          `,
          type: 'security',
          severity: 'error',
          data: {
            type: 'permission',
            id: record.targetId
          }
        });
      }
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionAuditService',
        message: 'Failed to send permission change notification',
        details: {
          actor: record.actorEmail,
          target: record.targetEmail
        }
      });
    }
  }

  /**
   * グローバル管理者のリストを取得
   */
  private async getGlobalAdmins(): Promise<Array<{ id: string; email: string }>> {
    try {
      return await this.sqlite.all<{ id: string; email: string }>(
        `SELECT id, email FROM users WHERE is_global_admin = 1`
      );
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionAuditService',
        message: 'Failed to fetch global admins'
      });
      return [];
    }
  }

  /**
   * フィルター条件のバリデーション
   */
  private validateAuditFilter(filter: AuditReportFilter): void {
    // 日付範囲のバリデーション
    if (filter.startDate && filter.endDate && filter.startDate > filter.endDate) {
      throw new Error('Invalid date range');
    }

    // アクションタイプのバリデーション
    if (filter.action && !['add', 'remove', 'modify'].includes(filter.action)) {
      throw new Error('Invalid action type');
    }

    // メールアドレスのバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (filter.actorEmail && !emailRegex.test(filter.actorEmail)) {
      throw new Error('Invalid email format');
    }
    if (filter.targetEmail && !emailRegex.test(filter.targetEmail)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * 監査レコードの検索
   * @param filter フィルター条件
   * @returns 監査レコードのリスト
   */
  public async searchAuditRecords(filter: AuditReportFilter): Promise<PermissionAuditRecord[]> {
    const startTime = performance.now();
    try {
      // フィルター条件のバリデーション
      this.validateAuditFilter(filter);

      const params: any[] = [];
      let query = `
        SELECT * FROM permission_audit 
        WHERE 1=1
      `;

      if (filter.startDate) {
        query += ` AND timestamp >= ?`;
        params.push(filter.startDate.toISOString());
      }

      if (filter.endDate) {
        query += ` AND timestamp <= ?`;
        params.push(filter.endDate.toISOString());
      }

      if (filter.actorEmail) {
        query += ` AND actor_email = ?`;
        params.push(filter.actorEmail);
      }

      if (filter.targetEmail) {
        query += ` AND target_email = ?`;
        params.push(filter.targetEmail);
      }

      if (filter.action) {
        query += ` AND action = ?`;
        params.push(filter.action);
      }

      if (filter.resourceType) {
        query += ` AND resource_type = ?`;
        params.push(filter.resourceType);
      }

      query += ` ORDER BY timestamp DESC`;

      if (filter.limit) {
        query += ` LIMIT ?`;
        params.push(filter.limit);

        if (filter.offset) {
          query += ` OFFSET ?`;
          params.push(filter.offset);
        }
      }

      const rows = await this.sqlite.all(query, params);

      const records = rows.map(row => ({
        id: typeof row.id === 'string' ? Number(row.id) : row.id,
        timestamp: new Date(row.timestamp),
        actorId: row.actor_id,
        actorEmail: row.actor_email,
        targetId: row.target_id,
        targetEmail: row.target_email,
        action: row.action as 'add' | 'remove' | 'modify',
        resourceType: row.resource_type,
        resourceName: row.resource_name,
        permissionBefore: row.permission_before,
        permissionAfter: row.permission_after,
        reason: row.reason,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        applicationId: row.application_id
      }));

      // 検索パフォーマンスメトリクスの記録
      const duration = performance.now() - startTime;
      await this.metricsService.recordMetric('audit_search_duration_ms', duration, {
        hasDateFilter: !!(filter.startDate || filter.endDate) ? 'true' : 'false',
        hasEmailFilter: !!(filter.actorEmail || filter.targetEmail) ? 'true' : 'false',
        resultCount: records.length.toString()
      });

      return records;
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionAuditService',
        message: 'Failed to search audit records',
        details: filter
      });
      throw error;
    }
  }

  /**
   * 監査レコードを取得
   * @param id 監査レコードID
   * @returns 監査レコード
   */
  public async getAuditRecordById(id: number): Promise<PermissionAuditRecord | null> {
    try {
      const row = await this.sqlite.get(
        `SELECT * FROM permission_audit WHERE id = ?`,
        [id]
      );

      if (!row) {
        return null;
      }

      return {
        id: typeof row.id === 'string' ? Number(row.id) : row.id,
        timestamp: new Date(row.timestamp),
        actorId: row.actor_id,
        actorEmail: row.actor_email,
        targetId: row.target_id,
        targetEmail: row.target_email,
        action: row.action as 'add' | 'remove' | 'modify',
        resourceType: row.resource_type,
        resourceName: row.resource_name,
        permissionBefore: row.permission_before,
        permissionAfter: row.permission_after,
        reason: row.reason,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        applicationId: row.application_id
      };
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionAuditService',
        message: 'Failed to get audit record by id',
        id
      });
      return null;
    }
  }

  /**
   * 権限変更統計の取得
   * @param filter フィルター条件
   * @returns 統計情報
   */
  public async getChangeStatistics(filter: AuditReportFilter): Promise<any> {
    try {
      const params: any[] = [];
      let whereClause = '1=1';

      if (filter.startDate) {
        whereClause += ` AND timestamp >= ?`;
        params.push(filter.startDate.toISOString());
      }

      if (filter.endDate) {
        whereClause += ` AND timestamp <= ?`;
        params.push(filter.endDate.toISOString());
      }

      // アクション別の集計
      const actionStats = await this.sqlite.all(`
        SELECT action, COUNT(*) as count
        FROM permission_audit
        WHERE ${whereClause}
        GROUP BY action
      `, params);

      // リソース別の集計
      const resourceStats = await this.sqlite.all(`
        SELECT resource_type, COUNT(*) as count
        FROM permission_audit
        WHERE ${whereClause}
        GROUP BY resource_type
      `, params);

      // 変更者別の集計
      const actorStats = await this.sqlite.all(`
        SELECT actor_email, COUNT(*) as count
        FROM permission_audit
        WHERE ${whereClause}
        GROUP BY actor_email
        ORDER BY count DESC
        LIMIT 10
      `, params);

      return {
        actionStats,
        resourceStats,
        actorStats
      };
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionAuditService',
        message: 'Failed to get change statistics',
        details: filter
      });
      throw error;
    }
  }

  /**
   * 権限変更レポートの生成
   * @param filter フィルター条件
   * @returns レポートデータ
   */
  public async generateReport(filter: AuditReportFilter): Promise<any> {
    try {
      // 監査レコードの取得
      const records = await this.searchAuditRecords(filter);
      
      // 統計データの取得
      const statistics = await this.getChangeStatistics(filter);

      // レポートの集計
      const totalRecords = records.length;
      const startDate = filter.startDate || new Date(0);
      const endDate = filter.endDate || new Date();
      
      return {
        metadata: {
          reportGeneratedAt: new Date(),
          totalRecords,
          filterCriteria: filter,
          timeRange: {
            start: startDate,
            end: endDate,
            durationDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          }
        },
        statistics,
        records
      };
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionAuditService',
        message: 'Failed to generate audit report',
        details: filter
      });
      throw error;
    }
  }

  /**
   * レビューデータのバリデーション
   */
  private validateReviewData(recordId: number, comments: string): void {
    if (!Number.isInteger(recordId) || recordId <= 0) {
      throw new Error('Invalid record ID');
    }

    if (!comments || comments.length > 1000) {
      throw new Error('Invalid comments length');
    }
  }

  /**
   * 権限変更レビューの登録
   * @param auditId 監査レコードID
   * @param reviewerId レビュアーID
   * @param reviewerEmail レビュアーメールアドレス
   * @param approved 承認フラグ
   * @param comments コメント
   */
  public async recordReview(
    recordId: number,
    reviewerId: string,
    reviewerEmail: string,
    approved: boolean,
    comments: string
  ): Promise<void> {
    try {
      // レビューデータのバリデーション
      this.validateReviewData(recordId, comments);

      // レビュー対象の監査レコードが存在するか確認
      const record = await this.getAuditRecordById(recordId);
      if (!record) {
        throw new Error('Audit record not found');
      }

      await this.sqlite.run(
        `INSERT INTO permission_audit_reviews (
          audit_id, reviewer_id, reviewer_email, 
          reviewed_at, approved, comments
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          recordId,
          reviewerId,
          reviewerEmail,
          new Date().toISOString(),
          approved ? 1 : 0,
          comments
        ]
      );

      // メトリクスの記録
      await this.metricsService.recordMetric('permission_reviews_total', 1, {
        approved: approved.toString(),
        reviewer: reviewerEmail
      });

      // レビュー結果の通知
      await this.notifyReviewResult(record, {
        reviewerId,
        reviewerEmail,
        approved,
        comments
      });

      logger.logInfo({
        message: 'Permission change review recorded',
        details: {
          recordId,
          reviewer: reviewerEmail,
          approved
        }
      });
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionAuditService',
        message: 'Failed to record review',
        details: {
          recordId,
          reviewer: reviewerEmail
        }
      });
      throw error;
    }
  }

  /**
   * レビュー結果の通知
   */
  private async notifyReviewResult(
    record: PermissionAuditRecord,
    review: {
      reviewerId: string;
      reviewerEmail: string;
      approved: boolean;
      comments: string;
    }
  ): Promise<void> {
    try {
      // 変更者への通知
      await this.notificationService.sendNotification({
        userEmail: record.actorEmail,
        title: `権限変更レビュー結果: ${review.approved ? '承認' : '却下'}`,
        message: `
          ${record.targetEmail}への権限変更が${review.approved ? '承認' : '却下'}されました。
          レビュアー: ${review.reviewerEmail}
          コメント: ${review.comments}
          リソース: ${record.resourceType}/${record.resourceName}
          日時: ${record.timestamp.toLocaleString()}
        `,
        type: 'security',
        severity: 'error',
        data: {
          type: 'permission',
          id: record.id!.toString()
        }
      });

      // 対象者への通知（変更者と異なる場合）
      if (record.actorEmail !== record.targetEmail) {
        await this.notificationService.sendNotification({
          userEmail: record.targetEmail,
          title: `権限変更レビュー結果: ${review.approved ? '承認' : '却下'}`,
          message: `
            あなたへの権限変更が${review.approved ? '承認' : '却下'}されました。
            レビュアー: ${review.reviewerEmail}
            コメント: ${review.comments}
            リソース: ${record.resourceType}/${record.resourceName}
            日時: ${record.timestamp.toLocaleString()}
          `,
          type: 'security',
          severity: 'error',
          data: {
            type: 'permission',
            id: record.id!.toString()
          }
        });
      }
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionAuditService',
        message: 'Failed to send review notification',
        details: {
          recordId: record.id,
          reviewer: review.reviewerEmail
        }
      });
    }
  }

  /**
   * ユーザー別の権限変更履歴の取得
   * @param userEmail ユーザーメールアドレス
   * @param limit 取得件数
   * @returns 権限変更履歴
   */
  public async getUserPermissionHistory(userEmail: string, limit = 100): Promise<PermissionAuditRecord[]> {
    try {
      const rows = await this.sqlite.all(
        `SELECT * FROM permission_audit 
        WHERE target_email = ? 
        ORDER BY timestamp DESC 
        LIMIT ?`,
        [userEmail, limit]
      );

      return rows.map(row => ({
        id: typeof row.id === 'string' ? Number(row.id) : row.id,
        timestamp: new Date(row.timestamp),
        actorId: row.actor_id,
        actorEmail: row.actor_email,
        targetId: row.target_id,
        targetEmail: row.target_email,
        action: row.action as 'add' | 'remove' | 'modify',
        resourceType: row.resource_type,
        resourceName: row.resource_name,
        permissionBefore: row.permission_before,
        permissionAfter: row.permission_after,
        reason: row.reason,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        applicationId: row.application_id
      }));
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionAuditService',
        message: 'Failed to get user permission history',
        userEmail
      });
      return [];
    }
  }
}