import { Counter, Gauge } from 'prom-client';
export interface Metrics {
    accessAttempts: Counter<string>;
    permissionChanges: Counter<string>;
    errorRate: Gauge<string>;
    securityAlertsActive: Gauge<string>;
    securityAlertsTotal: Counter<string>;
    permissionCheckLatency: Gauge<string>;
    cacheHitRatio: Gauge<string>;
    activeSessions: Gauge<string>;
    cacheHits: Counter<string>;
}
export interface AlertThresholds {
    cpu: number;
    memory: number;
    disk: number;
    errorRate: number;
    responseTime: number;
}
export type MetricSeverity = 'low' | 'medium' | 'high' | 'critical';
export interface MetricAlert {
    type: MetricSeverity;
    source: string;
    message: string;
    timestamp: Date;
    value: number;
    threshold: number;
}
export interface PerformanceMetrics {
    responseTime: number;
    errorRate: number;
    concurrentUsers: number;
    cacheHitRatio: number;
    queryLatency: number;
}
//# sourceMappingURL=metrics.d.ts.map