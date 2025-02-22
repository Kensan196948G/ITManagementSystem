import { Redis } from 'ioredis';
import { Prometheus } from '../metrics/prometheus';
import LoggingService from './loggingService';

const logger = LoggingService.getInstance();

interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface AccessAttempt {
  userId: string;
  resource: string;
  action: string;
  success: boolean;
  errorCode?: string;
  clientInfo: {
    ip: string;
    userAgent: string;
  };
  timestamp: Date;
}

export class SecurityAuditService {
  private static instance: SecurityAuditService;
  private redis: Redis;
  private readonly metrics: typeof Prometheus;

  // メトリクス定義
  private accessAttemptCounter = new this.metrics.Counter({
    name: 'access_attempts_total',
    help: 'Total number of access attempts',
    labelNames: ['resource', 'action', 'success']
  });

  private permissionCheckDuration = new this.metrics.Histogram({
    name: 'permission_check_duration_seconds',
    help: 'Duration of permission checks',
    labelNames: ['resource', 'action'],
    buckets: [0.1, 0.5, 1, 2, 5]
  });

  private constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
    this.metrics = Prometheus;
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // エラー率の監視
    this.metrics.register.setDefaultLabels({
      app: 'it-ops-system',
      component: 'security'
    });
  }

  public static getInstance(): SecurityAuditService {
    if (!SecurityAuditService.instance) {
      SecurityAuditService.instance = new SecurityAuditService();
    }
    return SecurityAuditService.instance;
  }

  public async logPermissionChange(entry: AuditLogEntry): Promise<void> {
    try {
      const auditLog = {
        ...entry,
        timestamp: new Date()
      };

      await this.redis.xadd(
        'audit:permission:changes',
        '*',
        'data',
        JSON.stringify(auditLog)
      );

      // メトリクスの更新
      this.metrics.counter({
        name: 'permission_changes_total',
        help: 'Total number of permission changes',
        labels: { action: entry.action, resource: entry.resource }
      }).inc();

      logger.logInfo('権限変更を記録しました', {
        context: 'SecurityAudit',
        userId: entry.userId,
        action: entry.action
      });
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SecurityAudit',
        message: '権限変更の記録に失敗しました'
      });
      throw error;
    }
  }

  public async logAccessAttempt(attempt: AccessAttempt): Promise<void> {
    try {
      await this.redis.xadd(
        'audit:access:attempts',
        '*',
        'data',
        JSON.stringify(attempt)
      );

      // アクセス試行のメトリクスを更新
      this.accessAttemptCounter.labels(
        attempt.resource,
        attempt.action,
        attempt.success.toString()
      ).inc();

      if (!attempt.success) {
        this.metrics.counter({
          name: 'access_denied_total',
          help: 'Total number of denied access attempts',
          labels: {
            resource: attempt.resource,
            error_code: attempt.errorCode || 'unknown'
          }
        }).inc();
      }
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SecurityAudit',
        message: 'アクセス試行の記録に失敗しました'
      });
      throw error;
    }
  }

  public async measurePermissionCheck(
    resource: string,
    action: string,
    callback: () => Promise<boolean>
  ): Promise<boolean> {
    const end = this.permissionCheckDuration.labels(resource, action).startTimer();
    try {
      const result = await callback();
      end();
      return result;
    } catch (error) {
      end();
      throw error;
    }
  }

  public async getAccessPatternAnalysis(
    timeWindow: { start: Date; end: Date }
  ): Promise<any> {
    const patterns = await this.redis.xrange(
      'audit:access:attempts',
      timeWindow.start.getTime().toString(),
      timeWindow.end.getTime().toString()
    );

    return this.analyzeAccessPatterns(patterns);
  }

  private analyzeAccessPatterns(patterns: any[]): any {
    // アクセスパターンの分析ロジック
    const analysis = {
      totalAttempts: 0,
      successRate: 0,
      resourceUsage: new Map<string, number>(),
      userBehavior: new Map<string, any>(),
      suspiciousActivities: []
    };

    patterns.forEach(pattern => {
      const data = JSON.parse(pattern[1].data);
      analysis.totalAttempts++;
      
      // リソース使用統計
      const resourceCount = analysis.resourceUsage.get(data.resource) || 0;
      analysis.resourceUsage.set(data.resource, resourceCount + 1);

      // ユーザー行動の追跡
      if (!analysis.userBehavior.has(data.userId)) {
        analysis.userBehavior.set(data.userId, {
          attempts: 0,
          failures: 0,
          resources: new Set()
        });
      }

      const userStats = analysis.userBehavior.get(data.userId);
      userStats.attempts++;
      userStats.resources.add(data.resource);
      if (!data.success) userStats.failures++;

      // 不審な活動の検出
      if (this.isSuspiciousActivity(data, userStats)) {
        analysis.suspiciousActivities.push({
          userId: data.userId,
          timestamp: data.timestamp,
          activity: 'Suspicious access pattern detected',
          details: data
        });
      }
    });

    // 成功率の計算
    analysis.successRate = patterns.filter(p => 
      JSON.parse(p[1].data).success
    ).length / analysis.totalAttempts;

    return analysis;
  }

  private isSuspiciousActivity(
    attempt: AccessAttempt,
    userStats: { attempts: number; failures: number; resources: Set<string> }
  ): boolean {
    // 不審な活動を検出するロジック
    const failureRate = userStats.failures / userStats.attempts;
    const rapidAccessThreshold = 10; // 10回/分
    const highFailureRateThreshold = 0.3; // 30%

    return (
      failureRate > highFailureRateThreshold ||
      userStats.attempts > rapidAccessThreshold ||
      this.isUnusualAccessPattern(attempt, userStats)
    );
  }

  private isUnusualAccessPattern(
    attempt: AccessAttempt,
    userStats: { attempts: number; resources: Set<string> }
  ): boolean {
    // 通常とは異なるアクセスパターンを検出
    const unusualResourceAccessRate = userStats.resources.size / userStats.attempts;
    return unusualResourceAccessRate > 0.8; // 80%以上のリソースにアクセスは不審
  }
}