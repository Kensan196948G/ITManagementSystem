import client from 'prom-client';

// メトリクスの初期設定
const register = new client.Registry();
client.collectDefaultMetrics({
  register,
  prefix: 'it_ops_'
});

// 権限チェックのメトリクス
const permissionCheckHistogram = new client.Histogram({
  name: 'permission_check_duration_seconds',
  help: '権限チェックの処理時間',
  labelNames: ['resource', 'action', 'result'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 2, 5]
});

// トークン操作のメトリクス
const tokenOperationsCounter = new client.Counter({
  name: 'token_operations_total',
  help: 'トークン操作の総数',
  labelNames: ['operation', 'status']
});

// アクセス試行のメトリクス
const accessAttemptsCounter = new client.Counter({
  name: 'access_attempts_total',
  help: 'アクセス試行の総数',
  labelNames: ['resource', 'action', 'status']
});

// キャッシュヒット率
const cachingGauge = new client.Gauge({
  name: 'permission_cache_hit_ratio',
  help: '権限キャッシュのヒット率',
  labelNames: ['cache_type']
});

// エラー率
const errorRateGauge = new client.Gauge({
  name: 'permission_error_rate',
  help: '権限チェックのエラー率',
  labelNames: ['error_type']
});

// アクティブセッション数
const activeSessionsGauge = new client.Gauge({
  name: 'active_sessions_total',
  help: 'アクティブなセッションの総数'
});

// 権限変更の追跡
const permissionChangesCounter = new client.Counter({
  name: 'permission_changes_total',
  help: '権限変更の総数',
  labelNames: ['change_type', 'resource']
});

register.registerMetric(permissionCheckHistogram);
register.registerMetric(tokenOperationsCounter);
register.registerMetric(accessAttemptsCounter);
register.registerMetric(cachingGauge);
register.registerMetric(errorRateGauge);
register.registerMetric(activeSessionsGauge);
register.registerMetric(permissionChangesCounter);

export const Prometheus = {
  register,
  Histogram: client.Histogram,
  Counter: client.Counter,
  Gauge: client.Gauge,
  metrics: {
    permissionCheck: permissionCheckHistogram,
    tokenOperations: tokenOperationsCounter,
    accessAttempts: accessAttemptsCounter,
    caching: cachingGauge,
    errorRate: errorRateGauge,
    activeSessions: activeSessionsGauge,
    permissionChanges: permissionChangesCounter
  }
};