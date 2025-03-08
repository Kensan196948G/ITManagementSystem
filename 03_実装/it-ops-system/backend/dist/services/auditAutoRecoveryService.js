"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditAutoRecoveryService = void 0;
const sqliteService_1 = require("./sqliteService");
const loggingService_1 = __importDefault(require("./loggingService"));
const permissionAuditService_1 = require("./permissionAuditService");
const auditMetricsService_1 = require("./auditMetricsService");
const notificationService_1 = require("./notificationService");
const logger = loggingService_1.default.getInstance();
const ALERT_THRESHOLDS = {
    errorRate: 0.05, // 5%
    responseTime: 1000, // 1秒
    concurrentRequests: 100,
    memoryUsage: 0.9 // 90%
};
class AuditAutoRecoveryService {
    constructor() {
        this.isRecovering = false;
        this.sqlite = sqliteService_1.SQLiteService.getInstance();
        this.auditService = permissionAuditService_1.PermissionAuditService.getInstance();
        this.metricsService = auditMetricsService_1.AuditMetricsService.getInstance();
        this.notificationService = notificationService_1.NotificationService.getInstance();
        this.startMonitoring();
    }
    static getInstance() {
        if (!AuditAutoRecoveryService.instance) {
            AuditAutoRecoveryService.instance = new AuditAutoRecoveryService();
        }
        return AuditAutoRecoveryService.instance;
    }
    /**
     * 監視の開始
     */
    startMonitoring() {
        // メトリクスの定期チェック
        setInterval(() => this.checkMetrics(), 60000); // 1分ごと
        // データベース健全性チェック
        setInterval(() => this.checkDatabaseHealth(), 300000); // 5分ごと
        // インデックス最適化チェック
        setInterval(() => this.checkIndexOptimization(), 3600000); // 1時間ごと
        logger.logInfo({
            message: 'Auto recovery monitoring started'
        });
    }
    /**
     * メトリクスのチェック
     */
    async checkMetrics() {
        try {
            const metrics = await this.metricsService.getMetrics('audit_search_duration_ms', new Date(Date.now() - 300000) // 過去5分間
            );
            // 応答時間の異常検知
            const avgResponseTime = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
            if (avgResponseTime > ALERT_THRESHOLDS.responseTime) {
                await this.handleSlowResponses();
            }
            // エラー率の計算と対応
            const errorMetrics = await this.metricsService.getMetrics('audit_error_count');
            const totalRequests = await this.metricsService.getMetrics('audit_request_count');
            const errorRate = errorMetrics.length / totalRequests.length;
            if (errorRate > ALERT_THRESHOLDS.errorRate) {
                await this.handleHighErrorRate();
            }
            // メモリ使用量の監視
            const memUsage = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
            if (memUsage > ALERT_THRESHOLDS.memoryUsage) {
                await this.handleHighMemoryUsage();
            }
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditAutoRecoveryService',
                message: 'Failed to check metrics'
            });
        }
    }
    /**
     * データベース健全性チェック
     */
    async checkDatabaseHealth() {
        try {
            // トランザクションの動作確認
            await this.sqlite.run('BEGIN TRANSACTION');
            await this.sqlite.run('COMMIT');
            // インデックスの状態確認
            await this.sqlite.run('ANALYZE');
            const indexStats = await this.sqlite.all('SELECT * FROM sqlite_stat1');
            // 必要に応じてインデックスを再構築
            if (this.needsIndexRebuild(indexStats)) {
                await this.rebuildIndexes();
            }
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditAutoRecoveryService',
                message: 'Database health check failed'
            });
            await this.handleDatabaseError();
        }
    }
    /**
     * インデックス最適化のチェック
     */
    async checkIndexOptimization() {
        try {
            await this.sqlite.run('ANALYZE');
            const stats = await this.sqlite.all('SELECT * FROM sqlite_stat1');
            if (this.needsIndexRebuild(stats)) {
                await this.rebuildIndexes();
            }
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditAutoRecoveryService',
                message: 'Failed to check index optimization'
            });
        }
    }
    /**
     * インデックス再構築の必要性判断
     */
    needsIndexRebuild(stats) {
        // インデックスの有効性を評価
        for (const stat of stats) {
            if (stat.avg_entries > 1000 && stat.avg_seek_time > 100) {
                return true;
            }
        }
        return false;
    }
    /**
     * インデックスの再構築
     */
    async rebuildIndexes() {
        try {
            await this.sqlite.run('REINDEX permission_audit');
            await this.sqlite.run('REINDEX permission_audit_reviews');
            await this.sqlite.run('REINDEX audit_metrics');
            logger.logInfo({
                message: 'Indexes rebuilt successfully'
            });
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditAutoRecoveryService',
                message: 'Failed to rebuild indexes'
            });
        }
    }
    /**
     * 遅いレスポンスへの対応
     */
    async handleSlowResponses() {
        if (this.isRecovering)
            return;
        this.isRecovering = true;
        try {
            // キャッシュのクリア
            await this.clearCache();
            // クエリプランの最適化
            await this.optimizeQueryPlans();
            // インデックスの再構築
            await this.rebuildIndexes();
            // 通知の送信
            await this.notificationService.sendNotification({
                userId: 'system',
                userEmail: 'admin@example.com',
                title: 'パフォーマンス自動最適化の実行',
                body: '応答時間の低下を検知し、自動最適化を実行しました',
                type: 'system',
                priority: 'medium'
            });
        }
        finally {
            this.isRecovering = false;
        }
    }
    /**
     * 高エラー率への対応
     */
    async handleHighErrorRate() {
        if (this.isRecovering)
            return;
        this.isRecovering = true;
        try {
            // サービスの状態確認
            const healthCheck = await this.performHealthCheck();
            if (!healthCheck.healthy) {
                // サービスの再起動
                await this.restartService();
            }
            // データベース接続のリセット
            await this.resetDatabaseConnections();
            // エラーログの分析と対応
            await this.analyzeAndRespondToErrors();
        }
        finally {
            this.isRecovering = false;
        }
    }
    /**
     * メモリ使用量過多への対応
     */
    async handleHighMemoryUsage() {
        if (this.isRecovering)
            return;
        this.isRecovering = true;
        try {
            // キャッシュのクリア
            await this.clearCache();
            // 不要なリソースの解放
            global.gc && global.gc();
            // メモリリークの可能性がある場合はサービスを再起動
            const memUsage = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
            if (memUsage > 0.95) { // 95%以上
                await this.restartService();
            }
        }
        finally {
            this.isRecovering = false;
        }
    }
    /**
     * データベースエラーへの対応
     */
    async handleDatabaseError() {
        if (this.isRecovering)
            return;
        this.isRecovering = true;
        try {
            // データベース接続のリセット
            await this.resetDatabaseConnections();
            // データベースの整合性チェック
            await this.sqlite.run('PRAGMA integrity_check');
            // バックアップからの復旧が必要な場合
            if (!await this.isDatabaseHealthy()) {
                await this.restoreFromBackup();
            }
        }
        finally {
            this.isRecovering = false;
        }
    }
    /**
     * キャッシュのクリア
     */
    async clearCache() {
        // キャッシュの実装に応じて適切なクリア処理を実行
        // ここではサンプル実装
        global.gc && global.gc();
    }
    /**
     * クエリプランの最適化
     */
    async optimizeQueryPlans() {
        try {
            await this.sqlite.run('ANALYZE');
            await this.sqlite.run('VACUUM');
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditAutoRecoveryService',
                message: 'Failed to optimize query plans'
            });
        }
    }
    /**
     * データベース接続のリセット
     */
    async resetDatabaseConnections() {
        try {
            await this.sqlite.close();
            await this.sqlite.open();
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditAutoRecoveryService',
                message: 'Failed to reset database connections'
            });
        }
    }
    /**
     * エラーログの分析と対応
     */
    async analyzeAndRespondToErrors() {
        try {
            // エラーパターンの分析
            const errorLogs = await this.getRecentErrorLogs();
            const errorPatterns = this.analyzeErrorPatterns(errorLogs);
            // パターンに応じた対応
            for (const pattern of errorPatterns) {
                await this.executeErrorRecoveryStrategy(pattern);
            }
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditAutoRecoveryService',
                message: 'Failed to analyze and respond to errors'
            });
        }
    }
    /**
     * 最近のエラーログの取得
     */
    async getRecentErrorLogs() {
        // ここではサンプル実装
        return [];
    }
    /**
     * エラーパターンの分析
     */
    analyzeErrorPatterns(logs) {
        // ここではサンプル実装
        return [];
    }
    /**
     * エラー回復戦略の実行
     */
    async executeErrorRecoveryStrategy(pattern) {
        // ここではサンプル実装
        // パターンに応じた回復戦略を実行
    }
    /**
     * サービスの健全性チェック
     */
    async performHealthCheck() {
        try {
            // 基本的な動作確認
            await this.sqlite.run('SELECT 1');
            await this.metricsService.recordMetric('health_check', 1);
            return { healthy: true };
        }
        catch (error) {
            return { healthy: false };
        }
    }
    /**
     * データベースの健全性チェック
     */
    async isDatabaseHealthy() {
        try {
            const result = await this.sqlite.get('PRAGMA integrity_check');
            return result.integrity_check === 'ok';
        }
        catch (error) {
            return false;
        }
    }
    /**
     * バックアップからの復元
     */
    async restoreFromBackup() {
        try {
            // 最新のバックアップを特定
            const backup = await this.findLatestBackup();
            if (!backup) {
                throw new Error('No backup found');
            }
            // バックアップからの復元
            await this.sqlite.run(`RESTORE FROM '${backup}'`);
            logger.logInfo({
                message: 'Database restored from backup',
                backup
            });
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditAutoRecoveryService',
                message: 'Failed to restore from backup'
            });
        }
    }
    /**
     * 最新のバックアップファイルの検索
     */
    async findLatestBackup() {
        // ここではサンプル実装
        return null;
    }
    /**
     * サービスの再起動
     */
    async restartService() {
        if (this.isRecovering)
            return;
        this.isRecovering = true;
        try {
            // グレースフルシャットダウン
            await this.sqlite.close();
            // プロセスの再起動
            process.on('exit', () => {
                require('child_process').spawn(process.argv.shift(), process.argv, {
                    cwd: process.cwd(),
                    detached: true,
                    stdio: 'inherit'
                });
            });
            process.exit();
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditAutoRecoveryService',
                message: 'Failed to restart service'
            });
        }
        finally {
            this.isRecovering = false;
        }
    }
}
exports.AuditAutoRecoveryService = AuditAutoRecoveryService;
//# sourceMappingURL=auditAutoRecoveryService.js.map