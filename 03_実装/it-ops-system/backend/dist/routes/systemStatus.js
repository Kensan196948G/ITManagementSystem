"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../routes/auth");
const systemStatusService_1 = require("../services/systemStatusService");
const loggingService_1 = __importDefault(require("../services/loggingService"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const router = express_1.default.Router();
const logger = loggingService_1.default.getInstance();
const systemStatusService = new systemStatusService_1.SystemStatusService();
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * システムステータス情報を取得
 * 一般ユーザーも閲覧可能
 */
router.get('/status', auth_1.verifyToken, async (_req, res) => {
    try {
        const status = await systemStatusService.getSystemStatus();
        res.json({
            status: 'success',
            data: status
        });
    }
    catch (error) {
        logger.logError(error, {
            context: 'SystemStatusAPI',
            message: 'システムステータス取得エラー'
        });
        res.status(500).json({
            status: 'error',
            message: 'システムステータス取得中にエラーが発生しました',
            code: 'SYSTEM_STATUS_ERROR'
        });
    }
});
/**
 * リソース使用状況を取得
 * 一般ユーザーも閲覧可能
 */
router.get('/resources', auth_1.verifyToken, async (_req, res) => {
    try {
        // システムリソース情報を取得
        const cpuUsage = process.cpuUsage();
        const memoryUsage = process.memoryUsage();
        const totalMemory = os_1.default.totalmem();
        const freeMemory = os_1.default.freemem();
        const uptime = os_1.default.uptime();
        // ディスク使用状況を取得（Windowsの場合）
        let diskUsage = {};
        try {
            const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
            const lines = stdout.trim().split('\n').slice(1);
            diskUsage = lines.reduce((acc, line) => {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 3) {
                    const drive = parts[0];
                    const freeSpace = parseInt(parts[1], 10);
                    const totalSize = parseInt(parts[2], 10);
                    acc[drive] = {
                        total: totalSize,
                        free: freeSpace,
                        used: totalSize - freeSpace,
                        usagePercentage: ((totalSize - freeSpace) / totalSize * 100).toFixed(2)
                    };
                }
                return acc;
            }, {});
        }
        catch (diskError) {
            logger.logError(diskError, {
                context: 'SystemStatusAPI',
                message: 'ディスク使用状況取得エラー'
            });
        }
        // ネットワーク接続情報
        const networkInterfaces = os_1.default.networkInterfaces();
        res.json({
            status: 'success',
            data: {
                cpu: {
                    usage: cpuUsage,
                    cores: os_1.default.cpus().length,
                    model: os_1.default.cpus()[0].model,
                    loadAverage: os_1.default.loadavg()
                },
                memory: {
                    total: totalMemory,
                    free: freeMemory,
                    used: totalMemory - freeMemory,
                    usagePercentage: ((totalMemory - freeMemory) / totalMemory * 100).toFixed(2),
                    process: {
                        rss: memoryUsage.rss,
                        heapTotal: memoryUsage.heapTotal,
                        heapUsed: memoryUsage.heapUsed,
                        external: memoryUsage.external
                    }
                },
                disk: diskUsage,
                network: networkInterfaces,
                system: {
                    platform: os_1.default.platform(),
                    release: os_1.default.release(),
                    hostname: os_1.default.hostname(),
                    uptime: uptime
                },
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger.logError(error, {
            context: 'SystemStatusAPI',
            message: 'リソース使用状況取得エラー'
        });
        res.status(500).json({
            status: 'error',
            message: 'リソース使用状況取得中にエラーが発生しました',
            code: 'RESOURCE_STATUS_ERROR'
        });
    }
});
/**
 * セキュリティアラート情報を取得
 * 一般ユーザーも閲覧可能
 */
router.get('/security-alerts', auth_1.verifyToken, async (_req, res) => {
    try {
        const alerts = await systemStatusService.getSecurityAlerts();
        res.json({
            status: 'success',
            data: alerts
        });
    }
    catch (error) {
        logger.logError(error, {
            context: 'SystemStatusAPI',
            message: 'セキュリティアラート取得エラー'
        });
        res.status(500).json({
            status: 'error',
            message: 'セキュリティアラート取得中にエラーが発生しました',
            code: 'SECURITY_ALERT_ERROR'
        });
    }
});
exports.default = router;
//# sourceMappingURL=systemStatus.js.map