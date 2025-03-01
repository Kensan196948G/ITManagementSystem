"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Prometheus = void 0;
const prom_client_1 = require("prom-client");
class PrometheusMetrics {
    constructor() {
        this.register = new prom_client_1.Registry();
        // メトリクスの初期化
        this.metrics = {
            accessAttempts: new prom_client_1.Counter({
                name: 'access_attempts_total',
                help: 'Total number of access attempts',
                labelNames: ['resource', 'status'],
                registers: [this.register]
            }),
            permissionChanges: new prom_client_1.Counter({
                name: 'permission_changes_total',
                help: 'Total number of permission changes',
                labelNames: ['type', 'severity'],
                registers: [this.register]
            }),
            errorRate: new prom_client_1.Gauge({
                name: 'error_rate',
                help: 'Current error rate',
                labelNames: ['type', 'severity'],
                registers: [this.register]
            }),
            securityAlertsActive: new prom_client_1.Gauge({
                name: 'security_alerts_active',
                help: 'Number of active security alerts',
                labelNames: ['severity'],
                registers: [this.register]
            }),
            securityAlertsTotal: new prom_client_1.Counter({
                name: 'security_alerts_total',
                help: 'Total number of security alerts',
                labelNames: ['type', 'severity'],
                registers: [this.register]
            }),
            cacheHits: new prom_client_1.Counter({
                name: 'cache_hits_total',
                help: 'Total number of cache hits/misses',
                labelNames: ['cache', 'result'],
                registers: [this.register]
            })
        };
    }
    static getInstance() {
        if (!PrometheusMetrics.instance) {
            PrometheusMetrics.instance = new PrometheusMetrics();
        }
        return PrometheusMetrics.instance;
    }
}
exports.Prometheus = PrometheusMetrics.getInstance();
//# sourceMappingURL=prometheus.js.map