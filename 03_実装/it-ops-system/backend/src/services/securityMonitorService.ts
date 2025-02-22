import { Prometheus } from '../metrics/prometheus';
import { RedisService } from './redisService';
import LoggingService from './loggingService';
import { NotificationService } from './notificationService';

interface SecurityAlert {
  type: 'suspicious_activity' | 'brute_force' | 'unusual_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId: string;
  timestamp: Date;
  details: Record<string, any>;
}

export class SecurityMonitorService {
  private static instance: SecurityMonitorService;
  private redis = RedisService.getInstance().getClient();
  private logger = LoggingService.getInstance();
  private notification = NotificationService.getInstance();
  private metrics = Prometheus;

  private readonly ALERT_THRESHOLDS = {
    failedAttempts: 5, // 5回の失敗で警告
    rapidAccess: 10,   // 1分間に10回以上のアクセス
    unusualTime: {     // 通常時間外のアクセス
      start: 7,        // 7:00
      end: 20          // 20:00
    }
  };

  private constructor() {
    this.initializeMetrics();
    this.startMonitoring();
  }

  public static getInstance(): SecurityMonitorService {
    if (!SecurityMonitorService.instance) {
      SecurityMonitorService.instance = new SecurityMonitorService();
    }
    return SecurityMonitorService.instance;
  }

  private initializeMetrics(): void {
    // セキュリティアラートのメトリクス
    this.metrics.register.gauge({
      name: 'security_alerts_active',
      help: 'アクティブなセキュリティアラートの数',
      labelNames: ['severity']
    });

    this.metrics.register.counter({
      name: 'security_alerts_total',
      help: 'セキュリティアラートの総数',
      labelNames: ['type', 'severity']
    });
  }

  private async startMonitoring(): Promise<void> {
    setInterval(() => this.checkForAnomalies(), 60000); // 1分ごとにチェック
  }

  public async trackAccessAttempt(
    userId: string,
    resource: string,
    success: boolean,
    clientInfo: { ip: string; userAgent: string }
  ): Promise<void> {
    const now = Date.now();
    const attemptKey = `access:${userId}:${now}`;
    
    try {
      // アクセス試行を記録
      await this.redis.multi()
        .hmset(attemptKey, {
          userId,
          resource,
          success: String(success),
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          timestamp: now
        })
        .expire(attemptKey, 86400) // 24時間保持
        .exec();

      // メトリクスの更新
      this.metrics.metrics.accessAttempts.inc({
        resource,
        status: success ? 'success' : 'failure'
      });

      // 失敗したアクセスの監視
      if (!success) {
        await this.checkFailedAttempts(userId);
      }

      // 急増するアクセスの検出
      await this.checkRapidAccess(userId);

    } catch (error) {
      this.logger.logError(error as Error, {
        context: 'SecurityMonitor',
        message: 'アクセス試行の追跡に失敗'
      });
    }
  }

  private async checkFailedAttempts(userId: string): Promise<void> {
    const recentAttempts = await this.getRecentAttempts(userId, 300); // 5分以内
    const failedAttempts = recentAttempts.filter(attempt => !attempt.success);

    if (failedAttempts.length >= this.ALERT_THRESHOLDS.failedAttempts) {
      await this.createAlert({
        type: 'brute_force',
        severity: 'high',
        userId,
        timestamp: new Date(),
        details: {
          failedAttempts: failedAttempts.length,
          timeWindow: '5 minutes',
          lastAttempt: failedAttempts[failedAttempts.length - 1]
        }
      });
    }
  }

  private async checkRapidAccess(userId: string): Promise<void> {
    const recentAttempts = await this.getRecentAttempts(userId, 60); // 1分以内

    if (recentAttempts.length >= this.ALERT_THRESHOLDS.rapidAccess) {
      await this.createAlert({
        type: 'unusual_pattern',
        severity: 'medium',
        userId,
        timestamp: new Date(),
        details: {
          accessCount: recentAttempts.length,
          timeWindow: '1 minute',
          pattern: this.analyzeAccessPattern(recentAttempts)
        }
      });
    }
  }

  private async getRecentAttempts(userId: string, seconds: number): Promise<any[]> {
    const now = Date.now();
    const keys = await this.redis.keys(`access:${userId}:*`);
    const attempts = [];

    for (const key of keys) {
      const attempt = await this.redis.hgetall(key);
      if (now - parseInt(attempt.timestamp) <= seconds * 1000) {
        attempts.push({
          ...attempt,
          success: attempt.success === 'true'
        });
      }
    }

    return attempts;
  }

  private analyzeAccessPattern(attempts: any[]): Record<string, any> {
    const resources = new Set(attempts.map(a => a.resource));
    const ips = new Set(attempts.map(a => a.ip));

    return {
      uniqueResources: resources.size,
      uniqueIPs: ips.size,
      timespan: attempts[attempts.length - 1].timestamp - attempts[0].timestamp,
      successRate: attempts.filter(a => a.success).length / attempts.length
    };
  }

  private async createAlert(alert: SecurityAlert): Promise<void> {
    try {
      // アラートの保存
      const alertKey = `alert:${alert.type}:${Date.now()}`;
      await this.redis.hmset(alertKey, {
        ...alert,
        details: JSON.stringify(alert.details)
      });

      // メトリクスの更新
      this.metrics.metrics.permissionChanges.inc({
        type: alert.type,
        severity: alert.severity
      });

      // 重大なアラートの場合は通知を送信
      if (alert.severity === 'high' || alert.severity === 'critical') {
        await this.notification.sendAlertEmail({
          type: alert.type,
          source: 'SecurityMonitor',
          message: `重大なセキュリティアラート: ${alert.type}`,
          timestamp: alert.timestamp,
          metadata: alert.details
        });
      }

    } catch (error) {
      this.logger.logError(error as Error, {
        context: 'SecurityMonitor',
        message: 'アラート作成に失敗',
        alert
      });
    }
  }

  private async checkForAnomalies(): Promise<void> {
    try {
      const activeAlerts = await this.getActiveAlerts();
      
      // アクティブなアラートの数を記録
      Object.entries(activeAlerts).forEach(([severity, count]) => {
        this.metrics.metrics.errorRate.set({
          type: 'active_alerts',
          severity
        }, count);
      });

      // 異常パターンの検出
      await this.detectAnomalousPatterns();

    } catch (error) {
      this.logger.logError(error as Error, {
        context: 'SecurityMonitor',
        message: '異常検知に失敗'
      });
    }
  }

  private async getActiveAlerts(): Promise<Record<string, number>> {
    const alerts = await this.redis.keys('alert:*');
    const counts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    for (const key of alerts) {
      const alert = await this.redis.hgetall(key);
      counts[alert.severity as keyof typeof counts]++;
    }

    return counts;
  }

  private async detectAnomalousPatterns(): Promise<void> {
    // 実装予定: 機械学習ベースの異常検知
    // このメソッドは将来的な拡張のためのプレースホルダー
  }
}