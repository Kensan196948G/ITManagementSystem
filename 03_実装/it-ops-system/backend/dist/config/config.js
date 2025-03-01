"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const parseNumber = (value, defaultValue) => {
    const parsed = parseInt(value || '', 10);
    return isNaN(parsed) ? defaultValue : parsed;
};
const parseFloatNumber = (value, defaultValue) => {
    const parsed = parseFloat(value || '');
    return isNaN(parsed) ? defaultValue : parsed;
};
exports.config = {
    api: {
        port: parseNumber(process.env.PORT, 3001),
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
    },
    auth: {
        requiredPermissions: {
            dashboard: ['IT-Ops-Dashboard-Users'],
            metrics: {
                read: ['IT-Ops-Metrics-Viewers'],
                write: ['IT-Ops-Metrics-Managers']
            },
            alerts: {
                read: ['IT-Ops-Alert-Readers'],
                write: ['IT-Ops-Alert-Managers']
            },
            security: {
                read: ['IT-Ops-Security-Viewers'],
                write: ['IT-Ops-Security-Managers']
            },
            users: {
                read: ['IT-Ops-User-Readers'],
                write: ['IT-Ops-User-Managers']
            }
        },
        securityGroupsPrefix: process.env.SECURITY_GROUPS_PREFIX || 'IT-Ops',
        defaultGroups: (process.env.REQUIRED_SECURITY_GROUPS || '')
            .split(',')
            .map(group => group.trim())
            .filter(Boolean)
    },
    monitoring: {
        checkInterval: parseNumber(process.env.MONITORING_CHECK_INTERVAL, 60000),
        alertThresholds: {
            cpu: parseFloatNumber(process.env.CPU_THRESHOLD, 80),
            memory: parseFloatNumber(process.env.MEMORY_THRESHOLD, 85),
            disk: parseFloatNumber(process.env.DISK_THRESHOLD, 90)
        }
    },
    security: {
        session: {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            maxConcurrentSessions: parseNumber(process.env.MAX_CONCURRENT_SESSIONS, 3)
        },
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: parseNumber(process.env.RATE_LIMIT_MAX, 100),
            message: process.env.RATE_LIMIT_MESSAGE || 'リクエスト制限を超過しました。しばらく待ってから再試行してください。'
        }
    }
};
//# sourceMappingURL=config.js.map