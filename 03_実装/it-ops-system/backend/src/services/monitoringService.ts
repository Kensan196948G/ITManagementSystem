import { Alert, SystemMetrics } from '../types/system';
import { NotificationService } from './notificationService';
import os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import LoggingService from './loggingService';

const execAsync = promisify(exec);
const logger = LoggingService.getInstance();

type AlertSeverityType = 'critical' | 'high';

export class MonitoringService {
  private static instance: MonitoringService;
  private metricsInterval: NodeJS.Timeout | null = null;
  private readonly collectionInterval: number;

  // Define thresholds as constants
  private static readonly CPU_THRESHOLD = 90;
  private static readonly MEMORY_THRESHOLD = 85;
  private static readonly DISK_THRESHOLD = 90;

  private constructor() {
    this.collectionInterval = parseInt(process.env.METRICS_COLLECTION_INTERVAL || '30000');
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  public startMetricsCollection(): void {
    if (this.metricsInterval) {
      return;
    }

    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.collectSystemMetrics();
        this.processMetrics(metrics);
      } catch (error) {
        logger.logError(error as Error, { context: 'MetricsCollection' });
      }
    }, this.collectionInterval);
  }

  public stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const cpuUsage = os.loadavg()[0];
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // ディスク使用状況の取得（Windowsの場合）
    const { stdout: diskInfo } = await execAsync('wmic logicaldisk get size,freespace,caption');
    const diskMetrics = this.parseDiskInfo(diskInfo);

    // ネットワーク統計の取得
    const networkStats = await this.getNetworkStats();

    const metrics: SystemMetrics = {
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

  private async getCpuTemperature(): Promise<number> {
    try {
      // Windowsの場合のCPU温度取得
      const { stdout } = await execAsync('wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature');
      const temp = parseInt(stdout.split('\n')[1]);
      return (temp - 273.15); // ケルビンから摂氏に変換
    } catch (error) {
      logger.logError(error as Error, { context: 'CPUTemperature' });
      return 0;
    }
  }

  private parseDiskInfo(diskInfo: string): { total: number; used: number; free: number } {
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

  private async getNetworkStats(): Promise<{ bytesIn: number; bytesOut: number; connections: number }> {
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
    } catch (error) {
      logger.logError(error as Error, { context: 'NetworkStats' });
    }

    return {
      bytesIn: 0,
      bytesOut: 0,
      connections: 0
    };
  }

  private async getActiveConnections(): Promise<number> {
    try {
      const { stdout } = await execAsync('netstat -n | find /c "ESTABLISHED"');
      return parseInt(stdout.trim());
    } catch (error) {
      logger.logError(error as Error, { context: 'ActiveConnections' });
      return 0;
    }
  }

  private processMetrics(metrics: SystemMetrics): void {
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
  private createAndSendAlert(
    idPrefix: string, 
    alertType: 'critical' | 'error', 
    message: string, 
    usage: number, 
    threshold: number
  ): void {
    const severity: AlertSeverityType = alertType === 'critical' ? 'critical' : 'high';
    
    const alert: Alert = {
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

    NotificationService.getInstance().sendAlertEmail(alert);
  }

  private checkAlerts(metrics: SystemMetrics): void {
    // CPU Usage Alert
    if (metrics.cpu.usage > MonitoringService.CPU_THRESHOLD) {
      this.createAndSendAlert(
        'cpu',
        'critical',
        `High CPU Usage: ${metrics.cpu.usage.toFixed(1)}%`,
        metrics.cpu.usage,
        MonitoringService.CPU_THRESHOLD
      );
    }

    // Memory Usage Alert
    const memoryUsage = (metrics.memory.used / metrics.memory.total) * 100;
    if (memoryUsage > MonitoringService.MEMORY_THRESHOLD) {
      this.createAndSendAlert(
        'memory',
        'error',
        `High Memory Usage: ${memoryUsage.toFixed(1)}%`,
        memoryUsage,
        MonitoringService.MEMORY_THRESHOLD
      );
    }

    // Disk Usage Alert
    const diskUsage = (metrics.disk.used / metrics.disk.total) * 100;
    if (diskUsage > MonitoringService.DISK_THRESHOLD) {
      this.createAndSendAlert(
        'disk',
        'critical',
        `High Disk Usage: ${diskUsage.toFixed(1)}%`,
        diskUsage,
        MonitoringService.DISK_THRESHOLD
      );
    }
  }
}