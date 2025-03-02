"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityMonitorService = void 0;
const notificationService_1 = require("./notificationService");
const sqliteService_1 = require("./sqliteService");
const loggingService_1 = __importDefault(require("./loggingService"));
const uuid_1 = require("uuid");
const logger = loggingService_1.default.getInstance();
class SecurityMonitorService {
    constructor() {
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.sqlite = sqliteService_1.SQLiteService.getInstance();
        this.notification = notificationService_1.NotificationService.getInstance();
    }
    static getInstance() {
        if (!SecurityMonitorService.instance) {
            SecurityMonitorService.instance = new SecurityMonitorService();
        }
        return SecurityMonitorService.instance;
    }
    async startMonitoring(intervalMs = 60000) {
        if (this.isMonitoring)
            return;
        this.isMonitoring = true;
        try {
            await this.monitor();
            this.monitoringInterval = setInterval(async () => {
                try {
                    await this.monitor();
                }
                catch (error) {
                    logger.logError(error, {
                        context: 'SecurityMonitor',
                        message: '定期監視処理に失敗',
                    });
                }
            }, intervalMs);
        }
        catch (error) {
            logger.logError(error, {
                context: 'SecurityMonitor',
                message: '監視開始時に失敗',
            });
            this.isMonitoring = false;
        }
    }
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
    }
    async monitor() {
        try {
            const alerts = await this.checkForAnomalies();
            await this.processAlerts(alerts);
        }
        catch (error) {
            logger.logError(error, {
                context: 'SecurityMonitor',
                message: '異常検知に失敗',
            });
        }
    }
    async checkForAnomalies() {
        const alerts = [];
        const rows = await this.sqlite.all('SELECT severity, COUNT(*) as count FROM security_events GROUP BY severity') || []; // Ensure rows is an array even if SQLite returns null/undefined
        for (const row of rows) {
            const { count, severity } = row;
            const severityType = severity;
            if (this.isAnomalousCount(severityType, count)) {
                alerts.push({
                    id: (0, uuid_1.v4)(),
                    type: 'security_anomaly',
                    source: 'security_monitor',
                    message: `異常な${severityType}レベルのセキュリティイベント数: ${count}`,
                    severity: severityType,
                    timestamp: new Date(),
                    acknowledged: false,
                    metadata: {
                        count,
                        threshold: this.getThresholdForSeverity(severityType)
                    },
                });
            }
        }
        return alerts;
    }
    isAnomalousCount(severity, count) {
        const threshold = this.getThresholdForSeverity(severity);
        return count > threshold;
    }
    getThresholdForSeverity(severity) {
        const thresholds = {
            critical: 1,
            high: 5,
            medium: 10,
            low: 20,
        };
        return thresholds[severity] ?? 50;
    }
    async processAlerts(alerts) {
        for (const alert of alerts) {
            try {
                await this.sqlite.run(`INSERT INTO alerts (
            id, type, source, message, severity, timestamp, 
            acknowledged, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                    alert.id,
                    alert.type,
                    alert.source,
                    alert.message,
                    alert.severity,
                    alert.timestamp.toISOString(),
                    alert.acknowledged ? 1 : 0,
                    JSON.stringify(alert.metadata || {}),
                ]);
                if (alert.severity === 'critical' || alert.severity === 'high') {
                    await this.notification.sendAlertEmail(alert);
                }
            }
            catch (error) {
                logger.logError(error, {
                    context: 'SecurityMonitor',
                    message: 'アラート処理に失敗',
                    alertId: alert.id,
                    severity: alert.severity,
                });
            }
        }
    }
    async getActiveAlerts() {
        try {
            const alerts = await this.sqlite.all('SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY timestamp DESC');
            return alerts.map(alert => ({
                ...alert,
                timestamp: new Date(alert.timestamp),
            }));
        }
        catch (error) {
            logger.logError(error, {
                context: 'SecurityMonitor',
                message: 'アクティブなアラートの取得に失敗',
            });
            return [];
        }
    }
    async updateAlertThresholds(thresholds) {
        const metrics = ['cpu', 'memory', 'disk'];
        try {
            for (const metric of metrics) {
                await this.sqlite.run('UPDATE alert_thresholds SET value = ? WHERE metric = ?', [thresholds[metric], metric]);
            }
        }
        catch (error) {
            logger.logError(error, {
                context: 'SecurityMonitor',
                message: 'アラート閾値の更新に失敗',
                metrics: metrics.join(', '),
            });
            throw error;
        }
    }
    async getRecentAttempts() {
        try {
            const attempts = await this.sqlite.all('SELECT * FROM metric_alerts ORDER BY timestamp DESC LIMIT 100');
            return attempts.map(attempt => ({
                type: attempt.type,
                source: attempt.source,
                message: attempt.message,
                timestamp: new Date(attempt.timestamp),
                value: attempt.value,
                threshold: attempt.threshold,
            }));
        }
        catch (error) {
            logger.logError(error, {
                context: 'SecurityMonitor',
                message: '最近のメトリクスアラート取得に失敗',
            });
            return [];
        }
    }
}
exports.SecurityMonitorService = SecurityMonitorService;
//# sourceMappingURL=securityMonitorService.js.map