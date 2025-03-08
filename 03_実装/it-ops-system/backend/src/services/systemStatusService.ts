import { SQLiteService } from './sqliteService';
import LoggingService from './loggingService';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = LoggingService.getInstance();

/**
 * システムステータス情報の型定義
 */
export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'critical';
  components: {
    database: {
      status: 'healthy' | 'degraded' | 'critical';
      message?: string;
    };
    api: {
      status: 'healthy' | 'degraded' | 'critical';
      message?: string;
    };
    filesystem: {
      status: 'healthy' | 'degraded' | 'critical';
      message?: string;
    };
    memory: {
      status: 'healthy' | 'degraded' | 'critical';
      message?: string;
      usage: number;
    };
  };
  lastChecked: string;
}

/**
 * セキュリティアラート情報の型定義
 */
export interface SecurityAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  source: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  details?: any;
}

/**
 * システムステータスサービス
 * システムの状態、リソース使用状況、セキュリティアラートなどの情報を提供
 */
export class SystemStatusService {
  private sqliteService: SQLiteService;
  
  constructor() {
    this.sqliteService = SQLiteService.getInstance();
  }
  
  /**
   * システムステータス情報を取得
   */
  public async getSystemStatus(): Promise<SystemStatus> {
    try {
      // データベース接続チェック
      let dbStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
      let dbMessage: string | undefined;
      
      try {
        await this.sqliteService.get('SELECT 1');
      } catch (dbError) {
        dbStatus = 'critical';
        dbMessage = (dbError as Error).message;
        logger.logError(dbError as Error, {
          context: 'SystemStatusService',
          message: 'データベース接続エラー'
        });
      }
      
      // ファイルシステムチェック
      let fsStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
      let fsMessage: string | undefined;
      
      try {
        const { stdout } = await execAsync('wmic logicaldisk get freespace,caption');
        const lines = stdout.trim().split('\n').slice(1);
        
        // ディスク空き容量が10%未満の場合は警告
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            const freeSpace = parseInt(parts[0], 10);
            const drive = parts[1];
            
            // ディスク情報を取得
            const { stdout: driveInfo } = await execAsync(`wmic logicaldisk where caption="${drive}" get size`);
            const sizeLines = driveInfo.trim().split('\n').slice(1);
            if (sizeLines.length > 0) {
              const totalSize = parseInt(sizeLines[0].trim(), 10);
              const freePercentage = (freeSpace / totalSize) * 100;
              
              if (freePercentage < 5) {
                fsStatus = 'critical';
                fsMessage = `ドライブ ${drive} の空き容量が5%未満です (${freePercentage.toFixed(2)}%)`;
                break;
              } else if (freePercentage < 10) {
                fsStatus = 'degraded';
                fsMessage = `ドライブ ${drive} の空き容量が10%未満です (${freePercentage.toFixed(2)}%)`;
              }
            }
          }
        }
      } catch (fsError) {
        fsStatus = 'degraded';
        fsMessage = (fsError as Error).message;
        logger.logError(fsError as Error, {
          context: 'SystemStatusService',
          message: 'ファイルシステムチェックエラー'
        });
      }
      
      // メモリ使用状況チェック
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
      
      let memoryStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
      let memoryMessage: string | undefined;
      
      if (memoryUsage > 90) {
        memoryStatus = 'critical';
        memoryMessage = `メモリ使用率が90%を超えています (${memoryUsage.toFixed(2)}%)`;
      } else if (memoryUsage > 80) {
        memoryStatus = 'degraded';
        memoryMessage = `メモリ使用率が80%を超えています (${memoryUsage.toFixed(2)}%)`;
      }
      
      // API状態チェック
      // 実際の実装では、外部APIの状態を確認する処理を追加
      const apiStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
      
      // 全体のステータスを判定
      let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
      
      if (dbStatus === 'critical' || fsStatus === 'critical' || memoryStatus === 'critical') {
        overallStatus = 'critical';
      } else if (dbStatus === 'degraded' || fsStatus === 'degraded' || memoryStatus === 'degraded' || apiStatus === 'degraded') {
        overallStatus = 'degraded';
      }
      
      return {
        status: overallStatus,
        components: {
          database: {
            status: dbStatus,
            message: dbMessage
          },
          api: {
            status: apiStatus
          },
          filesystem: {
            status: fsStatus,
            message: fsMessage
          },
          memory: {
            status: memoryStatus,
            message: memoryMessage,
            usage: memoryUsage
          }
        },
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SystemStatusService',
        message: 'システムステータス取得エラー'
      });
      
      // エラー時のフォールバック
      return {
        status: 'degraded',
        components: {
          database: {
            status: 'degraded',
            message: 'ステータス取得中にエラーが発生しました'
          },
          api: {
            status: 'degraded',
            message: 'ステータス取得中にエラーが発生しました'
          },
          filesystem: {
            status: 'degraded',
            message: 'ステータス取得中にエラーが発生しました'
          },
          memory: {
            status: 'degraded',
            message: 'ステータス取得中にエラーが発生しました',
            usage: 0
          }
        },
        lastChecked: new Date().toISOString()
      };
    }
  }
  
  /**
   * セキュリティアラート情報を取得
   */
  public async getSecurityAlerts(): Promise<SecurityAlert[]> {
    try {
      // データベースからセキュリティアラートを取得
      const alerts = await this.sqliteService.all(`
        SELECT 
          id, severity, type, message, source, timestamp, status, details
        FROM 
          security_alerts
        WHERE 
          status != 'resolved'
        ORDER BY 
          CASE 
            WHEN severity = 'critical' THEN 1
            WHEN severity = 'high' THEN 2
            WHEN severity = 'medium' THEN 3
            WHEN severity = 'low' THEN 4
            ELSE 5
          END,
          timestamp DESC
        LIMIT 100
      `);
      
      return alerts.map(alert => ({
        id: alert.id,
        severity: alert.severity,
        type: alert.type,
        message: alert.message,
        source: alert.source,
        timestamp: alert.timestamp,
        status: alert.status,
        details: alert.details ? JSON.parse(alert.details) : undefined
      }));
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SystemStatusService',
        message: 'セキュリティアラート取得エラー'
      });
      
      // エラー時は空配列を返す
      return [];
    }
  }
}