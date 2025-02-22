import { SystemMetrics } from '../types/system';
import os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import LoggingService from './loggingService';

const execAsync = promisify(exec);
const logger = LoggingService.getInstance();

export class MonitoringService {
  private static instance: MonitoringService;
  private metricsInterval: NodeJS.Timeout | null = null;
  private readonly collectionInterval: number;

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
      timestamp: new Date(),
      cpu: {
        usage: cpuUsage * 100,
        temperature: await this.getCpuTemperature(),
        cores: os.cpus().map((core, id) => ({
          id,
          usage: this.calculateCoreUsage(core)
        }))
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
        connections: networkStats.connections
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

  private calculateCoreUsage(core: os.CpuInfo): number {
    const total = Object.values(core.times).reduce((acc, time) => acc + time, 0);
    const idle = core.times.idle;
    return ((total - idle) / total) * 100;
  }

  private parseDiskInfo(diskInfo: string): { total: number; used: number; free: number } {
    const lines = diskInfo.split('\n').filter(line => line.trim());
    let total = 0;
    let free = 0;

    // ヘッダー行をスキップ
    for (let i = 1; i < lines.length; i++) {
      const [caption, freeSpace, size] = lines[i].trim().split(/\s+/);
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

  private checkAlerts(metrics: SystemMetrics): void {
    // CPU使用率のアラート
    if (metrics.cpu.usage > 90) {
      const alert: Alert = {
        id: `cpu-${Date.now()}`,
        type: 'critical',
        source: 'system-monitor',
        message: `High CPU Usage: ${metrics.cpu.usage.toFixed(1)}%`,
        timestamp: new Date(),
        acknowledged: false
      };
      
      logger.logSecurity({
        userId: 'system',
        event: 'High CPU Usage',
        severity: 'high',
        details: {
          usage: metrics.cpu.usage,
          threshold: 90
        }
      });

      NotificationService.getInstance().sendAlertEmail(alert);
    }

    // メモリ使用率のアラート
    const memoryUsage = (metrics.memory.used / metrics.memory.total) * 100;
    if (memoryUsage > 85) {
      const alert: Alert = {
        id: `memory-${Date.now()}`,
        type: 'error',
        source: 'system-monitor',
        message: `High Memory Usage: ${memoryUsage.toFixed(1)}%`,
        timestamp: new Date(),
        acknowledged: false
      };

      logger.logSecurity({
        userId: 'system',
        event: 'High Memory Usage',
        severity: 'high',
        details: {
          usage: memoryUsage,
          threshold: 85
        }
      });

      NotificationService.getInstance().sendAlertEmail(alert);
    }

    // ディスク使用率のアラート
    const diskUsage = (metrics.disk.used / metrics.disk.total) * 100;
    if (diskUsage > 90) {
      const alert: Alert = {
        id: `disk-${Date.now()}`,
        type: 'critical',
        source: 'system-monitor',
        message: `High Disk Usage: ${diskUsage.toFixed(1)}%`,
        timestamp: new Date(),
        acknowledged: false
      };

      logger.logSecurity({
        userId: 'system',
        event: 'High Disk Usage',
        severity: 'critical',
        details: {
          usage: diskUsage,
          threshold: 90
        }
      });

      NotificationService.getInstance().sendAlertEmail(alert);
    }
  }
}