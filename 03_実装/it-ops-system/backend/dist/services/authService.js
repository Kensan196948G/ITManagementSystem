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
            const isGlobalAdmin = memberOf.value.some((group) => group.roleTemplateId === "62e90394-69f5-4237-9190-012177145e10");
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
                'write:security': ['Security Administrator', 'IT-Ops-Security-Managers']
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
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map