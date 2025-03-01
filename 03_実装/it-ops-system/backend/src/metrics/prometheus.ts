import { Registry, Gauge, Counter } from 'prom-client';

class PrometheusMetrics {
  private static instance: PrometheusMetrics;
  public register: Registry;
  public metrics: {
    accessAttempts: Counter<string>;
    permissionChanges: Counter<string>;
    errorRate: Gauge<string>;
    securityAlertsActive: Gauge<string>;
    securityAlertsTotal: Counter<string>;
    cacheHits: Counter<string>;
  };

  private constructor() {
    this.register = new Registry();
    
    // メトリクスの初期化
    this.metrics = {
      accessAttempts: new Counter({
        name: 'access_attempts_total',
        help: 'Total number of access attempts',
        labelNames: ['resource', 'status'],
        registers: [this.register]
      }),

      permissionChanges: new Counter({
        name: 'permission_changes_total',
        help: 'Total number of permission changes',
        labelNames: ['type', 'severity'],
        registers: [this.register]
      }),

      errorRate: new Gauge({
        name: 'error_rate',
        help: 'Current error rate',
        labelNames: ['type', 'severity'],
        registers: [this.register]
      }),

      securityAlertsActive: new Gauge({
        name: 'security_alerts_active',
        help: 'Number of active security alerts',
        labelNames: ['severity'],
        registers: [this.register]
      }),

      securityAlertsTotal: new Counter({
        name: 'security_alerts_total',
        help: 'Total number of security alerts',
        labelNames: ['type', 'severity'],
        registers: [this.register]
      }),

      cacheHits: new Counter({
        name: 'cache_hits_total',
        help: 'Total number of cache hits/misses',
        labelNames: ['cache', 'result'],
        registers: [this.register]
      })
    };
  }

  public static getInstance(): PrometheusMetrics {
    if (!PrometheusMetrics.instance) {
      PrometheusMetrics.instance = new PrometheusMetrics();
    }
    return PrometheusMetrics.instance;
  }
}

export const Prometheus = PrometheusMetrics.getInstance();