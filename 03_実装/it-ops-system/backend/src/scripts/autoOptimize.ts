import { SQLiteService } from '../services/sqliteService';
import LoggingService from '../services/loggingService';
import { NotificationService } from '../services/notificationService';
import { AuditMetricsService } from '../services/auditMetricsService';

const logger = LoggingService.getInstance();
const sqlite = SQLiteService.getInstance();
const notificationService = NotificationService.getInstance();
const metricsService = AuditMetricsService.getInstance();

interface OptimizationResult {
  success: boolean;
  optimizationTime: number;
  improvements: {
    indexSize?: number;
    queryTime?: number;
    fragmentationReduced?: number;
  };
}

async function analyzePerformance(): Promise<{
  avgQueryTime: number;
  indexFragmentation: number;
  tableSize: number;
}> {
  const startTime = Date.now();

  // サンプルクエリの実行時間を計測
  await sqlite.all(`
    SELECT COUNT(*) 
    FROM permission_audit 
    WHERE timestamp > datetime('now', '-1 day')
  `);

  const queryTime = Date.now() - startTime;

  // インデックスの断片化率を取得
  await sqlite.run('ANALYZE');
  const stats = await sqlite.all('SELECT * FROM sqlite_stat1');
  
  // テーブルサイズを取得
  const tableInfo = await sqlite.get(`
    SELECT SUM(pgsize) as size 
    FROM dbstat 
    WHERE name = 'permission_audit'
  `);

  return {
    avgQueryTime: queryTime,
    indexFragmentation: calculateFragmentation(stats),
    tableSize: tableInfo.size
  };
}

function calculateFragmentation(stats: any[]): number {
  // インデックスの断片化率を計算
  let totalFragmentation = 0;
  let count = 0;

  for (const stat of stats) {
    if (stat.avg_seek_time && stat.idx_entries) {
      const fragmentation = stat.avg_seek_time / stat.idx_entries;
      totalFragmentation += fragmentation;
      count++;
    }
  }

  return count > 0 ? totalFragmentation / count : 0;
}

async function optimizeIndexes(): Promise<void> {
  await sqlite.run('REINDEX permission_audit');
  await sqlite.run('REINDEX permission_audit_reviews');
  await sqlite.run('REINDEX audit_metrics');
}

async function optimizeStorage(): Promise<void> {
  await sqlite.run('VACUUM');
  await sqlite.run('PRAGMA optimize');
}

async function analyzeQueries(): Promise<void> {
  await sqlite.run('ANALYZE');
  await sqlite.run('PRAGMA automatic_index=ON');
}

async function runOptimization(): Promise<OptimizationResult> {
  const startTime = Date.now();
  const beforeMetrics = await analyzePerformance();

  try {
    // データベースの最適化を実行
    await optimizeIndexes();
    await optimizeStorage();
    await analyzeQueries();

    // 最適化後のメトリクスを取得
    const afterMetrics = await analyzePerformance();

    const improvements = {
      indexSize: beforeMetrics.tableSize - afterMetrics.tableSize,
      queryTime: beforeMetrics.avgQueryTime - afterMetrics.avgQueryTime,
      fragmentationReduced: beforeMetrics.indexFragmentation - afterMetrics.indexFragmentation
    };

    // メトリクスの記録
    await metricsService.recordMetric('db_optimization_time', Date.now() - startTime);
    await metricsService.recordMetric('db_size_reduction', improvements.indexSize);
    await metricsService.recordMetric('query_time_improvement', improvements.queryTime);

    return {
      success: true,
      optimizationTime: Date.now() - startTime,
      improvements
    };
  } catch (error) {
    logger.logError(error as Error, {
      context: 'DatabaseOptimization',
      message: 'Optimization failed'
    });

    return {
      success: false,
      optimizationTime: Date.now() - startTime,
      improvements: {}
    };
  }
}

async function notifyOptimizationResult(result: OptimizationResult): Promise<void> {
  const improvementSummary = result.improvements.indexSize
    ? `
      - インデックスサイズ削減: ${formatBytes(result.improvements.indexSize)}
      - クエリ時間改善: ${result.improvements.queryTime}ms
      - 断片化削減: ${(result.improvements.fragmentationReduced || 0 * 100).toFixed(2)}%
    `
    : '最適化による改善はありませんでした';

  try {
    await notificationService.sendNotification({
      userId: 'system',
      userEmail: 'admin@example.com',
      title: `データベース最適化 ${result.success ? '完了' : '失敗'}`,
      body: `
        最適化処理時間: ${result.optimizationTime}ms
        ${improvementSummary}
      `,
      type: 'system',
      priority: result.success ? 'low' : 'high'
    });
  } catch (error) {
    logger.logError(error as Error, {
      context: 'DatabaseOptimization',
      message: 'Failed to send optimization notification'
    });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function executeOptimization(): Promise<void> {
  const result = await runOptimization();
  await notifyOptimizationResult(result);

  if (!result.success) {
    throw new Error('Database optimization failed');
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  executeOptimization().catch(error => {
    console.error('Optimization failed:', error);
    process.exit(1);
  });
}