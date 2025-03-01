import { Alert } from '../types/system';
import { MetricAlert, MetricSeverity, AlertThresholds } from '../types/metrics';
import { NotificationService } from './notificationService';
import { SQLiteService } from './sqliteService';
import LoggingService from './loggingService';
import { v4 as uuidv4 } from 'uuid';

const logger = LoggingService.getInstance();

export class SecurityMonitorService {
  private static instance: SecurityMonitorService;
  private sqlite: SQLiteService;
  private notification: NotificationService;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.sqlite = SQLiteService.getInstance();
    this.notification = NotificationService.getInstance();
  }

  public static getInstance(): SecurityMonitorService {
    if (!SecurityMonitorService.instance) {
      SecurityMonitorService.instance = new SecurityMonitorService();
    }
    return SecurityMonitorService.instance;
  }

  public async startMonitoring(intervalMs = 60000): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    try {
      await this.monitor();
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.monitor();
        } catch (error) {
          logger.logError(error as Error, {
            context: 'SecurityMonitor',
            message: '定期監視処理に失敗',
          });
        }
      }, intervalMs);
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SecurityMonitor',
        message: '監視開始時に失敗',
      });
      this.isMonitoring = false;
    }
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  private async monitor(): Promise<void> {
    try {
      const alerts = await this.checkForAnomalies();
      await this.processAlerts(alerts);
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SecurityMonitor',
        message: '異常検知に失敗',
      });
    }
  }

  private async checkForAnomalies(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const rows = await this.sqlite.all<{ severity: string; count: number }>(
      'SELECT severity, COUNT(*) as count FROM security_events GROUP BY severity'
    );

    for (const row of rows) {
      const { count, severity } = row;
      const severityType = severity as MetricSeverity;

      if (this.isAnomalousCount(severityType, count)) {
        alerts.push({
          id: uuidv4(),
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

  private isAnomalousCount(severity: MetricSeverity, count: number): boolean {
    const threshold = this.getThresholdForSeverity(severity);
    return count > threshold;
  }

  private getThresholdForSeverity(severity: MetricSeverity): number {
    const thresholds: Record<MetricSeverity, number> = {
      critical: 1,
      high: 5,
      medium: 10,
      low: 20,
    };
    return thresholds[severity] ?? 50;
  }

  private async processAlerts(alerts: Alert[]): Promise<void> {
    for (const alert of alerts) {
      try {
        await this.sqlite.run(
          `INSERT INTO alerts (
            id, type, source, message, severity, timestamp, 
            acknowledged, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,

          [
            alert.id,
            alert.type,
            alert.source,
            alert.message,
            alert.severity,
            alert.timestamp.toISOString(),
            alert.acknowledged ? 1 : 0,
            JSON.stringify(alert.metadata || {}),
          ]
        );

        if (alert.severity === 'critical' || alert.severity === 'high') {
          await this.notification.sendAlertEmail(alert);
        }
      } catch (error) {
        logger.logError(error as Error, {
          context: 'SecurityMonitor',
          message: 'アラート処理に失敗',
          alertId: alert.id,
          severity: alert.severity,
        });
      }
    }
  }

  public async getActiveAlerts(): Promise<Alert[]> {
    try {
      const alerts = await this.sqlite.all<Alert>(
        'SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY timestamp DESC'
      );
      return alerts.map(alert => ({
        ...alert,
        timestamp: new Date(alert.timestamp),
      }));
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SecurityMonitor',
        message: 'アクティブなアラートの取得に失敗',
      });
      return [];
    }
  }

  public async updateAlertThresholds(thresholds: AlertThresholds): Promise<void> {
    const metrics = ['cpu', 'memory', 'disk'] as const;

    try {
      for (const metric of metrics) {
        await this.sqlite.run(
          'UPDATE alert_thresholds SET value = ? WHERE metric = ?',
          [thresholds[metric], metric]
        );
      }
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SecurityMonitor',
        message: 'アラート閾値の更新に失敗',
        metrics: metrics.join(', '),
      });
      throw error;
    }
  }

  public async getRecentAttempts(): Promise<MetricAlert[]> {
    try {
      const attempts = await this.sqlite.all<{
        type: string;
        source: string;
        message: string;
        timestamp: string;
        value: number;
        threshold: number;
      }>('SELECT * FROM metric_alerts ORDER BY timestamp DESC LIMIT 100');

      return attempts.map(attempt => ({
        type: attempt.type as MetricSeverity,
        source: attempt.source,
        message: attempt.message,
        timestamp: new Date(attempt.timestamp),
        value: attempt.value,
        threshold: attempt.threshold,
      }));
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SecurityMonitor',
        message: '最近のメトリクスアラート取得に失敗',
      });
      return [];
    }
  }
}