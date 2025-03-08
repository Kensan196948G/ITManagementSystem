import { SQLiteService } from './sqliteService';
import LoggingService from './loggingService';

const logger = LoggingService.getInstance();

export class AuditMetricsService {
  private static instance: AuditMetricsService;
  private sqlite: SQLiteService;

  private constructor() {
    this.sqlite = SQLiteService.getInstance();
    this.initializeMetricsTable();
  }

  public static getInstance(): AuditMetricsService {
    if (!AuditMetricsService.instance) {
      AuditMetricsService.instance = new AuditMetricsService();
    }
    return AuditMetricsService.instance;
  }

  private async initializeMetricsTable(): Promise<void> {
    try {
      await this.sqlite.run(`
        CREATE TABLE IF NOT EXISTS audit_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          metric_name TEXT NOT NULL,
          metric_value REAL NOT NULL,
          metric_labels TEXT
        )
      `);

      await this.sqlite.run(`
        CREATE INDEX IF NOT EXISTS idx_audit_metrics_name_timestamp
        ON audit_metrics (metric_name, timestamp)
      `);

      logger.logInfo({
        message: 'AuditMetricsService initialized'
      });
    } catch (error) {
      logger.logError(error as Error, {
        context: 'AuditMetricsService',
        message: 'Failed to initialize metrics table'
      });
    }
  }

  public async recordMetric(
    name: string,
    value: number,
    labels: Record<string, string> = {}
  ): Promise<void> {
    try {
      await this.sqlite.run(
        `INSERT INTO audit_metrics (timestamp, metric_name, metric_value, metric_labels)
         VALUES (?, ?, ?, ?)`,
        [
          new Date().toISOString(),
          name,
          value,
          JSON.stringify(labels)
        ]
      );
    } catch (error) {
      logger.logError(error as Error, {
        context: 'AuditMetricsService',
        message: 'Failed to record metric',
        details: { name, value, labels }
      });
    }
  }

  public async getMetrics(
    name: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<Array<{
    timestamp: Date;
    value: number;
    labels?: Record<string, string>;
  }>> {
    try {
      const params: any[] = [name];
      let query = `
        SELECT timestamp, metric_value, metric_labels
        FROM audit_metrics
        WHERE metric_name = ?
      `;

      if (startTime) {
        query += ' AND timestamp >= ?';
        params.push(startTime.toISOString());
      }

      if (endTime) {
        query += ' AND timestamp <= ?';
        params.push(endTime.toISOString());
      }

      query += ' ORDER BY timestamp DESC';

      const rows = await this.sqlite.all(query, params);
      
      return rows.map(row => ({
        timestamp: new Date(row.timestamp),
        value: row.metric_value,
        labels: row.metric_labels ? JSON.parse(row.metric_labels) : undefined
      }));
    } catch (error) {
      logger.logError(error as Error, {
        context: 'AuditMetricsService',
        message: 'Failed to get metrics',
        details: { name, startTime, endTime }
      });
      return [];
    }
  }

  public async getAggregatedMetrics(
    name: string,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count',
    interval: 'hour' | 'day' | 'week' | 'month',
    startTime?: Date,
    endTime?: Date
  ): Promise<Array<{
    timestamp: Date;
    value: number;
  }>> {
    try {
      const params: any[] = [name];
      let timeGroup: string;

      switch (interval) {
        case 'hour':
          timeGroup = "strftime('%Y-%m-%d %H:00:00', timestamp)";
          break;
        case 'day':
          timeGroup = "strftime('%Y-%m-%d', timestamp)";
          break;
        case 'week':
          timeGroup = "strftime('%Y-%W', timestamp)";
          break;
        case 'month':
          timeGroup = "strftime('%Y-%m', timestamp)";
          break;
      }

      let aggFunc: string;
      switch (aggregation) {
        case 'sum':
          aggFunc = 'SUM';
          break;
        case 'avg':
          aggFunc = 'AVG';
          break;
        case 'min':
          aggFunc = 'MIN';
          break;
        case 'max':
          aggFunc = 'MAX';
          break;
        case 'count':
          aggFunc = 'COUNT';
          break;
      }

      let query = `
        SELECT 
          ${timeGroup} as time_bucket,
          ${aggFunc}(metric_value) as agg_value
        FROM audit_metrics
        WHERE metric_name = ?
      `;

      if (startTime) {
        query += ' AND timestamp >= ?';
        params.push(startTime.toISOString());
      }

      if (endTime) {
        query += ' AND timestamp <= ?';
        params.push(endTime.toISOString());
      }

      query += ` GROUP BY time_bucket ORDER BY time_bucket DESC`;

      const rows = await this.sqlite.all(query, params);
      
      return rows.map(row => ({
        timestamp: new Date(row.time_bucket),
        value: row.agg_value
      }));
    } catch (error) {
      logger.logError(error as Error, {
        context: 'AuditMetricsService',
        message: 'Failed to get aggregated metrics',
        details: {
          name,
          aggregation,
          interval,
          startTime,
          endTime
        }
      });
      return [];
    }
  }
}