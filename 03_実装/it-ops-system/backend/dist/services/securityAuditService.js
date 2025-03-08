"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityAuditService = void 0;
const sqliteService_1 = require("../services/sqliteService");
const loggingService_1 = __importDefault(require("./loggingService"));
const client = __importStar(require("prom-client"));
const logger = loggingService_1.default.getInstance();
class SecurityAuditService {
    constructor() {
        this.sqlite = sqliteService_1.SQLiteService.getInstance();
        this.metrics = client;
        this.initializeDatabase().catch(error => {
            logger.logError(error, {
                context: 'SecurityAudit',
                message: 'Failed to initialize database'
            });
        });
        this.initializeMetrics();
    }
    async initializeDatabase() {
        try {
            await this.sqlite.exec(`
        BEGIN TRANSACTION;
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          resource TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          success INTEGER NOT NULL,
          details TEXT,
          CONSTRAINT idx_audit_user_time UNIQUE(user_id, timestamp)
        );
        CREATE TABLE IF NOT EXISTS access_attempts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          resource TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          success INTEGER NOT NULL,
          ip_address TEXT NOT NULL,
          CONSTRAINT idx_access_user_time UNIQUE(user_id, timestamp)
        );
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_access_timestamp ON access_attempts(timestamp);
        COMMIT;
      `);
        }
        catch (error) {
            await this.sqlite.exec('ROLLBACK;');
            logger.logError(error, {
                context: 'SecurityAudit',
                message: 'Database initialization failed'
            });
            throw error;
        }
    }
    initializeMetrics() {
        const { Histogram, register } = this.metrics;
        if (register.getSingleMetric('permission_check_duration_seconds')) {
            register.removeSingleMetric('permission_check_duration_seconds');
        }
        this.permissionCheckDuration = new Histogram({
            name: 'permission_check_duration_seconds',
            help: 'Duration of permission checks',
            labelNames: ['resource', 'action'],
            buckets: [0.1, 0.5, 1, 2, 5]
        });
    }
    static getInstance() {
        if (!SecurityAuditService.instance) {
            SecurityAuditService.instance = new SecurityAuditService();
        }
        return SecurityAuditService.instance;
    }
    async logAuditEvent(entry) {
        try {
            await this.sqlite.run(`INSERT INTO audit_logs (user_id, action, resource, timestamp, success, details)
         VALUES (?, ?, ?, ?, ?, ?)`, [
                entry.userId,
                entry.action,
                entry.resource,
                entry.timestamp,
                entry.success ? 1 : 0,
                entry.details ? JSON.stringify(entry.details) : null
            ]);
        }
        catch (error) {
            logger.logError(error, {
                context: 'SecurityAudit',
                message: 'Failed to log audit event',
                userId: entry.userId,
                action: entry.action,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async logAccessAttempt(attempt) {
        try {
            await this.sqlite.run(`INSERT INTO access_attempts (user_id, resource, timestamp, success, ip_address)
         VALUES (?, ?, ?, ?, ?)`, [
                attempt.userId,
                attempt.resource,
                attempt.timestamp,
                attempt.success ? 1 : 0,
                attempt.ipAddress
            ]);
        }
        catch (error) {
            logger.logError(error, {
                context: 'SecurityAudit',
                message: 'Failed to log access attempt',
                userId: attempt.userId,
                resource: attempt.resource,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async getRecentAuditLogs(userId, minutes = 60) {
        try {
            const cutoffTime = Date.now() - minutes * 60 * 1000;
            const rows = await this.sqlite.all(`SELECT * FROM audit_logs
         WHERE user_id = ? AND timestamp >= ?
         ORDER BY timestamp DESC
         LIMIT 1000`, [userId, cutoffTime]);
            return rows.map(row => ({
                userId: row.user_id,
                action: row.action,
                resource: row.resource,
                timestamp: row.timestamp,
                success: row.success === 1,
                details: row.details ? JSON.parse(row.details) : undefined
            }));
        }
        catch (error) {
            logger.logError(error, {
                context: 'SecurityAudit',
                message: 'Failed to retrieve audit logs',
                userId,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            return [];
        }
    }
    /**
     * 監査イベントを取得
     * @param filter フィルター条件
     */
    async getAuditEvents(filter) {
        try {
            const conditions = [];
            const params = [];
            if (filter.userId) {
                conditions.push('user_id = ?');
                params.push(filter.userId);
            }
            if (filter.action) {
                conditions.push('action = ?');
                params.push(filter.action);
            }
            if (filter.resource) {
                conditions.push('resource = ?');
                params.push(filter.resource);
            }
            if (filter.success !== undefined) {
                conditions.push('success = ?');
                params.push(filter.success ? 1 : 0);
            }
            if (filter.startTime && filter.endTime) {
                conditions.push('timestamp BETWEEN ? AND ?');
                params.push(filter.startTime.getTime(), filter.endTime.getTime());
            }
            else if (filter.startTime) {
                conditions.push('timestamp >= ?');
                params.push(filter.startTime.getTime());
            }
            else if (filter.endTime) {
                conditions.push('timestamp <= ?');
                params.push(filter.endTime.getTime());
            }
            const whereClause = conditions.length > 0
                ? `WHERE ${conditions.join(' AND ')}`
                : '';
            const rows = await this.sqlite.all(`SELECT * FROM audit_logs
         ${whereClause}
         ORDER BY timestamp DESC
         LIMIT 1000`, params);
            return rows.map(row => ({
                userId: row.user_id,
                action: row.action,
                resource: row.resource,
                timestamp: row.timestamp,
                success: row.success === 1,
                details: row.details ? JSON.parse(row.details) : undefined
            }));
        }
        catch (error) {
            logger.logError(error, {
                context: 'SecurityAudit',
                message: 'Failed to retrieve audit events',
                filter,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            return [];
        }
    }
    async getRecentAccessAttempts(userId, minutes = 60) {
        try {
            const cutoffTime = Date.now() - minutes * 60 * 1000;
            const rows = await this.sqlite.all(`SELECT * FROM access_attempts
         WHERE user_id = ? AND timestamp >= ?
         ORDER BY timestamp DESC
         LIMIT 1000`, [userId, cutoffTime]);
            return rows.map(row => ({
                userId: row.user_id,
                resource: row.resource,
                timestamp: row.timestamp,
                success: row.success === 1,
                ipAddress: row.ip_address
            }));
        }
        catch (error) {
            logger.logError(error, {
                context: 'SecurityAudit',
                message: 'Failed to retrieve access attempts',
                userId,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            return [];
        }
    }
    /**
     * アクセス試行履歴を取得
     * @param filter フィルター条件
     */
    async getAccessAttempts(filter) {
        try {
            const conditions = [];
            const params = [];
            if (filter.userId) {
                conditions.push('user_id = ?');
                params.push(filter.userId);
            }
            if (filter.ipAddress) {
                conditions.push('ip_address = ?');
                params.push(filter.ipAddress);
            }
            if (filter.resource) {
                conditions.push('resource = ?');
                params.push(filter.resource);
            }
            if (filter.success !== undefined) {
                conditions.push('success = ?');
                params.push(filter.success ? 1 : 0);
            }
            if (filter.startTime && filter.endTime) {
                conditions.push('timestamp BETWEEN ? AND ?');
                params.push(filter.startTime.getTime(), filter.endTime.getTime());
            }
            else if (filter.startTime) {
                conditions.push('timestamp >= ?');
                params.push(filter.startTime.getTime());
            }
            else if (filter.endTime) {
                conditions.push('timestamp <= ?');
                params.push(filter.endTime.getTime());
            }
            const whereClause = conditions.length > 0
                ? `WHERE ${conditions.join(' AND ')}`
                : '';
            const rows = await this.sqlite.all(`SELECT * FROM access_attempts
         ${whereClause}
         ORDER BY timestamp DESC
         LIMIT 1000`, params);
            return rows.map(row => ({
                userId: row.user_id,
                resource: row.resource,
                timestamp: row.timestamp,
                success: row.success === 1,
                ipAddress: row.ip_address
            }));
        }
        catch (error) {
            logger.logError(error, {
                context: 'SecurityAudit',
                message: 'Failed to retrieve access attempts',
                filter,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            return [];
        }
    }
    startPermissionCheck(resource, action) {
        const end = this.permissionCheckDuration.startTimer({ resource, action });
        return end;
    }
    /**
     * セキュリティメトリクスを取得
     * @param filter フィルター条件
     */
    async getSecurityMetrics(filter) {
        try {
            const conditions = [];
            const params = [];
            if (filter?.startTime && filter?.endTime) {
                conditions.push('timestamp BETWEEN ? AND ?');
                params.push(filter.startTime.getTime(), filter.endTime.getTime());
            }
            else if (filter?.startTime) {
                conditions.push('timestamp >= ?');
                params.push(filter.startTime.getTime());
            }
            else if (filter?.endTime) {
                conditions.push('timestamp <= ?');
                params.push(filter.endTime.getTime());
            }
            const whereClause = conditions.length > 0
                ? `WHERE ${conditions.join(' AND ')}`
                : '';
            // 総イベント数を取得
            const totalResult = await this.sqlite.get(`SELECT COUNT(*) as count FROM audit_logs ${whereClause}`, params);
            const totalEvents = totalResult?.count || 0;
            // 失敗したアクセス試行数を取得
            const failedResult = await this.sqlite.get(`SELECT COUNT(*) as count FROM access_attempts ${whereClause} AND success = 0`, params);
            const failedAttempts = failedResult?.count || 0;
            // 最近の失敗を取得
            const recentFailures = await this.sqlite.all(`SELECT timestamp, resource FROM access_attempts
         ${whereClause} AND success = 0
         ORDER BY timestamp DESC LIMIT 10`, params);
            // 成功率を計算
            const successRate = totalEvents > 0 ? (totalEvents - failedAttempts) / totalEvents : 1;
            return {
                totalEvents,
                failedAttempts,
                successRate,
                recentFailures
            };
        }
        catch (error) {
            logger.logError(error, {
                context: 'SecurityAudit',
                message: 'Failed to retrieve security metrics',
                filter,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                totalEvents: 0,
                failedAttempts: 0,
                successRate: 0
            };
        }
    }
}
exports.SecurityAuditService = SecurityAuditService;
//# sourceMappingURL=securityAuditService.js.map