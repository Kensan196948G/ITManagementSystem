import winston, { format } from 'winston';
import { LogEntry } from '../types/system';
import 'winston-daily-rotate-file';

class LoggingService {
  private static instance: LoggingService;
  private logger!: winston.Logger;  // 明示的な初期化遅延を示す "!" を追加

  private constructor() {
    this.initializeLogger();
  }

  private initializeLogger() {
    const logFormat = format.combine(
      format.timestamp(),
      format.metadata(),
      format.json()
    );

    this.logger = winston.createLogger({
      format: logFormat,
      transports: [
        // 通常のログ（INFO以上）
        new winston.transports.DailyRotateFile({
          filename: 'logs/app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '10m',
          maxFiles: '7d',
          level: 'info'
        }),
        // エラーログ
        new winston.transports.DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '10m',
          maxFiles: '14d',
          level: 'error'
        }),
        // セキュリティログ
        new winston.transports.DailyRotateFile({
          filename: 'logs/security-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '10m',
          maxFiles: '30d',
          level: 'warn'
        }),
        // 開発環境用のコンソール出力
        new winston.transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple()
          ),
          level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
        })
      ]
    });
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  public logAccess(data: {
    userId: string;
    action: string;
    resource: string;
    ip: string;
    userAgent: string;
    result: 'success' | 'failure';
    details?: any;
  }) {
    this.logger.info('Access Log', {
      type: 'access',
      ...data,
      timestamp: new Date()
    });
  }

  public logSecurity(data: {
    userId: string;
    event: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: any;
  }) {
    this.logger.warn('Security Event', {
      type: 'security',
      ...data,
      timestamp: new Date()
    });
  }

  public logError(error: Error, context?: any) {
    this.logger.error('Error', {
      type: 'error',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      timestamp: new Date()
    });
  }

  public logMetric(data: {
    metric: string;
    value: number;
    unit: string;
    tags?: Record<string, string>;
  }) {
    this.logger.info('Metric', {
      type: 'metric',
      ...data,
      timestamp: new Date()
    });
  }

  public async queryLogs(
    // 将来の実装のための型定義
    _options?: {
      startDate: Date;
      endDate: Date;
      type?: string;
      level?: string;
      limit?: number;
      skip?: number;
    }
  ): Promise<LogEntry[]> {
    // TODO: 将来的な実装のためのスタブメソッド
    return [];
  }
}

export default LoggingService;