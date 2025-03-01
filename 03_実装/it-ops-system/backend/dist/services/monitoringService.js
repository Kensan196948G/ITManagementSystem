"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringService = void 0;
const notificationService_1 = require("./notificationService");
const os_1 = __importDefault(require("os"));
const util_1 = require("util");
const child_process_1 = require("child_process");
const loggingService_1 = __importDefault(require("./loggingService"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const logger = loggingService_1.default.getInstance();
class MonitoringService {
    constructor() {
        this.metricsInterval = null;
        this.collectionInterval = parseInt(process.env.METRICS_COLLECTION_INTERVAL || '30000');
    }
    static getInstance() {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService();
        }
        return MonitoringService.instance;
    }
    startMetricsCollection() {
        if (this.metricsInterval) {
            return;
        }
        this.metricsInterval = setInterval(async () => {
            try {
                const metrics = await this.collectSystemMetrics();
                this.processMetrics(metrics);
            }
            catch (error) {
                logger.logError(error, { context: 'MetricsCollection' });
            }
        }, this.collectionInterval);
    }
    stopMetricsCollection() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }
    }
    async collectSystemMetrics() {
        const cpuUsage = os_1.default.loadavg()[0];
        const totalMemory = os_1.default.totalmem();
        const freeMemory = os_1.default.freemem();
        const usedMemory = totalMemory - freeMemory;
        // ディスク使用状況の取得（Windowsの場合）
        const { stdout: diskInfo } = await execAsync('wmic logicaldisk get size,freespace,caption');
        const diskMetrics = this.parseDiskInfo(diskInfo);
        // ネットワーク統計の取得
        const networkStats = await this.getNetworkStats();
        const metrics = {
            cpu: {
                usage: cpuUsage * 100,
                temperature: await this.getCpuTemperature()
            },
            memory: {
                total: totalMemory,
                used: usedMemory,
                free: freeMemory
            },
            disk: {
                total: diskMetrics.total,
                used: diskMetrics.used,
                free: diskMetrics.free
            },
            network: {
                bytesIn: networkStats.bytesIn,
                bytesOut: networkStats.bytesOut,
                packetsIn: 0,
                packetsOut: 0
            }
        };
        return metrics;
    }
    async getCpuTemperature() {
        try {
            // Windowsの場合のCPU温度取得
            const { stdout } = await execAsync('wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature');
            const temp = parseInt(stdout.split('\n')[1]);
            return (temp - 273.15); // ケルビンから摂氏に変換
        }
        catch (error) {
            logger.logError(error, { context: 'CPUTemperature' });
            return 0;
        }
    }
    parseDiskInfo(diskInfo) {
        const lines = diskInfo.split('\n').filter(line => line.trim());
        let total = 0;
        let free = 0;
        // ヘッダー行をスキップ
        for (let i = 1; i < lines.length; i++) {
            const [, freeSpace, size] = lines[i].trim().split(/\s+/);
            if (size && freeSpace) {
                total += parseInt(size);
                free += parseInt(freeSpace);
            }
        }
        return {
            total,
            free,
            used: total - free
        };
    }
    async getNetworkStats() {
        try {
            // Windowsのネットワーク統計を取得
            const { stdout } = await execAsync('netstat -e');
            const lines = stdout.split('\n');
            if (lines.length >= 4) {
                const stats = lines[3].trim().split(/\s+/);
                return {
                    bytesIn: parseInt(stats[1]),
                    bytesOut: parseInt(stats[2]),
                    connections: (await this.getActiveConnections())
                };
            }
        }
        catch (error) {
            logger.logError(error, { context: 'NetworkStats' });
        }
        return {
            bytesIn: 0,
            bytesOut: 0,
            connections: 0
        };
    }
    async getActiveConnections() {
        try {
            const { stdout } = await execAsync('netstat -n | find /c "ESTABLISHED"');
            return parseInt(stdout.trim());
        }
        catch (error) {
            logger.logError(error, { context: 'ActiveConnections' });
            return 0;
        }
    }
    processMetrics(metrics) {
        // メトリクスのログ記録
        logger.logMetric({
            metric: 'cpu_usage',
            value: metrics.cpu.usage,
            unit: 'percent'
        });
        logger.logMetric({
            metric: 'memory_usage',
            value: (metrics.memory.used / metrics.memory.total) * 100,
            unit: 'percent'
        });
        logger.logMetric({
            metric: 'disk_usage',
            value: (metrics.disk.used / metrics.disk.total) * 100,
            unit: 'percent'
        });
        // アラートの確認
        this.checkAlerts(metrics);
    }
    // Helper function to create and send alerts
    createAndSendAlert(idPrefix, alertType, message, usage, threshold) {
        const severity = alertType === 'critical' ? 'critical' : 'high';
        const alert = {
            id: `${idPrefix}-${Date.now()}`,
            type: alertType,
            source: 'system-monitor',
            message,
            severity,
            timestamp: new Date(),
            acknowledged: false,
            metadata: {
                usage,
                threshold
            }
        };
        logger.logSecurity({
            userId: 'system',
            event: message,
            severity,
            details: {
                usage,
                threshold
            }
        });
        notificationService_1.NotificationService.getInstance().sendAlertEmail(alert);
    }
    checkAlerts(metrics) {
        // CPU Usage Alert
        if (metrics.cpu.usage > MonitoringService.CPU_THRESHOLD) {
            this.createAndSendAlert('cpu', 'critical', `High CPU Usage: ${metrics.cpu.usage.toFixed(1)}%`, metrics.cpu.usage, MonitoringService.CPU_THRESHOLD);
        }
        // Memory Usage Alert
        const memoryUsage = (metrics.memory.used / metrics.memory.total) * 100;
        if (memoryUsage > MonitoringService.MEMORY_THRESHOLD) {
            this.createAndSendAlert('memory', 'error', `High Memory Usage: ${memoryUsage.toFixed(1)}%`, memoryUsage, MonitoringService.MEMORY_THRESHOLD);
        }
        // Disk Usage Alert
        const diskUsage = (metrics.disk.used / metrics.disk.total) * 100;
        if (diskUsage > MonitoringService.DISK_THRESHOLD) {
            this.createAndSendAlert('disk', 'critical', `High Disk Usage: ${diskUsage.toFixed(1)}%`, diskUsage, MonitoringService.DISK_THRESHOLD);
        }
    }
}
exports.MonitoringService = MonitoringService;
// Define thresholds as constants
MonitoringService.CPU_THRESHOLD = 90;
MonitoringService.MEMORY_THRESHOLD = 85;
MonitoringService.DISK_THRESHOLD = 90;
//# sourceMappingURL=monitoringService.js.map