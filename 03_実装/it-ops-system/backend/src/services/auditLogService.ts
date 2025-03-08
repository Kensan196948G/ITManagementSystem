import { SQLiteService } from './sqliteService';
import LoggingService from './loggingService';

// 監査ログのタイプ
export enum AuditLogType {
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  ROLE_ASSIGNMENT = 'ROLE_ASSIGNMENT',
  ROLE_REMOVAL = 'ROLE_REMOVAL',
  API_PERMISSION_CHANGE = 'API_PERMISSION_CHANGE',
  GLOBAL_ADMIN_ACTION = 'GLOBAL_ADMIN_ACTION',
  SYSTEM_CONFIG_CHANGE = 'SYSTEM_CONFIG_CHANGE',
  SECURITY_POLICY_CHANGE = 'SECURITY_POLICY_CHANGE'
}

// 監査ログのエントリ
export interface AuditLogEntry {
  id?: number;
  timestamp?: string;
  userId: string; // 操作を実行したユーザーID
  targetUserId?: string; // 操作の対象となったユーザーID（該当する場合）
  action: string;
  type: AuditLogType;
  details: any; // 変更内容の詳細
  ipAddress?: string;
  userAgent?: string;
}

// 監査ログサービス
export class AuditLogService {
  private static instance: AuditLogService;
  private sqlite: SQLiteService;
  private logger: LoggingService;

  private constructor() {
    // SQLiteServiceは非同期で初期化するため、getInstanceSyncを使用
    this.sqlite = SQLiteService.getInstanceSync();
    this.logger = LoggingService.getInstance();
    // 初期化は非同期で行うため、コンストラクタでは呼び出さない
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static async getInstance(): Promise<AuditLogService> {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
      // SQLiteServiceが初期化されるのを待ってから初期化
      await AuditLogService.instance.initialize();
    }
    return AuditLogService.instance;
  }

  /**
   * 同期的にインスタンスを取得（初期化が完了していない可能性あり）
   */
  public static getInstanceSync(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
      // 非同期初期化をバックグラウンドで開始
      AuditLogService.instance.initialize().catch(err => {
        console.error('AuditLogService初期化エラー:', err);
      });
    }
    return AuditLogService.instance;
  }

  /**
   * サービスを初期化
   */
  public async initialize(): Promise<void> {
    try {
      // SQLiteServiceが初期化されるのを待つ
      await this.sqlite.initialize();
      // データベースを初期化
      await this.initializeDatabase();
    } catch (error) {
      this.logger.logError(error as Error, {
        context: 'AuditLogService',
        message: 'サービスの初期化に失敗しました'
      });
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // 監査ログテーブルの作成
      await this.sqlite.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT NOT NULL,
          target_user_id TEXT,
          action TEXT NOT NULL,
          type TEXT NOT NULL,
          details TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT
        )
      `);
      
      // インデックスの作成（検索パフォーマンス向上のため）
      await this.sqlite.run(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)
      `);
      
      // typeカラムが存在するか確認してからインデックスを作成
      try {
        // まずテーブル情報を取得
        const tableInfo = await this.sqlite.all(`PRAGMA table_info(audit_logs)`);
        const hasTypeColumn = tableInfo.some((column: any) => column.name === 'type');
        
        if (hasTypeColumn) {
          await this.sqlite.run(`
            CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON audit_logs(type)
          `);
        } else {
          // typeカラムが存在しない場合は、カラムを追加
          this.logger.logInfo({
            message: 'audit_logsテーブルにtypeカラムが存在しないため、追加します',
            context: 'AuditLogService'
          });
          
          await this.sqlite.run(`ALTER TABLE audit_logs ADD COLUMN type TEXT DEFAULT 'SYSTEM_CONFIG_CHANGE'`);
          
          // カラム追加後にインデックスを作成
          await this.sqlite.run(`
            CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON audit_logs(type)
          `);
        }
      } catch (error) {
        this.logger.logError(error as Error, {
          context: 'AuditLogService',
          message: 'typeカラムのインデックス作成に失敗しました'
        });
      }
      
      await this.sqlite.run(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)
      `);
    } catch (error) {
      this.logger.logError(error as Error, {
        context: 'AuditLogService',
        message: '監査ログテーブルの初期化に失敗しました'
      });
    }
  }

  /**
   * 情報ログを記録する
   * @param data ログデータ
   */
  public logInfo(data: { message: string; details?: any; context?: string }): void {
    this.logger.logInfo(data);
  }

  /**
   * エラーログを記録する
   * @param error エラーオブジェクト
   * @param data 追加データ
   */
  public logError(error: Error, data: { message: string; details?: any; context?: string }): void {
    this.logger.logError(error, data);
  }

  /**
   * セキュリティログを記録する
   * @param data セキュリティログデータ
   */
  public logSecurity(data: {
    userId: string;
    event: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: any
  }): void {
    this.logger.logSecurity(data);
  }

  /**
   * 監査ログを記録する
   * @param entry 監査ログエントリ
   * @returns 作成された監査ログのID
   */
  public async log(entry: AuditLogEntry): Promise<number> {
    try {
      const result = await this.sqlite.run(`
        INSERT INTO audit_logs 
          (user_id, target_user_id, action, type, details, ip_address, user_agent)
        VALUES 
          (?, ?, ?, ?, ?, ?, ?)
      `, [
        entry.userId,
        entry.targetUserId || null,
        entry.action,
        entry.type,
        JSON.stringify(entry.details),
        entry.ipAddress || null,
        entry.userAgent || null
      ]);
      
      this.logger.logInfo({
        message: '監査ログが記録されました',
        details: {
          type: entry.type,
          action: entry.action,
          userId: entry.userId
        }
      });
      
      return result.lastID;
    } catch (error) {
      this.logger.logError(error as Error, {
        context: 'AuditLogService',
        message: '監査ログの記録に失敗しました',
        details: entry
      });
      throw error;
    }
  }

  /**
   * 監査ログを検索する
   * @param filters フィルター条件
   * @param limit 取得件数制限
   * @param offset ページネーション用オフセット
   * @returns 監査ログエントリの配列
   */
  public async search(
    filters: {
      userId?: string;
      targetUserId?: string;
      type?: AuditLogType;
      startDate?: string;
      endDate?: string;
      action?: string;
    },
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    try {
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params = [];
      
      if (filters.userId) {
        query += ' AND user_id = ?';
        params.push(filters.userId);
      }
      
      if (filters.targetUserId) {
        query += ' AND target_user_id = ?';
        params.push(filters.targetUserId);
      }
      
      if (filters.type) {
        query += ' AND type = ?';
        params.push(filters.type);
      }
      
      if (filters.action) {
        query += ' AND action = ?';
        params.push(filters.action);
      }
      
      if (filters.startDate) {
        query += ' AND timestamp >= ?';
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ' AND timestamp <= ?';
        params.push(filters.endDate);
      }
      
      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const results = await this.sqlite.all<any[]>(query, params);
      
      // 結果を適切な形式に変換
      return results.map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        userId: row.user_id,
        targetUserId: row.target_user_id,
        action: row.action,
        type: row.type as AuditLogType,
        details: JSON.parse(row.details),
        ipAddress: row.ip_address,
        userAgent: row.user_agent
      }));
    } catch (error) {
      this.logger.logError(error as Error, {
        context: 'AuditLogService',
        message: '監査ログの検索に失敗しました',
        filters
      });
      throw error;
    }
  }

  /**
   * 特定の監査ログエントリを取得する
   * @param id 監査ログID
   * @returns 監査ログエントリ、存在しない場合はnull
   */
  public async getById(id: number): Promise<AuditLogEntry | null> {
    try {
      const row = await this.sqlite.get<any>(
        'SELECT * FROM audit_logs WHERE id = ?',
        [id]
      );
      
      if (!row) return null;
      
      return {
        id: row.id,
        timestamp: row.timestamp,
        userId: row.user_id,
        targetUserId: row.target_user_id,
        action: row.action,
        type: row.type as AuditLogType,
        details: JSON.parse(row.details),
        ipAddress: row.ip_address,
        userAgent: row.user_agent
      };
    } catch (error) {
      this.logger.logError(error as Error, {
        context: 'AuditLogService',
        message: '監査ログの取得に失敗しました',
        id
      });
      return null;
    }
  }

  /**
   * 特定のユーザーに対する監査ログを取得する
   * @param userId ユーザーID
   * @param limit 取得件数制限
   * @returns 監査ログエントリの配列
   */
  public async getUserLogs(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    try {
      const results = await this.sqlite.all<any[]>(
        `SELECT * FROM audit_logs 
         WHERE user_id = ? OR target_user_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`,
        [userId, userId, limit]
      );
      
      return results.map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        userId: row.user_id,
        targetUserId: row.target_user_id,
        action: row.action,
        type: row.type as AuditLogType,
        details: JSON.parse(row.details),
        ipAddress: row.ip_address,
        userAgent: row.user_agent
      }));
    } catch (error) {
      this.logger.logError(error as Error, {
        context: 'AuditLogService',
        message: 'ユーザー監査ログの取得に失敗しました',
        userId
      });
      return [];
    }
  }

  /**
   * 特定の種類の最新の監査ログを取得する
   * @param type 監査ログタイプ
   * @param limit 取得件数制限
   * @returns 監査ログエントリの配列
   */
  public async getLatestByType(type: AuditLogType, limit: number = 10): Promise<AuditLogEntry[]> {
    try {
      const results = await this.sqlite.all<any[]>(
        `SELECT * FROM audit_logs 
         WHERE type = ?
         ORDER BY timestamp DESC
         LIMIT ?`,
        [type, limit]
      );
      
      return results.map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        userId: row.user_id,
        targetUserId: row.target_user_id,
        action: row.action,
        type: row.type as AuditLogType,
        details: JSON.parse(row.details),
        ipAddress: row.ip_address,
        userAgent: row.user_agent
      }));
    } catch (error) {
      this.logger.logError(error as Error, {
        context: 'AuditLogService',
        message: '特定タイプの監査ログの取得に失敗しました',
        type
      });
      return [];
    }
  }
}

export default AuditLogService;