"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditMetricsService = void 0;
const sqliteService_1 = require("./sqliteService");
const loggingService_1 = __importDefault(require("./loggingService"));
const logger = loggingService_1.default.getInstance();
class AuditMetricsService {
    constructor() {
        this.sqlite = sqliteService_1.SQLiteService.getInstance();
        this.initializeMetricsTable();
    }
    static getInstance() {
        if (!AuditMetricsService.instance) {
            AuditMetricsService.instance = new AuditMetricsService();
        }
        return AuditMetricsService.instance;
    }
    async initializeMetricsTable() {
        try {
            await this.sqlite.run(`
        CREATE TABLE IF NOT EXISTS audit_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          metric_name TEXT NOT NULL,
          metric_value REAL NOT NULL,
          metric_labels TEXT
        )
      `);
            await this.sqlite.run(`
        CREATE INDEX IF NOT EXISTS idx_audit_metrics_name_timestamp
        ON audit_metrics (metric_name, timestamp)
      `);
            logger.logInfo({
                message: 'AuditMetricsService initialized'
            });
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditMetricsService',
                message: 'Failed to initialize metrics table'
            });
        }
    }
    async recordMetric(name, value, labels = {}) {
        try {
            await this.sqlite.run(`INSERT INTO audit_metrics (timestamp, metric_name, metric_value, metric_labels)
         VALUES (?, ?, ?, ?)`, [
                new Date().toISOString(),
                name,
                value,
                JSON.stringify(labels)
            ]);
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditMetricsService',
                message: 'Failed to record metric',
                details: { name, value, labels }
            });
        }
    }
    async getMetrics(name, startTime, endTime) {
        try {
            const params = [name];
            let query = `
        SELECT timestamp, metric_value, metric_labels
        FROM audit_metrics
        WHERE metric_name = ?
      `;
            if (startTime) {
                query += ' AND timestamp >= ?';
                params.push(startTime.toISOString());
            }
            if (endTime) {
                query += ' AND timestamp <= ?';
                params.push(endTime.toISOString());
            }
            query += ' ORDER BY timestamp DESC';
            const rows = await this.sqlite.all(query, params);
            return rows.map(row => ({
                timestamp: new Date(row.timestamp),
                value: row.metric_value,
                labels: row.metric_labels ? JSON.parse(row.metric_labels) : undefined
            }));
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditMetricsService',
                message: 'Failed to get metrics',
                details: { name, startTime, endTime }
            });
            return [];
        }
    }
    async getAggregatedMetrics(name, aggregation, interval, startTime, endTime) {
        try {
            const params = [name];
            let timeGroup;
            switch (interval) {
                case 'hour':
                    timeGroup = "strftime('%Y-%m-%d %H:00:00', timestamp)";
                    break;
                case 'day':
                    timeGroup = "strftime('%Y-%m-%d', timestamp)";
                    break;
                case 'week':
                    timeGroup = "strftime('%Y-%W', timestamp)";
                    break;
                case 'month':
                    timeGroup = "strftime('%Y-%m', timestamp)";
                    break;
            }
            let aggFunc;
            switch (aggregation) {
                case 'sum':
                    aggFunc = 'SUM';
                    break;
                case 'avg':
                    aggFunc = 'AVG';
                    break;
                case 'min':
                    aggFunc = 'MIN';
                    break;
                case 'max':
                    aggFunc = 'MAX';
                    break;
                case 'count':
                    aggFunc = 'COUNT';
                    break;
            }
            let query = `
        SELECT 
          ${timeGroup} as time_bucket,
          ${aggFunc}(metric_value) as agg_value
        FROM audit_metrics
        WHERE metric_name = ?
      `;
            if (startTime) {
                query += ' AND timestamp >= ?';
                params.push(startTime.toISOString());
            }
            if (endTime) {
                query += ' AND timestamp <= ?';
                params.push(endTime.toISOString());
            }
            query += ` GROUP BY time_bucket ORDER BY time_bucket DESC`;
            const rows = await this.sqlite.all(query, params);
            return rows.map(row => ({
                timestamp: new Date(row.time_bucket),
                value: row.agg_value
            }));
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditMetricsService',
                message: 'Failed to get aggregated metrics',
                details: {
                    name,
                    aggregation,
                    interval,
                    startTime,
                    endTime
                }
            });
            return [];
        }
    }
}
exports.AuditMetricsService = AuditMetricsService;
//# sourceMappingURL=auditMetricsService.js.map