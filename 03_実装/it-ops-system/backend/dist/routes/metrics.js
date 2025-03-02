"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sqliteService_1 = require("../services/sqliteService");
const redisService_1 = require("../services/redisService");
const systemMetrics_1 = require("../utils/systemMetrics");
const loggingService_1 = __importDefault(require("../services/loggingService"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const sqliteService = sqliteService_1.SQLiteService.getInstance();
const redisService = redisService_1.RedisService.getInstance();
const logger = loggingService_1.default.getInstance();
// /api/metrics/system エンドポイント
router.get('/system', auth_1.verifyToken, async (req, res) => {
    try {
        const metricsResults = await Promise.allSettled([
            (0, systemMetrics_1.cpuUsage)(),
            (0, systemMetrics_1.memoryUsage)(),
            (0, systemMetrics_1.networkStats)(),
            redisService.healthCheck()
        ]);
        const cpu = metricsResults[0].status === 'fulfilled' ? metricsResults[0].value : null;
        const memory = metricsResults[1].status === 'fulfilled' ? metricsResults[1].value : null;
        const network = metricsResults[2].status === 'fulfilled' ? metricsResults[2].value : null;
        const redisHealth = metricsResults[3].status === 'fulfilled' ? metricsResults[3].value : false;
        if (!cpu || !memory || !network) {
            logger.logError(new Error('Partial metrics fetch failure'), {
                context: 'SystemMetrics',
                message: 'One or more system metrics could not be fetched',
                details: {
                    cpu: !!cpu,
                    memory: !!memory,
                    network: !!network
                }
            });
        }
        // SQLite metrics fetching with error handling
        let dbStatus = false;
        let memoryUsed = 0;
        let operationsCount = 0;
        try {
            dbStatus = await sqliteService.healthCheck();
            memoryUsed = await sqliteService.getMemoryUsage();
            operationsCount = await sqliteService.getOperationsCount();
        }
        catch (dbError) {
            logger.logError(dbError, {
                context: 'SystemMetrics',
                message: 'Error fetching SQLite metrics'
            });
        }
        let redisMetrics = {
            connectionStatus: 0,
            memoryUsageBytes: 0,
            cacheHitRatio: 0,
            retryAttempts: 0
        };
        try {
            if (redisHealth) {
                redisMetrics = await redisService.getMetrics();
            }
        }
        catch (redisError) {
            logger.logError(redisError, {
                context: 'SystemMetrics',
                message: 'Error fetching Redis metrics'
            });
        }
        const systemMetrics = {
            status: 'success',
            data: {
                cpu: cpu || { error: 'Failed to fetch CPU usage' },
                memory: memory || { error: 'Failed to fetch memory usage' },
                network: network || { error: 'Failed to fetch network stats' },
                database: {
                    type: 'sqlite',
                    connectionStatus: dbStatus ? 1 : 0,
                    memoryUsageBytes: memoryUsed,
                    operationsTotal: operationsCount
                },
                redis: redisMetrics,
                timestamp: new Date()
            }
        };
        logger.logAccess({
            userId: req.user?.id || 'system',
            action: 'get_metrics',
            resource: 'system',
            result: 'success',
            ip: req.ip || '',
            userAgent: req.get('user-agent') || '',
            details: { metricsCollected: Object.keys(systemMetrics.data) }
        });
        res.json(systemMetrics);
    }
    catch (error) {
        logger.logError(error, {
            context: 'SystemMetrics',
            message: 'Failed to fetch system metrics'
        });
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch system metrics'
        });
    }
});
exports.default = router;
//# sourceMappingURL=metrics.js.map