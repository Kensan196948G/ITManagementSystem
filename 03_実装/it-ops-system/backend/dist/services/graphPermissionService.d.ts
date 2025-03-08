export interface GraphPermission {
    id: string;
    value: string;
    type: 'Delegated' | 'Application';
    description?: string;
    displayName?: string;
}
export interface PermissionOperationResult {
    success: boolean;
    message: string;
    details?: any;
}
export interface PermissionAuditLog {
    id?: number;
    timestamp: string;
    userEmail: string;
    operatorEmail: string;
    action: 'grant' | 'revoke' | 'list';
    permission?: string;
    permissionType?: string;
    success: boolean;
    errorMessage?: string;
}
/**
 * Microsoft Graph APIのパーミッション管理サービス
 */
export declare class GraphPermissionService {
    private static instance;
    private graphClient;
    private sqliteService;
    private auditLogService;
    private readonly SCRIPTS_PATH;
    private readonly GRAPH_SERVICE_PRINCIPAL_ID;
    private constructor();
    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(): Promise<GraphPermissionService>;
    /**
     * 同期的にインスタンスを取得（初期化が完了していない可能性あり）
     */
    static getInstanceSync(): GraphPermissionService;
    /**
     * サービスを初期化
     */
    initialize(): Promise<void>;
    /**
     * Graph Clientの初期化
     */
    private initializeGraphClient;
    /**
     * データベーステーブルの初期化
     */
    private initializeDatabase;
    /**
     * PowerShellスクリプトの実行
     * @param action 実行するアクション
     * @param userEmail 対象ユーザーのメールアドレス
     * @param permission パーミッション名
     * @param scope パーミッションのスコープ
     */
    private executePowerShellScript;
    /**
     * 監査ログの記録
     * @param logEntry 監査ログエントリ
     */
    private logAudit;
    /**
     * ユーザーにパーミッションを付与
     * @param userEmail 対象ユーザーのメールアドレス
     * @param permission 付与するパーミッション
     * @param scope パーミッションのスコープ
     * @param operatorEmail 操作者のメールアドレス
     */
    grantPermission(userEmail: string, permission: string, scope: 'Delegated' | 'Application', operatorEmail: string): Promise<PermissionOperationResult>;
    /**
     * ユーザーからパーミッションを削除
     * @param userEmail 対象ユーザーのメールアドレス
     * @param permission 削除するパーミッション
     * @param scope パーミッションのスコープ
     * @param operatorEmail 操作者のメールアドレス
     */
    revokePermission(userEmail: string, permission: string, scope: 'Delegated' | 'Application', operatorEmail: string): Promise<PermissionOperationResult>;
    /**
     * ユーザーのパーミッション一覧を取得
     * @param userEmail 対象ユーザーのメールアドレス
     * @param operatorEmail 操作者のメールアドレス
     */
    listPermissions(userEmail: string, operatorEmail: string): Promise<GraphPermission[]>;
    /**
     * パーミッション監査ログの取得
     * @param userEmail 対象ユーザーのメールアドレス（オプション）
     * @param limit 取得する最大件数
     * @param offset オフセット
     */
    getPermissionAuditLogs(userEmail?: string, limit?: number, offset?: number): Promise<PermissionAuditLog[]>;
    /**
     * 利用可能なGraph APIパーミッションの一覧を取得
     */
    getAvailablePermissions(): Promise<GraphPermission[]>;
}
export default GraphPermissionService;
//# sourceMappingURL=graphPermissionService.d.ts.map