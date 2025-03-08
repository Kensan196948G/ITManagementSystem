export declare enum AuditLogType {
    PERMISSION_CHANGE = "PERMISSION_CHANGE",
    ROLE_ASSIGNMENT = "ROLE_ASSIGNMENT",
    ROLE_REMOVAL = "ROLE_REMOVAL",
    API_PERMISSION_CHANGE = "API_PERMISSION_CHANGE",
    GLOBAL_ADMIN_ACTION = "GLOBAL_ADMIN_ACTION",
    SYSTEM_CONFIG_CHANGE = "SYSTEM_CONFIG_CHANGE",
    SECURITY_POLICY_CHANGE = "SECURITY_POLICY_CHANGE"
}
export interface AuditLogEntry {
    id?: number;
    timestamp?: string;
    userId: string;
    targetUserId?: string;
    action: string;
    type: AuditLogType;
    details: any;
    ipAddress?: string;
    userAgent?: string;
}
export declare class AuditLogService {
    private static instance;
    private sqlite;
    private logger;
    private constructor();
    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(): Promise<AuditLogService>;
    /**
     * 同期的にインスタンスを取得（初期化が完了していない可能性あり）
     */
    static getInstanceSync(): AuditLogService;
    /**
     * サービスを初期化
     */
    initialize(): Promise<void>;
    private initializeDatabase;
    /**
     * 情報ログを記録する
     * @param data ログデータ
     */
    logInfo(data: {
        message: string;
        details?: any;
        context?: string;
    }): void;
    /**
     * エラーログを記録する
     * @param error エラーオブジェクト
     * @param data 追加データ
     */
    logError(error: Error, data: {
        message: string;
        details?: any;
        context?: string;
    }): void;
    /**
     * セキュリティログを記録する
     * @param data セキュリティログデータ
     */
    logSecurity(data: {
        userId: string;
        event: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        details: any;
    }): void;
    /**
     * 監査ログを記録する
     * @param entry 監査ログエントリ
     * @returns 作成された監査ログのID
     */
    log(entry: AuditLogEntry): Promise<number>;
    /**
     * 監査ログを検索する
     * @param filters フィルター条件
     * @param limit 取得件数制限
     * @param offset ページネーション用オフセット
     * @returns 監査ログエントリの配列
     */
    search(filters: {
        userId?: string;
        targetUserId?: string;
        type?: AuditLogType;
        startDate?: string;
        endDate?: string;
        action?: string;
    }, limit?: number, offset?: number): Promise<AuditLogEntry[]>;
    /**
     * 特定の監査ログエントリを取得する
     * @param id 監査ログID
     * @returns 監査ログエントリ、存在しない場合はnull
     */
    getById(id: number): Promise<AuditLogEntry | null>;
    /**
     * 特定のユーザーに対する監査ログを取得する
     * @param userId ユーザーID
     * @param limit 取得件数制限
     * @returns 監査ログエントリの配列
     */
    getUserLogs(userId: string, limit?: number): Promise<AuditLogEntry[]>;
    /**
     * 特定の種類の最新の監査ログを取得する
     * @param type 監査ログタイプ
     * @param limit 取得件数制限
     * @returns 監査ログエントリの配列
     */
    getLatestByType(type: AuditLogType, limit?: number): Promise<AuditLogEntry[]>;
}
export default AuditLogService;
//# sourceMappingURL=auditLogService.d.ts.map