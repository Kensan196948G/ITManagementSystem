import { SQLiteService } from './sqliteService';
import LoggingService from './loggingService';
import { v4 as uuidv4 } from 'uuid';

const logger = LoggingService.getInstance();

/**
 * 監査ログのタイプ
 */
export enum AuditLogType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  CONFIGURATION = 'configuration',
  SYSTEM = 'system',
  SECURITY = 'security',
  PERMISSION = 'permission',
  USER_MANAGEMENT = 'user_management',
  API_ACCESS = 'api_access'
}

/**
 * 監査ログの重要度
 */
export enum AuditLogSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 監査ログのステータス
 */
export enum AuditLogStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  ATTEMPT = 'attempt',
  BLOCKED = 'blocked'
}

/**
 * 監査ログエントリの型定義
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  type: AuditLogType;
  severity: AuditLogSeverity;
  status: AuditLogStatus;
  userEmail?: string;
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
  relatedEntities?: string[];
  sessionId?: string;
  requestId?: string;
  duration?: number;
}

/**
 * 拡張監査ログサービス
 * より詳細な操作ログの記録と分析機能を提供
 */
export class EnhancedAuditLogService {
  private static instance: EnhancedAuditLogService;
  private sqliteService: SQLiteService;
  private initialized: boolean = false;

  private constructor() {
    this.sqliteService = SQLiteService.getInstance();
    this.initialize();
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): EnhancedAuditLogService {
    if (!EnhancedAuditLogService.instance) {
      EnhancedAuditLogService.instance = new EnhancedAuditLogService();
    }
    return EnhancedAuditLogService.instance;
  }

  /**
   * 初期化処理
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 監査ログテーブルの作成
      await this.sqliteService.run(`
        CREATE TABLE IF NOT EXISTS enhanced_audit_logs (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          type TEXT NOT NULL,
          severity TEXT NOT NULL,
          status TEXT NOT NULL,
          user_email TEXT,
          user_id TEXT,
          action TEXT NOT NULL,
          resource TEXT,
          resource_id TEXT,
          ip TEXT,
          user_agent TEXT,
          details TEXT,
          related_entities TEXT,
          session_id TEXT,
          request_id TEXT,
          duration INTEGER
        )
      `);

      // インデックスの作成
      await this.sqliteService.run(`
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON enhanced_audit_logs (timestamp)
      `);
      await this.sqliteService.run(`
        CREATE INDEX IF NOT EXISTS idx_audit_user_email ON enhanced_audit_logs (user_email)
      `);
      await this.sqliteService.run(`
        CREATE INDEX IF NOT EXISTS idx_audit_type ON enhanced_audit_logs (type)
      `);
      await this.sqliteService.run(`
        CREATE INDEX IF NOT EXISTS idx_audit_resource ON enhanced_audit_logs (resource)
      `);

      this.initialized = true;
      logger.logInfo({
        context: 'EnhancedAuditLogService',
        message: '拡張監査ログサービスが初期化されました'
      });
    } catch (error) {
      logger.logError(error as Error, {
        context: 'EnhancedAuditLogService',
        message: '拡張監査ログサービスの初期化に失敗しました'
      });
      throw error;
    }
  }

  /**
   * 監査ログを記録
   * @param entry 監査ログエントリ
   */
  public async logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<string> {
    try {
      const id = uuidv4();
      const timestamp = new Date().toISOString();
      const fullEntry: AuditLogEntry = {
        id,
        timestamp,
        ...entry
      };

      // 詳細情報とリレーションをJSON文字列に変換
      const details = entry.details ? JSON.stringify(entry.details) : null;
      const relatedEntities = entry.relatedEntities ? JSON.stringify(entry.relatedEntities) : null;

      // データベースに記録
      await this.sqliteService.run(`
        INSERT INTO enhanced_audit_logs (
          id, timestamp, type, severity, status, user_email, user_id, action,
          resource, resource_id, ip, user_agent, details, related_entities,
          session_id, request_id, duration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, timestamp, entry.type, entry.severity, entry.status,
        entry.userEmail || null, entry.userId || null, entry.action,
        entry.resource || null, entry.resourceId || null,
        entry.ip || null, entry.userAgent || null,
        details, relatedEntities,
        entry.sessionId || null, entry.requestId || null,
        entry.duration || null
      ]);

      // 重要度が高い場合はログにも出力
      if (entry.severity === AuditLogSeverity.ERROR || entry.severity === AuditLogSeverity.CRITICAL) {
        logger.logSecurity({
          context: 'AuditLog',
          message: `[${entry.type}] ${entry.action}`,
          userEmail: entry.userEmail,
          severity: entry.severity,
          status: entry.status,
          details: entry.details
        });
      }

      return id;
    } catch (error) {
      logger.logError(error as Error, {
        context: 'EnhancedAuditLogService',
        message: '監査ログの記録に失敗しました',
        entry
      });
      throw error;
    }
  }

  /**
   * 監査ログを検索
   * @param filters 検索フィルター
   * @param pagination ページネーション設定
   */
  public async searchAuditLogs(
    filters: {
      userEmail?: string;
      type?: AuditLogType | AuditLogType[];
      severity?: AuditLogSeverity | AuditLogSeverity[];
      status?: AuditLogStatus | AuditLogStatus[];
      resource?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      ip?: string;
      resourceId?: string;
    },
    pagination: {
      limit: number;
      offset: number;
    } = { limit: 100, offset: 0 }
  ): Promise<{ logs: AuditLogEntry[]; total: number }> {
    try {
      // WHERE句の構築
      const conditions: string[] = [];
      const params: any[] = [];

      if (filters.userEmail) {
        conditions.push('user_email = ?');
        params.push(filters.userEmail);
      }

      if (filters.type) {
        if (Array.isArray(filters.type)) {
          conditions.push(`type IN (${filters.type.map(() => '?').join(', ')})`);
          params.push(...filters.type);
        } else {
          conditions.push('type = ?');
          params.push(filters.type);
        }
      }

      if (filters.severity) {
        if (Array.isArray(filters.severity)) {
          conditions.push(`severity IN (${filters.severity.map(() => '?').join(', ')})`);
          params.push(...filters.severity);
        } else {
          conditions.push('severity = ?');
          params.push(filters.severity);
        }
      }

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          conditions.push(`status IN (${filters.status.map(() => '?').join(', ')})`);
          params.push(...filters.status);
        } else {
          conditions.push('status = ?');
          params.push(filters.status);
        }
      }

      if (filters.resource) {
        conditions.push('resource = ?');
        params.push(filters.resource);
      }

      if (filters.resourceId) {
        conditions.push('resource_id = ?');
        params.push(filters.resourceId);
      }

      if (filters.action) {
        conditions.push('action LIKE ?');
        params.push(`%${filters.action}%`);
      }

      if (filters.startDate) {
        conditions.push('timestamp >= ?');
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push('timestamp <= ?');
        params.push(filters.endDate);
      }

      if (filters.ip) {
        conditions.push('ip = ?');
        params.push(filters.ip);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 合計件数の取得
      const countQuery = `
        SELECT COUNT(*) as total
        FROM enhanced_audit_logs
        ${whereClause}
      `;
      const countResult = await this.sqliteService.get(countQuery, params);
      const total = countResult.total;

      // ログデータの取得
      const dataQuery = `
        SELECT *
        FROM enhanced_audit_logs
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `;
      const dataParams = [...params, pagination.limit, pagination.offset];
      const rows = await this.sqliteService.all(dataQuery, dataParams);

      // 結果の変換
      const logs: AuditLogEntry[] = rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        type: row.type as AuditLogType,
        severity: row.severity as AuditLogSeverity,
        status: row.status as AuditLogStatus,
        userEmail: row.user_email,
        userId: row.user_id,
        action: row.action,
        resource: row.resource,
        resourceId: row.resource_id,
        ip: row.ip,
        userAgent: row.user_agent,
        details: row.details ? JSON.parse(row.details) : undefined,
        relatedEntities: row.related_entities ? JSON.parse(row.related_entities) : undefined,
        sessionId: row.session_id,
        requestId: row.request_id,
        duration: row.duration
      }));

      return { logs, total };
    } catch (error) {
      logger.logError(error as Error, {
        context: 'EnhancedAuditLogService',
        message: '監査ログの検索に失敗しました',
        filters,
        pagination
      });
      throw error;
    }
  }

  /**
   * 監査ログの統計情報を取得
   * @param filters 検索フィルター
   */
  public async getAuditStats(
    filters: {
      startDate?: string;
      endDate?: string;
      userEmail?: string;
      resource?: string;
    } = {}
  ): Promise<{
    totalLogs: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    topUsers: { userEmail: string; count: number }[];
    topResources: { resource: string; count: number }[];
    topActions: { action: string; count: number }[];
    timeDistribution: { hour: number; count: number }[];
  }> {
    try {
      // WHERE句の構築
      const conditions: string[] = [];
      const params: any[] = [];

      if (filters.userEmail) {
        conditions.push('user_email = ?');
        params.push(filters.userEmail);
      }

      if (filters.resource) {
        conditions.push('resource = ?');
        params.push(filters.resource);
      }

      if (filters.startDate) {
        conditions.push('timestamp >= ?');
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push('timestamp <= ?');
        params.push(filters.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 合計ログ数
      const totalQuery = `SELECT COUNT(*) as total FROM enhanced_audit_logs ${whereClause}`;
      const totalResult = await this.sqliteService.get(totalQuery, params);
      const totalLogs = totalResult.total;

      // タイプ別の集計
      const byTypeQuery = `
        SELECT type, COUNT(*) as count
        FROM enhanced_audit_logs
        ${whereClause}
        GROUP BY type
        ORDER BY count DESC
      `;
      const byTypeRows = await this.sqliteService.all(byTypeQuery, params);
      const byType: Record<string, number> = {};
      byTypeRows.forEach((row: any) => {
        byType[row.type] = row.count;
      });

      // 重要度別の集計
      const bySeverityQuery = `
        SELECT severity, COUNT(*) as count
        FROM enhanced_audit_logs
        ${whereClause}
        GROUP BY severity
        ORDER BY count DESC
      `;
      const bySeverityRows = await this.sqliteService.all(bySeverityQuery, params);
      const bySeverity: Record<string, number> = {};
      bySeverityRows.forEach((row: any) => {
        bySeverity[row.severity] = row.count;
      });

      // ステータス別の集計
      const byStatusQuery = `
        SELECT status, COUNT(*) as count
        FROM enhanced_audit_logs
        ${whereClause}
        GROUP BY status
        ORDER BY count DESC
      `;
      const byStatusRows = await this.sqliteService.all(byStatusQuery, params);
      const byStatus: Record<string, number> = {};
      byStatusRows.forEach((row: any) => {
        byStatus[row.status] = row.count;
      });

      // トップユーザー
      const topUsersQuery = `
        SELECT user_email, COUNT(*) as count
        FROM enhanced_audit_logs
        ${whereClause}
        WHERE user_email IS NOT NULL
        GROUP BY user_email
        ORDER BY count DESC
        LIMIT 10
      `;
      const topUsersRows = await this.sqliteService.all(topUsersQuery, params);
      const topUsers = topUsersRows.map((row: any) => ({
        userEmail: row.user_email,
        count: row.count
      }));

      // トップリソース
      const topResourcesQuery = `
        SELECT resource, COUNT(*) as count
        FROM enhanced_audit_logs
        ${whereClause}
        WHERE resource IS NOT NULL
        GROUP BY resource
        ORDER BY count DESC
        LIMIT 10
      `;
      const topResourcesRows = await this.sqliteService.all(topResourcesQuery, params);
      const topResources = topResourcesRows.map((row: any) => ({
        resource: row.resource,
        count: row.count
      }));

      // トップアクション
      const topActionsQuery = `
        SELECT action, COUNT(*) as count
        FROM enhanced_audit_logs
        ${whereClause}
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      `;
      const topActionsRows = await this.sqliteService.all(topActionsQuery, params);
      const topActions = topActionsRows.map((row: any) => ({
        action: row.action,
        count: row.count
      }));

      // 時間帯別の分布
      const timeDistributionQuery = `
        SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour, COUNT(*) as count
        FROM enhanced_audit_logs
        ${whereClause}
        GROUP BY hour
        ORDER BY hour
      `;
      const timeDistributionRows = await this.sqliteService.all(timeDistributionQuery, params);
      const timeDistribution = timeDistributionRows.map((row: any) => ({
        hour: row.hour,
        count: row.count
      }));

      return {
        totalLogs,
        byType,
        bySeverity,
        byStatus,
        topUsers,
        topResources,
        topActions,
        timeDistribution
      };
    } catch (error) {
      logger.logError(error as Error, {
        context: 'EnhancedAuditLogService',
        message: '監査ログの統計情報取得に失敗しました',
        filters
      });
      throw error;
    }
  }

  /**
   * 監査ログのエクスポート
   * @param filters 検索フィルター
   * @param format エクスポート形式
   */
  public async exportAuditLogs(
    filters: {
      userEmail?: string;
      type?: AuditLogType | AuditLogType[];
      severity?: AuditLogSeverity | AuditLogSeverity[];
      status?: AuditLogStatus | AuditLogStatus[];
      resource?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    },
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      // 監査ログの検索
      const { logs } = await this.searchAuditLogs(filters, { limit: 10000, offset: 0 });

      if (format === 'json') {
        // JSON形式でエクスポート
        return JSON.stringify(logs, null, 2);
      } else {
        // CSV形式でエクスポート
        const headers = [
          'id', 'timestamp', 'type', 'severity', 'status', 'userEmail',
          'userId', 'action', 'resource', 'resourceId', 'ip', 'userAgent',
          'sessionId', 'requestId', 'duration'
        ].join(',');

        const rows = logs.map(log => [
          log.id,
          log.timestamp,
          log.type,
          log.severity,
          log.status,
          log.userEmail || '',
          log.userId || '',
          log.action,
          log.resource || '',
          log.resourceId || '',
          log.ip || '',
          log.userAgent || '',
          log.sessionId || '',
          log.requestId || '',
          log.duration || ''
        ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','));

        return [headers, ...rows].join('\n');
      }
    } catch (error) {
      logger.logError(error as Error, {
        context: 'EnhancedAuditLogService',
        message: '監査ログのエクスポートに失敗しました',
        filters,
        format
      });
      throw error;
    }
  }
}

export default EnhancedAuditLogService;