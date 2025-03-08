/**
 * 監査ログのタイプ
 */
export declare enum AuditLogType {
    AUTHENTICATION = "authentication",
    AUTHORIZATION = "authorization",
    DATA_ACCESS = "data_access",
    DATA_MODIFICATION = "data_modification",
    CONFIGURATION = "configuration",
    SYSTEM = "system",
    SECURITY = "security",
    PERMISSION = "permission",
    USER_MANAGEMENT = "user_management",
    API_ACCESS = "api_access"
}
/**
 * 監査ログの重要度
 */
export declare enum AuditLogSeverity {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error",
    CRITICAL = "critical"
}
/**
 * 監査ログのステータス
 */
export declare enum AuditLogStatus {
    SUCCESS = "success",
    FAILURE = "failure",
    ATTEMPT = "attempt",
    BLOCKED = "blocked"
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
export declare class EnhancedAuditLogService {
    private static instance;
    private sqliteService;
    private initialized;
    private constructor();
    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(): EnhancedAuditLogService;
    /**
     * 初期化処理
     */
    private initialize;
    /**
     * 監査ログを記録
     * @param entry 監査ログエントリ
     */
    logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<string>;
    /**
     * 監査ログを検索
     * @param filters 検索フィルター
     * @param pagination ページネーション設定
     */
    searchAuditLogs(filters: {
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
    }, pagination?: {
        limit: number;
        offset: number;
    }): Promise<{
        logs: AuditLogEntry[];
        total: number;
    }>;
    /**
     * 監査ログの統計情報を取得
     * @param filters 検索フィルター
     */
    getAuditStats(filters?: {
        startDate?: string;
        endDate?: string;
        userEmail?: string;
        resource?: string;
    }): Promise<{
        totalLogs: number;
        byType: Record<string, number>;
        bySeverity: Record<string, number>;
        byStatus: Record<string, number>;
        topUsers: {
            userEmail: string;
            count: number;
        }[];
        topResources: {
            resource: string;
            count: number;
        }[];
        topActions: {
            action: string;
            count: number;
        }[];
        timeDistribution: {
            hour: number;
            count: number;
        }[];
    }>;
    /**
     * 監査ログのエクスポート
     * @param filters 検索フィルター
     * @param format エクスポート形式
     */
    exportAuditLogs(filters: {
        userEmail?: string;
        type?: AuditLogType | AuditLogType[];
        severity?: AuditLogSeverity | AuditLogSeverity[];
        status?: AuditLogStatus | AuditLogStatus[];
        resource?: string;
        action?: string;
        startDate?: string;
        endDate?: string;
    }, format?: 'json' | 'csv'): Promise<string>;
}
export default EnhancedAuditLogService;
//# sourceMappingURL=enhancedAuditLogService.d.ts.map