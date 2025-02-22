import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { config } from '../config/config';
import LoggingService from './loggingService';

const logger = LoggingService.getInstance();

interface PermissionCheck {
  resource: string;
  action: 'read' | 'write';
}

interface UserPermissions {
  groups: string[];
  permissions: Set<string>;
}

export class PermissionService {
  private static instance: PermissionService;
  private graphClient: Client;
  private permissionCache: Map<string, UserPermissions> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分のキャッシュ

  private constructor() {
    this.initializeGraphClient();
  }

  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  private async initializeGraphClient(): Promise<void> {
    try {
      const credential = new ClientSecretCredential(
        process.env.AZURE_TENANT_ID!,
        process.env.AZURE_CLIENT_ID!,
        process.env.AZURE_CLIENT_SECRET!
      );

      const authProvider = new TokenCredentialAuthenticationProvider(credential, {
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
        context: 'PermissionService',
        message: 'Graph Client初期化エラー'
      });
      throw error;
    }
  }

  public async getUserPermissions(userEmail: string): Promise<UserPermissions> {
    const cached = this.permissionCache.get(userEmail);
    if (cached) {
      return cached;
    }

    try {
      const user = await this.graphClient
        .api(`/users/${userEmail}`)
        .select('id,userPrincipalName')
        .get();

      const memberOf = await this.graphClient
        .api(`/users/${user.id}/memberOf`)
        .select('displayName')
        .get();

      const groups = memberOf.value
        .map((group: any) => group.displayName)
        .filter((name: string) => name.startsWith(config.auth.securityGroupsPrefix));

      const permissions = this.calculatePermissions(groups);

      const userPermissions = {
        groups,
        permissions: new Set(permissions)
      };

      this.permissionCache.set(userEmail, userPermissions);
      setTimeout(() => {
        this.permissionCache.delete(userEmail);
      }, this.CACHE_TTL);

      return userPermissions;
    } catch (error) {
      const err = error as Error;
      logger.logError(err, {
        context: 'PermissionService',
        message: 'ユーザー権限取得エラー',
        userEmail
      });
      throw new Error(`ユーザー権限取得エラー: ${err.message}`);
    }
  }

  private calculatePermissions(groups: string[]): string[] {
    const permissions: string[] = [];
    const { requiredPermissions } = config.auth;

    Object.entries(requiredPermissions).forEach(([resource, actions]) => {
      if (typeof actions === 'object') {
        Object.entries(actions).forEach(([action, requiredGroups]) => {
          if (groups.some(group => requiredGroups.includes(group))) {
            permissions.push(`${resource}:${action}`);
          }
        });
      } else if (Array.isArray(actions)) {
        if (groups.some(group => actions.includes(group))) {
          permissions.push(resource);
        }
      }
    });

    return permissions;
  }

  public async checkPermission(userEmail: string, check: PermissionCheck): Promise<boolean> {
    try {
      const { permissions } = await this.getUserPermissions(userEmail);
      const requiredPermission = `${check.resource}:${check.action}`;
      
      return permissions.has(requiredPermission);
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionService',
        message: '権限チェックエラー',
        userEmail,
        check
      });
      return false;
    }
  }

  public async validateRequiredGroups(userEmail: string): Promise<boolean> {
    try {
      const { groups } = await this.getUserPermissions(userEmail);
      return config.auth.defaultGroups.every(group => groups.includes(group));
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionService',
        message: '必須グループ検証エラー',
        userEmail
      });
      return false;
    }
  }
}