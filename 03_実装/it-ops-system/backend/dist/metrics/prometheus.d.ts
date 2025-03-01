import { Registry, Gauge, Counter } from 'prom-client';
declare class PrometheusMetrics {
    private static instance;
    register: Registry;
    metrics: {
        accessAttempts: Counter<string>;
        permissionChanges: Counter<string>;
        errorRate: Gauge<string>;
        securityAlertsActive: Gauge<string>;
        securityAlertsTotal: Counter<string>;
        cacheHits: Counter<string>;
    };
    private constructor();
    static getInstance(): PrometheusMetrics;
}
export declare const Prometheus: PrometheusMetrics;
export {};
//# sourceMappingURL=prometheus.d.ts.map