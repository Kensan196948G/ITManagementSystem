"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphPermissionService = void 0;
const microsoft_graph_client_1 = require("@microsoft/microsoft-graph-client");
const identity_1 = require("@azure/identity");
const azureTokenCredentials_1 = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");
const child_process_1 = require("child_process");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const loggingService_1 = __importDefault(require("./loggingService"));
const sqliteService_1 = require("./sqliteService");
const auditLogService_1 = require("./auditLogService");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const logger = loggingService_1.default.getInstance();
/**
 * Microsoft Graph APIのパーミッション管理サービス
 */
class GraphPermissionService {
    constructor() {
        this.GRAPH_SERVICE_PRINCIPAL_ID = '00000003-0000-0000-c000-000000000000'; // Microsoft Graph
        this.initializeGraphClient();
        this.sqliteService = sqliteService_1.SQLiteService.getInstanceSync();
        // AuditLogServiceは非同期で初期化するため、getInstanceSyncを使用
        this.auditLogService = auditLogService_1.AuditLogService.getInstanceSync();
        // スクリプトパスの設定
        this.SCRIPTS_PATH = path_1.default.resolve(process.cwd(), '..', 'scripts');
        // データベーステーブルの初期化
        this.initializeDatabase().catch(error => {
            logger.logError(error, {
                context: 'GraphPermissionService',
                message: 'データベース初期化エラー'
            });
        });
    }
    /**
     * シングルトンインスタンスを取得
     */
    static async getInstance() {
        if (!GraphPermissionService.instance) {
            GraphPermissionService.instance = new GraphPermissionService();
            // 非同期初期化
            await GraphPermissionService.instance.initialize();
        }
        return GraphPermissionService.instance;
    }
    /**
     * 同期的にインスタンスを取得（初期化が完了していない可能性あり）
     */
    static getInstanceSync() {
        if (!GraphPermissionService.instance) {
            GraphPermissionService.instance = new GraphPermissionService();
            // 非同期初期化をバックグラウンドで開始
            GraphPermissionService.instance.initialize().catch(err => {
                console.error('GraphPermissionService初期化エラー:', err);
            });
        }
        return GraphPermissionService.instance;
    }
    /**
     * サービスを初期化
     */
    async initialize() {
        try {
            // SQLiteServiceとAuditLogServiceが初期化されるのを待つ
            await this.sqliteService.initialize();
            await this.auditLogService.initialize();
        }
        catch (error) {
            logger.logError(error, {
                context: 'GraphPermissionService',
                message: 'サービスの初期化に失敗しました'
            });
            throw error;
        }
    }
    /**
     * Graph Clientの初期化
     */
    async initializeGraphClient() {
        try {
            const credential = new identity_1.ClientSecretCredential(process.env.AZURE_TENANT_ID, process.env.AZURE_CLIENT_ID, process.env.AZURE_CLIENT_SECRET);
            const authProvider = new azureTokenCredentials_1.TokenCredentialAuthenticationProvider(credential, {
                scopes: [
                    'https://graph.microsoft.com/.default'
                ]
            });
            this.graphClient = microsoft_graph_client_1.Client.initWithMiddleware({
                authProvider
            });
            logger.logInfo({
                context: 'GraphPermissionService',
                message: 'Graph Client初期化成功'
            });
        }
        catch (error) {
            const err = error;
            logger.logError(err, {
                context: 'GraphPermissionService',
                message: 'Graph Client初期化エラー'
            });
            throw error;
        }
    }
    /**
     * データベーステーブルの初期化
     */
    async initializeDatabase() {
        try {
            // パーミッション監査ログテーブルの作成
            await this.sqliteService.exec(`
        CREATE TABLE IF NOT EXISTS graph_permission_audit (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          user_email TEXT NOT NULL,
          operator_email TEXT NOT NULL,
          action TEXT NOT NULL,
          permission TEXT,
          permission_type TEXT,
          success INTEGER NOT NULL,
          error_message TEXT
        )
      `);
            // インデックスの作成
            await this.sqliteService.exec(`
        CREATE INDEX IF NOT EXISTS idx_graph_permission_audit_user_email 
        ON graph_permission_audit (user_email);
        
        CREATE INDEX IF NOT EXISTS idx_graph_permission_audit_timestamp 
        ON graph_permission_audit (timestamp);
      `);
            logger.logInfo({
                context: 'GraphPermissionService',
                message: 'データベーステーブル初期化成功'
            });
        }
        catch (error) {
            logger.logError(error, {
                context: 'GraphPermissionService',
                message: 'データベーステーブル初期化エラー'
            });
            throw error;
        }
    }
    /**
     * PowerShellスクリプトの実行
     * @param action 実行するアクション
     * @param userEmail 対象ユーザーのメールアドレス
     * @param permission パーミッション名
     * @param scope パーミッションのスコープ
     */
    async executePowerShellScript(action, userEmail, permission, scope) {
        try {
            const scriptPath = path_1.default.join(this.SCRIPTS_PATH, 'manage-graph-permissions.ps1');
            // スクリプトの存在確認
            if (!fs_1.default.existsSync(scriptPath)) {
                throw new Error(`スクリプトが見つかりません: ${scriptPath}`);
            }
            // コマンドの構築
            let command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -Action ${action} -UserEmail "${userEmail}"`;
            if (permission && (action === 'Grant' || action === 'Revoke')) {
                command += ` -Permission "${permission}"`;
            }
            if (scope && (action === 'Grant' || action === 'Revoke')) {
                command += ` -Scope "${scope}"`;
            }
            // スクリプトの実行
            const { stdout, stderr } = await execAsync(command);
            if (stderr) {
                logger.logError(new Error(stderr), {
                    context: 'GraphPermissionService',
                    message: 'PowerShellスクリプト実行エラー',
                    command
                });
                throw new Error(`PowerShellスクリプト実行エラー: ${stderr}`);
            }
            return stdout;
        }
        catch (error) {
            const err = error;
            logger.logError(err, {
                context: 'GraphPermissionService',
                message: 'PowerShellスクリプト実行エラー'
            });
            throw err;
        }
    }
    /**
     * 監査ログの記録
     * @param logEntry 監査ログエントリ
     */
    async logAudit(logEntry) {
        try {
            // データベースに監査ログを記録
            await this.sqliteService.run(`INSERT INTO graph_permission_audit (
          timestamp, user_email, operator_email, action, 
          permission, permission_type, success, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                logEntry.timestamp,
                logEntry.userEmail,
                logEntry.operatorEmail,
                logEntry.action,
                logEntry.permission || null,
                logEntry.permissionType || null,
                logEntry.success ? 1 : 0,
                logEntry.errorMessage || null
            ]);
            // 全体の監査ログにも記録
            await this.auditLogService.log({
                userId: logEntry.operatorEmail,
                action: logEntry.action === 'grant' ? 'GRANT' : (logEntry.action === 'revoke' ? 'REVOKE' : 'LIST'),
                type: auditLogService_1.AuditLogType.API_PERMISSION_CHANGE,
                targetUserId: logEntry.userEmail,
                details: {
                    permission: logEntry.permission || 'all_permissions',
                    permissionType: logEntry.permissionType,
                    success: logEntry.success,
                    errorMessage: logEntry.errorMessage,
                    reason: `Graph API ${logEntry.action} operation for ${logEntry.userEmail}`
                }
            });
            logger.logInfo({
                context: 'GraphPermissionService',
                message: '監査ログ記録成功',
                details: {
                    userEmail: logEntry.userEmail,
                    action: logEntry.action,
                    success: logEntry.success
                }
            });
        }
        catch (error) {
            logger.logError(error, {
                context: 'GraphPermissionService',
                message: '監査ログ記録エラー'
            });
        }
    }
    /**
     * ユーザーにパーミッションを付与
     * @param userEmail 対象ユーザーのメールアドレス
     * @param permission 付与するパーミッション
     * @param scope パーミッションのスコープ
     * @param operatorEmail 操作者のメールアドレス
     */
    async grantPermission(userEmail, permission, scope, operatorEmail) {
        try {
            // PowerShellスクリプトの実行
            const output = await this.executePowerShellScript('Grant', userEmail, permission, scope);
            // 監査ログの記録
            await this.logAudit({
                timestamp: new Date().toISOString(),
                userEmail,
                operatorEmail,
                action: 'grant',
                permission,
                permissionType: scope,
                success: true
            });
            return {
                success: true,
                message: `パーミッション ${permission} (${scope}) をユーザー ${userEmail} に付与しました`,
                details: { output }
            };
        }
        catch (error) {
            const err = error;
            // 監査ログの記録（失敗）
            await this.logAudit({
                timestamp: new Date().toISOString(),
                userEmail,
                operatorEmail,
                action: 'grant',
                permission,
                permissionType: scope,
                success: false,
                errorMessage: err.message
            });
            return {
                success: false,
                message: `パーミッション付与エラー: ${err.message}`,
                details: { error: err }
            };
        }
    }
    /**
     * ユーザーからパーミッションを削除
     * @param userEmail 対象ユーザーのメールアドレス
     * @param permission 削除するパーミッション
     * @param scope パーミッションのスコープ
     * @param operatorEmail 操作者のメールアドレス
     */
    async revokePermission(userEmail, permission, scope, operatorEmail) {
        try {
            // PowerShellスクリプトの実行
            const output = await this.executePowerShellScript('Revoke', userEmail, permission, scope);
            // 監査ログの記録
            await this.logAudit({
                timestamp: new Date().toISOString(),
                userEmail,
                operatorEmail,
                action: 'revoke',
                permission,
                permissionType: scope,
                success: true
            });
            return {
                success: true,
                message: `パーミッション ${permission} (${scope}) をユーザー ${userEmail} から削除しました`,
                details: { output }
            };
        }
        catch (error) {
            const err = error;
            // 監査ログの記録（失敗）
            await this.logAudit({
                timestamp: new Date().toISOString(),
                userEmail,
                operatorEmail,
                action: 'revoke',
                permission,
                permissionType: scope,
                success: false,
                errorMessage: err.message
            });
            return {
                success: false,
                message: `パーミッション削除エラー: ${err.message}`,
                details: { error: err }
            };
        }
    }
    /**
     * ユーザーのパーミッション一覧を取得
     * @param userEmail 対象ユーザーのメールアドレス
     * @param operatorEmail 操作者のメールアドレス
     */
    async listPermissions(userEmail, operatorEmail) {
        try {
            // PowerShellスクリプトの実行
            const output = await this.executePowerShellScript('List', userEmail);
            // 出力からパーミッション情報を抽出
            const permissions = [];
            const lines = output.split('\n');
            let currentPermission = null;
            for (const line of lines) {
                const trimmedLine = line.trim();
                // パーミッション行の検出
                if (trimmedLine.startsWith('- ')) {
                    // 前のパーミッションがあれば追加
                    if (currentPermission && currentPermission.id && currentPermission.value) {
                        permissions.push(currentPermission);
                    }
                    // 新しいパーミッション情報の開始
                    const permissionMatch = trimmedLine.match(/- (.*?) \((.*?)\)/);
                    if (permissionMatch) {
                        currentPermission = {
                            value: permissionMatch[1],
                            type: permissionMatch[2]
                        };
                    }
                }
                // 説明行の検出
                else if (trimmedLine.startsWith('説明:') && currentPermission) {
                    currentPermission.description = trimmedLine.substring('説明:'.length).trim();
                }
                // ID行の検出
                else if (trimmedLine.startsWith('ID:') && currentPermission) {
                    currentPermission.id = trimmedLine.substring('ID:'.length).trim();
                }
            }
            // 最後のパーミッションを追加
            if (currentPermission && currentPermission.id && currentPermission.value) {
                permissions.push(currentPermission);
            }
            // 監査ログの記録
            await this.logAudit({
                timestamp: new Date().toISOString(),
                userEmail,
                operatorEmail,
                action: 'list',
                success: true
            });
            return permissions;
        }
        catch (error) {
            const err = error;
            // 監査ログの記録（失敗）
            await this.logAudit({
                timestamp: new Date().toISOString(),
                userEmail,
                operatorEmail,
                action: 'list',
                success: false,
                errorMessage: err.message
            });
            logger.logError(err, {
                context: 'GraphPermissionService',
                message: 'パーミッション一覧取得エラー',
                userEmail
            });
            return [];
        }
    }
    /**
     * パーミッション監査ログの取得
     * @param userEmail 対象ユーザーのメールアドレス（オプション）
     * @param limit 取得する最大件数
     * @param offset オフセット
     */
    async getPermissionAuditLogs(userEmail, limit = 100, offset = 0) {
        try {
            let query = `
        SELECT 
          id, timestamp, user_email, operator_email, action, 
          permission, permission_type, success, error_message
        FROM graph_permission_audit
      `;
            const params = [];
            if (userEmail) {
                query += ' WHERE user_email = ?';
                params.push(userEmail);
            }
            query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            const logs = await this.sqliteService.all(query, params);
            return logs.map(log => ({
                id: typeof log.id === 'string' ? parseInt(log.id, 10) : log.id, // 文字列の場合は数値に変換
                timestamp: log.timestamp,
                userEmail: log.user_email,
                operatorEmail: log.operator_email,
                action: log.action,
                permission: log.permission,
                permissionType: log.permission_type,
                success: log.success === 1,
                errorMessage: log.error_message
            }));
        }
        catch (error) {
            logger.logError(error, {
                context: 'GraphPermissionService',
                message: '監査ログ取得エラー'
            });
            return [];
        }
    }
    /**
     * 利用可能なGraph APIパーミッションの一覧を取得
     */
    async getAvailablePermissions() {
        try {
            // Microsoft Graphサービスプリンシパルの取得
            const servicePrincipal = await this.graphClient
                .api(`/servicePrincipals?$filter=appId eq '${this.GRAPH_SERVICE_PRINCIPAL_ID}'`)
                .get();
            if (!servicePrincipal.value || servicePrincipal.value.length === 0) {
                throw new Error('Microsoft Graphサービスプリンシパルが見つかりません');
            }
            const graphSP = servicePrincipal.value[0];
            const permissions = [];
            // アプリケーションパーミッション（ロール）の取得
            if (graphSP.appRoles) {
                for (const role of graphSP.appRoles) {
                    permissions.push({
                        id: role.id,
                        value: role.value,
                        type: 'Application',
                        displayName: role.displayName,
                        description: role.description
                    });
                }
            }
            // 委任パーミッション（スコープ）の取得
            if (graphSP.oauth2PermissionScopes) {
                for (const scope of graphSP.oauth2PermissionScopes) {
                    permissions.push({
                        id: scope.id,
                        value: scope.value,
                        type: 'Delegated',
                        displayName: scope.adminConsentDisplayName,
                        description: scope.adminConsentDescription
                    });
                }
            }
            return permissions;
        }
        catch (error) {
            logger.logError(error, {
                context: 'GraphPermissionService',
                message: '利用可能なパーミッション取得エラー'
            });
            return [];
        }
    }
}
exports.GraphPermissionService = GraphPermissionService;
exports.default = GraphPermissionService;
//# sourceMappingURL=graphPermissionService.js.map