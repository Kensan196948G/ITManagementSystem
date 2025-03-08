"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const microsoft_graph_client_1 = require("@microsoft/microsoft-graph-client");
const identity_1 = require("@azure/identity");
const azureTokenCredentials_1 = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");
const loggingService_1 = __importDefault(require("./loggingService"));
const logger = loggingService_1.default.getInstance();
class AuthService {
    constructor() {
        // グローバル管理者のロールテンプレートID
        this.GLOBAL_ADMIN_ROLE_ID = "62e90394-69f5-4237-9190-012177145e10";
        // 推奨される Microsoft Graph API 権限
        this.RECOMMENDED_PERMISSIONS = [
            { id: 'Directory.Read.All', type: 'Role', name: 'ディレクトリデータの読み取り' },
            { id: 'User.Read.All', type: 'Role', name: 'すべてのユーザーのプロファイルの読み取り' },
            { id: 'GroupMember.Read.All', type: 'Role', name: 'すべてのグループのメンバーシップの読み取り' },
            { id: 'Application.ReadWrite.All', type: 'Role', name: 'アプリケーションの読み取りと書き込み' },
            { id: 'RoleManagement.ReadWrite.Directory', type: 'Role', name: 'ディレクトリロールの割り当て管理' },
            { id: 'Organization.Read.All', type: 'Role', name: '組織データの読み取り' }
        ];
        this.initializeGraphClient();
    }
    static getInstance() {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }
    async initializeGraphClient() {
        try {
            const credential = new identity_1.ClientSecretCredential(process.env.AZURE_TENANT_ID, process.env.AZURE_CLIENT_ID, process.env.AZURE_CLIENT_SECRET);
            const authProvider = new azureTokenCredentials_1.TokenCredentialAuthenticationProvider(credential, {
                // Directory.Read.All の代わりに必要最小限の権限スコープを指定
                scopes: [
                    'https://graph.microsoft.com/User.Read.All',
                    'https://graph.microsoft.com/GroupMember.Read.All'
                ]
            });
            this.graphClient = microsoft_graph_client_1.Client.initWithMiddleware({
                authProvider
            });
        }
        catch (error) {
            const err = error;
            logger.logError(err, {
                context: 'AuthService',
                message: 'Graph Client初期化エラー'
            });
            throw error;
        }
    }
    /**
     * ユーザーのロール情報を取得する
     * @param userEmail ユーザーのメールアドレス
     * @returns ユーザーのロール情報
     */
    async getUserRoles(userEmail) {
        try {
            // ユーザー情報の取得（Directory.Read.All の代わりに User.Read.All を使用）
            const user = await this.graphClient
                .api(`/users/${userEmail}`)
                .select('id,userPrincipalName,assignedLicenses')
                .get();
            // グループメンバーシップの取得（Directory.Read.All の代わりに GroupMember.Read.All を使用）
            const memberOf = await this.graphClient
                .api(`/users/${user.id}/transitiveMemberOf`)
                .select('displayName,roleTemplateId,securityEnabled')
                .get();
            // セキュリティグループとロールを分離
            const securityGroups = memberOf.value
                .filter((group) => group.securityEnabled)
                .map((group) => group.displayName);
            const roles = memberOf.value
                .filter((group) => group.roleTemplateId)
                .map((role) => role.displayName);
            // グローバル管理者の確認（roleTemplateId による判定）
            const isGlobalAdmin = memberOf.value.some((group) => group.roleTemplateId === this.GLOBAL_ADMIN_ROLE_ID);
            return {
                isGlobalAdmin,
                roles,
                userGroups: securityGroups
            };
        }
        catch (error) {
            const err = error;
            logger.logError(err, {
                context: 'AuthService',
                message: 'ユーザーロール取得エラー',
                userEmail
            });
            throw new Error(`ユーザーロール取得エラー: ${err.message}`);
        }
    }
    /**
     * ユーザーがグローバル管理者かどうかを確認する
     * @param userEmail ユーザーのメールアドレス
     * @returns グローバル管理者かどうか
     */
    async isGlobalAdmin(userEmail) {
        try {
            const roles = await this.getUserRoles(userEmail);
            return roles.isGlobalAdmin;
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuthService',
                message: 'グローバル管理者チェックエラー',
                userEmail
            });
            return false;
        }
    }
    /**
     * 特定の権限に対するアクセス権を検証する
     * @param userEmail ユーザーのメールアドレス
     * @param requiredPermission 必要な権限
     * @returns アクセス権があるかどうか
     */
    async validateAccess(userEmail, requiredPermission) {
        try {
            const { isGlobalAdmin, roles, userGroups } = await this.getUserRoles(userEmail);
            // グローバル管理者は全ての権限を持つ
            if (isGlobalAdmin) {
                return true;
            }
            // 権限マッピングを拡張（セキュリティグループも含める）
            const permissionMap = {
                'read:alerts': ['Helpdesk Administrator', 'Security Reader', 'IT-Ops-Alert-Readers'],
                'write:alerts': ['Security Administrator', 'IT-Ops-Alert-Managers'],
                'read:metrics': ['Reports Reader', 'IT-Ops-Metrics-Viewers'],
                'write:metrics': ['Reports Administrator', 'IT-Ops-Metrics-Managers'],
                'read:users': ['User Administrator', 'IT-Ops-User-Readers'],
                'write:users': ['User Administrator', 'IT-Ops-User-Managers'],
                'read:security': ['Security Reader', 'IT-Ops-Security-Viewers'],
                'write:security': ['Security Administrator', 'IT-Ops-Security-Managers'],
                // ダッシュボード関連の権限を追加
                'read:dashboard': ['Reports Reader', 'IT-Ops-Dashboard-Viewers'],
                'write:dashboard': ['Reports Administrator', 'IT-Ops-Dashboard-Managers'],
                'admin:dashboard': ['Global Administrator', 'IT-Ops-Dashboard-Admins'],
                // システム関連の権限を追加
                'read:system': ['IT-Ops-System-Viewers'],
                'write:system': ['IT-Ops-System-Managers'],
                'admin:system': ['Global Administrator', 'IT-Ops-System-Admins']
            };
            const requiredRoles = permissionMap[requiredPermission] || [];
            // ロールまたはセキュリティグループのいずれかで権限が付与されているかチェック
            return roles.some(role => requiredRoles.includes(role)) ||
                userGroups.some(group => requiredRoles.includes(group));
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuthService',
                message: 'アクセス検証エラー',
                userEmail,
                requiredPermission
            });
            return false;
        }
    }
    /**
     * ユーザーのMicrosoft Graph API権限を取得する
     * @param userEmail ユーザーのメールアドレス
     * @returns Microsoft権限情報
     */
    async getMicrosoftPermissions(userEmail) {
        try {
            // ユーザーがグローバル管理者かどうか確認
            const { isGlobalAdmin, roles } = await this.getUserRoles(userEmail);
            if (!isGlobalAdmin) {
                logger.logInfo({
                    message: 'MSPermissionsCheck - 非グローバル管理者がアクセス',
                    userEmail
                });
                // グローバル管理者でない場合は最低限の情報を返す
                return {
                    status: 'limited',
                    permissions: [],
                    missingPermissions: this.RECOMMENDED_PERMISSIONS.map(p => p.id),
                    accountStatus: 'limited_access',
                    roles: roles
                };
            }
            // アプリケーション（サービスプリンシパル）の情報を取得
            const app = await this.graphClient
                .api('/applications')
                .filter(`appId eq '${process.env.AZURE_CLIENT_ID}'`)
                .get();
            if (!app || !app.value || app.value.length === 0) {
                throw new Error('アプリケーション情報が見つかりません');
            }
            const appInfo = app.value[0];
            const currentPermissions = [];
            // 現在のアプリケーション権限を取得
            if (appInfo.requiredResourceAccess) {
                for (const resource of appInfo.requiredResourceAccess) {
                    for (const access of resource.resourceAccess) {
                        currentPermissions.push({
                            id: access.id,
                            type: access.type
                        });
                    }
                }
            }
            // 不足している権限を特定
            const missingPermissions = this.RECOMMENDED_PERMISSIONS
                .filter(recPerm => !currentPermissions.some(curPerm => curPerm.id === recPerm.id && curPerm.type === recPerm.type))
                .map(p => p.id);
            return {
                status: 'success',
                permissions: currentPermissions,
                missingPermissions,
                accountStatus: 'global_admin',
                roles
            };
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuthService',
                message: 'Microsoft権限チェックエラー',
                userEmail
            });
            return {
                status: 'error',
                permissions: [],
                missingPermissions: [],
                accountStatus: 'error',
                roles: []
            };
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map