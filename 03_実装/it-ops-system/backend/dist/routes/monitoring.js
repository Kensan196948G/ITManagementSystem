"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const securityAuditService_1 = require("../services/securityAuditService");
const prometheus_1 = require("../metrics/prometheus");
const auth_1 = require("../middleware/auth");
const loggingService_1 = __importDefault(require("../services/loggingService"));
const monitoringService_1 = require("../services/monitoringService");
const notificationService_1 = require("../services/notificationService");
const auditLogService_1 = require("../services/auditLogService");
const errors_1 = require("../types/errors");
const router = express_1.default.Router();
const logger = loggingService_1.default.getInstance();
const securityAudit = securityAuditService_1.SecurityAuditService.getInstance();
const monitoringService = monitoringService_1.MonitoringService.getInstance();
const notificationService = notificationService_1.NotificationService.getInstance(auditLogService_1.AuditLogService.getInstanceSync());
// メトリクスエンドポイント
router.get('/metrics', async (req, res) => {
    try {
        const metrics = await prometheus_1.Prometheus.register.metrics();
        res.set('Content-Type', prometheus_1.Prometheus.register.contentType);
        res.end(metrics);
    }
    catch (error) {
        logger.logError(error, {
            context: 'Metrics',
            message: 'メトリクス取得エラー'
        });
        res.status(500).send('メトリクスの取得に失敗しました');
    }
});
// 監査ログの取得
router.get('/audit/permissions', auth_1.verifyToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const timeWindow = {
            start: new Date(startDate),
            end: new Date(endDate)
        };
        const auditLogs = await securityAudit.getAccessPatternAnalysis(timeWindow);
        res.json(auditLogs);
    }
    catch (error) {
        logger.logError(error, {
            context: 'AuditLog',
            message: '監査ログ取得エラー'
        });
        res.status(500).json({ error: '監査ログの取得に失敗しました' });
    }
});
// パフォーマンスメトリクスの取得
router.get('/performance', auth_1.verifyToken, async (req, res) => {
    try {
        const metrics = {
            permissionCheckLatency: await prometheus_1.Prometheus.metrics.permissionCheck.get(),
            cacheHitRatio: await prometheus_1.Prometheus.metrics.caching.get(),
            errorRates: await prometheus_1.Prometheus.metrics.errorRate.get(),
            activeSessions: await prometheus_1.Prometheus.metrics.activeSessions.get()
        };
        res.json(metrics);
    }
    catch (error) {
        logger.logError(error, {
            context: 'Performance',
            message: 'パフォーマンスメトリクス取得エラー'
        });
        res.status(500).json({ error: 'パフォーマンスメトリクスの取得に失敗しました' });
    }
});
// 不審なアクティビティの検出
router.get('/security/suspicious-activities', auth_1.verifyToken, async (req, res) => {
    try {
        const timeWindow = {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 過去24時間
            end: new Date()
        };
        const analysis = await securityAudit.getAccessPatternAnalysis(timeWindow);
        const suspiciousActivities = analysis.suspiciousActivities;
        res.json({
            suspiciousActivities,
            summary: {
                totalAttempts: analysis.totalAttempts,
                successRate: analysis.successRate,
                suspiciousCount: suspiciousActivities.length
            }
        });
    }
    catch (error) {
        logger.logError(error, {
            context: 'Security',
            message: '不審なアクティビティ検出エラー'
        });
        res.status(500).json({ error: '不審なアクティビティの検出に失敗しました' });
    }
});
// システムヘルスチェック
router.get('/health', async (req, res) => {
    try {
        const metrics = await prometheus_1.Prometheus.register.getMetricsAsJSON();
        const errorRate = metrics.find(m => m.name === 'permission_error_rate')?.values[0]?.value || 0;
        const activeSessions = metrics.find(m => m.name === 'active_sessions_total')?.values[0]?.value || 0;
        const health = {
            status: errorRate < 0.05 ? 'healthy' : 'degraded', // エラー率5%未満を健全とする
            metrics: {
                errorRate,
                activeSessions,
                timestamp: new Date()
            }
        };
        res.json(health);
    }
    catch (error) {
        logger.logError(error, {
            context: 'Health',
            message: 'ヘルスチェックエラー'
        });
        res.status(500).json({ error: 'ヘルスチェックに失敗しました' });
    }
});
// システムメトリクスの取得
router.get('/system-metrics', auth_1.verifyToken, async (req, res, next) => {
    try {
        const metrics = await monitoringService.collectSystemMetrics();
        logger.logAccess({
            userId: req.user?.id || 'anonymous',
            action: 'get_metrics',
            resource: 'monitoring',
            ip: req.ip,
            userAgent: req.get('user-agent') || 'unknown',
            result: 'success'
        });
        res.json({
            status: 'success',
            data: metrics
        });
    }
    catch (error) {
        next((0, errors_1.createError)(errors_1.ErrorCode.METRICS_COLLECTION_ERROR, 'Failed to collect system metrics', 500, { error }));
    }
});
// システムログの取得
router.get('/logs', auth_1.verifyToken, async (req, res, next) => {
    try {
        const { startDate, endDate, type, level, limit = 100, skip = 0 } = req.query;
        const logs = await logger.queryLogs({
            startDate: startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000),
            endDate: endDate ? new Date(endDate) : new Date(),
            type: type,
            level: level,
            limit: parseInt(limit),
            skip: parseInt(skip)
        });
        logger.logAccess({
            userId: req.user?.id || 'anonymous',
            action: 'get_logs',
            resource: 'monitoring',
            ip: req.ip,
            userAgent: req.get('user-agent') || 'unknown',
            result: 'success'
        });
        res.json({
            status: 'success',
            data: logs
        });
    }
    catch (error) {
        next((0, errors_1.createError)(errors_1.ErrorCode.LOG_PROCESSING_ERROR, 'Failed to retrieve system logs', 500, { error }));
    }
});
// アラートの通知設定
router.post('/alerts/settings', auth_1.verifyToken, async (req, res, next) => {
    try {
        const { email, slack, teams, thresholds } = req.body;
        // 通知設定の検証
        if (!email && !slack && !teams) {
            throw (0, errors_1.createError)(errors_1.ErrorCode.VALIDATION_FAILED, 'At least one notification channel must be enabled', 400);
        }
        // 設定の保存とサービスの更新処理をここに実装
        logger.logAccess({
            userId: req.user?.id || 'anonymous',
            action: 'update_alert_settings',
            resource: 'monitoring',
            ip: req.ip,
            userAgent: req.get('user-agent') || 'unknown',
            result: 'success'
        });
        res.json({
            status: 'success',
            message: 'Alert settings updated successfully'
        });
    }
    catch (error) {
        next((0, errors_1.createError)(errors_1.ErrorCode.ALERT_PROCESSING_ERROR, 'Failed to update alert settings', 500, { error }));
    }
});
// アラートの手動送信（テスト用）
router.post('/alerts/test', auth_1.verifyToken, async (req, res, next) => {
    try {
        const { type, message, source } = req.body;
        const testAlert = {
            id: `test-${Date.now()}`,
            type: type || 'info',
            message: message || 'Test alert message',
            source: source || 'Manual Test',
            timestamp: new Date(),
            acknowledged: false
        };
        await notificationService.sendSecurityAlertNotification({
            id: testAlert.id,
            severity: 'medium',
            type: testAlert.type,
            message: testAlert.message,
            source: testAlert.source,
            details: { timestamp: testAlert.timestamp }
        });
        logger.logAccess({
            userId: req.user?.id || 'anonymous',
            action: 'send_test_alert',
            resource: 'monitoring',
            ip: req.ip,
            userAgent: req.get('user-agent') || 'unknown',
            result: 'success'
        });
        res.json({
            status: 'success',
            message: 'Test alert sent successfully'
        });
    }
    catch (error) {
        next((0, errors_1.createError)(errors_1.ErrorCode.ALERT_PROCESSING_ERROR, 'Failed to send test alert', 500, { error }));
    }
});
// モニタリングサービスの制御
router.post('/control', auth_1.verifyToken, async (req, res, next) => {
    try {
        const { action } = req.body;
        switch (action) {
            case 'start':
                monitoringService.startMetricsCollection();
                break;
            case 'stop':
                monitoringService.stopMetricsCollection();
                break;
            default:
                throw (0, errors_1.createError)(errors_1.ErrorCode.INVALID_PARAMETER, 'Invalid action specified', 400);
        }
        logger.logAccess({
            userId: req.user?.id || 'anonymous',
            action: `${action}_monitoring`,
            resource: 'monitoring',
            ip: req.ip,
            userAgent: req.get('user-agent') || 'unknown',
            result: 'success'
        });
        res.json({
            status: 'success',
            message: `Monitoring service ${action}ed successfully`
        });
    }
    catch (error) {
        next((0, errors_1.createError)(errors_1.ErrorCode.MONITORING_SERVICE_ERROR, 'Failed to control monitoring service', 500, { error }));
    }
});
exports.default = router;
//# sourceMappingURL=monitoring.js.map