import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import LoggingService from './loggingService';

const logger = LoggingService.getInstance();

interface UserRole {
  isGlobalAdmin: boolean;
  roles: string[];
  userGroups: string[];  // グループメンバーシップを追加
}

export class AuthService {
  private static instance: AuthService;
  private graphClient: Client;

  private constructor() {
    this.initializeGraphClient();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async initializeGraphClient(): Promise<void> {
    try {
      const credential = new ClientSecretCredential(
        process.env.AZURE_TENANT_ID!,
        process.env.AZURE_CLIENT_ID!,
        process.env.AZURE_CLIENT_SECRET!
      );

      const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        // Directory.Read.All の代わりに必要最小限の権限スコープを指定
        scopes: [
          'https://graph.microsoft.com/User.Read.All',
          'https://graph.microsoft.com/GroupMember.Read.All'
        ]
      });

      this.graphClient = Client.initWithMiddleware({
        authProvider
      });
    } catch (error) {
      const err = error as Error;
      logger.logError(err, {
        context: 'AuthService',
        message: 'Graph Client初期化エラー'
      });
      throw error;
    }
  }

  public async getUserRoles(userEmail: string): Promise<UserRole> {
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
        .filter((group: any) => group.securityEnabled)
        .map((group: any) => group.displayName);

      const roles = memberOf.value
        .filter((group: any) => group.roleTemplateId)
        .map((role: any) => role.displayName);

      // グローバル管理者の確認（roleTemplateId による判定）
      const isGlobalAdmin = memberOf.value.some((group: any) => 
        group.roleTemplateId === "62e90394-69f5-4237-9190-012177145e10"
      );

      return {
        isGlobalAdmin,
        roles,
        userGroups: securityGroups
      };
    } catch (error) {
      const err = error as Error;
      logger.logError(err, {
        context: 'AuthService',
        message: 'ユーザーロール取得エラー',
        userEmail
      });
      throw new Error(`ユーザーロール取得エラー: ${err.message}`);
    }
  }

  public async validateAccess(userEmail: string, requiredPermission: string): Promise<boolean> {
    try {
      const { isGlobalAdmin, roles, userGroups } = await this.getUserRoles(userEmail);
      
      // グローバル管理者は全ての権限を持つ
      if (isGlobalAdmin) {
        return true;
      }

      // 権限マッピングを拡張（セキュリティグループも含める）
      const permissionMap: { [key: string]: string[] } = {
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
    } catch (error) {
      logger.logError(error as Error, {
        context: 'AuthService',
        message: 'アクセス検証エラー',
        userEmail,
        requiredPermission
      });
      return false;
    }
  }
}