"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoRecoveryService = void 0;
const sqliteService_1 = require("./sqliteService");
const loggingService_1 = __importDefault(require("./loggingService"));
const notificationService_1 = require("./notificationService");
const auditMetricsService_1 = require("./auditMetricsService");
const autoOptimize_1 = require("../scripts/autoOptimize");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
class AutoRecoveryService {
    constructor() {
        this.isRecovering = false;
        this.sqlite = sqliteService_1.SQLiteService.getInstance();
        this.logger = loggingService_1.default.getInstance();
        this.notificationService = notificationService_1.NotificationService.getInstance();
        this.metricsService = auditMetricsService_1.AuditMetricsService.getInstance();
        this.startHealthCheck();
    }
    static getInstance() {
        if (!AutoRecoveryService.instance) {
            AutoRecoveryService.instance = new AutoRecoveryService();
        }
        return AutoRecoveryService.instance;
    }
    async startHealthCheck() {
        setInterval(async () => {
            try {
                await this.checkDatabaseHealth();
                await this.checkPerformanceMetrics();
            }
            catch (error) {
                this.logger.logError(error, {
                    context: 'AutoRecovery',
                    message: 'Health check failed'
                });
            }
        }, 5 * 60 * 1000); // 5分ごとにチェック
    }
    async checkDatabaseHealth() {
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
            const stats = await promises_1.default.stat(dbPath);
            const sizeInMB = stats.size / (1024 * 1024);
            if (sizeInMB > 1000) { // 1GB超
                await this.handleLargeDatabase();
            }
        }
        catch (error) {
            await this.handleDatabaseError(error);
        }
    }
    async checkPerformanceMetrics() {
        try {
            const metrics = await this.metricsService.getMetrics('query_duration', new Date(Date.now() - 15 * 60 * 1000) // 過去15分
            );
            const avgDuration = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
            if (avgDuration > 1000) { // 1秒以上
                await this.handleSlowQueries();
            }
        }
        catch (error) {
            this.logger.logError(error, {
                context: 'AutoRecovery',
                message: 'Performance check failed'
            });
        }
    }
    async handleCorruptedIndexes() {
        try {
            this.logger.logInfo({
                context: 'AutoRecovery',
                message: 'Corrupted indexes detected, attempting repair'
            });
            // インデックスの再構築
            await this.sqlite.run('REINDEX');
            await this.notifyRecoveryAction('インデックス修復', true);
        }
        catch (error) {
            await this.notifyRecoveryAction('インデックス修復', false, error);
        }
    }
    async handleLargeDatabase() {
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
        }
        catch (error) {
            await this.notifyRecoveryAction('データベース最適化', false, error);
        }
    }
    async handleSlowQueries() {
        try {
            this.logger.logInfo({
                context: 'AutoRecovery',
                message: 'Slow queries detected, optimizing database'
            });
            await (0, autoOptimize_1.executeOptimization)();
            await this.notifyRecoveryAction('クエリ最適化', true);
        }
        catch (error) {
            await this.notifyRecoveryAction('クエリ最適化', false, error);
        }
    }
    async handleDatabaseError(error) {
        if (this.isRecovering)
            return;
        this.isRecovering = true;
        try {
            this.logger.logError(error, {
                context: 'AutoRecovery',
                message: 'Database error detected'
            });
            // バックアップからの復元を試行
            const backupPath = path_1.default.join(process.env.BACKUP_DIR || 'backups', 'latest.sqlite');
            if (await this.fileExists(backupPath)) {
                // 現在のDBをバックアップ
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const corrupted = path_1.default.join(process.env.BACKUP_DIR || 'backups', `corrupted_${timestamp}.sqlite`);
                await promises_1.default.copyFile(process.env.DB_PATH || 'database.sqlite', corrupted);
                // バックアップから復元
                await promises_1.default.copyFile(backupPath, process.env.DB_PATH || 'database.sqlite');
                await this.notifyRecoveryAction('データベース復元', true);
            }
            else {
                throw new Error('No backup available for recovery');
            }
        }
        catch (recoveryError) {
            await this.notifyRecoveryAction('データベース復元', false, recoveryError);
        }
        finally {
            this.isRecovering = false;
        }
    }
    async fileExists(path) {
        try {
            await promises_1.default.access(path);
            return true;
        }
        catch {
            return false;
        }
    }
    async notifyRecoveryAction(action, success, error) {
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
        }
        catch (notifyError) {
            this.logger.logError(notifyError, {
                context: 'AutoRecovery',
                message: 'Failed to send recovery notification'
            });
        }
    }
}
exports.AutoRecoveryService = AutoRecoveryService;
//# sourceMappingURL=autoRecoveryService.js.map