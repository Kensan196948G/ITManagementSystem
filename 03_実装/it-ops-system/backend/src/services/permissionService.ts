import { UserRole } from '../types/system';
import { SQLiteService } from './sqliteService';
import LoggingService from './loggingService';
import { AuthService } from './authService';
import { AuthorizationLevel } from '../types/authorization';

const logger = LoggingService.getInstance();

// リソースごとの操作権限定義（フロントエンドと同期）
export const ResourcePermissions = {
  // ダッシュボード関連
  DASHBOARD: {
    VIEW: 'dashboard:read',
    EDIT: 'dashboard:write',
    ADMIN: 'dashboard:admin',
  },
  
  // メトリクス関連
  METRICS: {
    VIEW: 'metrics:read',
    EDIT: 'metrics:write',
    ADMIN: 'metrics:admin',
  },
  
  // セキュリティ関連
  SECURITY: {
    VIEW: 'security:read',
    EDIT: 'security:write',
    ADMIN: 'security:admin',
  },
  
  // ユーザー管理関連
  USERS: {
    VIEW: 'users:read',
    EDIT: 'users:write',
    ADMIN: 'users:admin',
  },
  
  // システム設定関連
  SYSTEM: {
    VIEW: 'system:read',
    EDIT: 'system:write',
    ADMIN: 'system:admin',
  },
};

// 権限マッピングの定義
const permissionMappings: Record<string, string[]> = {
  // ダッシュボード権限
  'dashboard:read': ['IT-Ops-Dashboard-Viewers', 'Reports Reader'],
  'dashboard:write': ['IT-Ops-Dashboard-Managers', 'Reports Administrator'],
  'dashboard:admin': ['IT-Ops-Dashboard-Admins', 'Global Administrator'],

  // メトリクス権限
  'metrics:read': ['IT-Ops-Metrics-Viewers', 'Reports Reader'],
  'metrics:write': ['IT-Ops-Metrics-Managers', 'Reports Administrator'],
  'metrics:admin': ['IT-Ops-Metrics-Admins', 'Global Administrator'],

  // セキュリティ権限
  'security:read': ['IT-Ops-Security-Viewers', 'Security Reader'],
  'security:write': ['IT-Ops-Security-Managers', 'Security Administrator'],
  'security:admin': ['IT-Ops-Security-Admins', 'Global Administrator'],

  // ユーザー管理権限
  'users:read': ['IT-Ops-User-Readers', 'User Administrator'],
  'users:write': ['IT-Ops-User-Managers', 'User Administrator'],
  'users:admin': ['IT-Ops-User-Admins', 'Global Administrator'],

  // システム設定権限
  'system:read': ['IT-Ops-System-Viewers'],
  'system:write': ['IT-Ops-System-Managers'],
  'system:admin': ['IT-Ops-System-Admins', 'Global Administrator']
};

export class PermissionService {
  private static instance: PermissionService;
  private sqlite: SQLiteService;
  private authService: AuthService;

  private constructor() {
    this.sqlite = SQLiteService.getInstance();
    this.authService = AuthService.getInstance();
  }

  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  /**
   * ユーザー情報を取得する
   * @param userId ユーザーID
   * @returns ユーザー情報（メールアドレス、ユーザー名、ロール）
   */
  public async getUserInfo(userId: string): Promise<{
    email: string;
    username: string;
    roles: string[];
  } | null> {
    try {
      const userInfo = await this.sqlite.get<{
        email: string;
        username: string;
        roles: string;
      }>('SELECT email, username, roles FROM users WHERE id = ?', [userId]);

      if (!userInfo) {
        logger.logAccess({
          userId,
          action: 'getUserInfo',
          resource: 'users',
          result: 'failure',
          ip: '',
          userAgent: '',
          details: { reason: 'User not found' }
        });
        return null;
      }

      let roles: string[] = [];
      try {
        roles = JSON.parse(userInfo.roles);
      } catch (parseError) {
        logger.logError(parseError as Error, {
          context: 'PermissionService',
          message: 'Failed to parse user roles',
          userId
        });
      }

      return {
        email: userInfo.email,
        username: userInfo.username,
        roles
      };
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionService',
        message: 'Failed to fetch user info',
        userId
      });
      return null;
    }
  }

  /**
   * 必要なグループの所属を検証する
   * @param email ユーザーのメールアドレス
   * @returns グループ所属が有効かどうか
   */
  public async validateRequiredGroups(email: string): Promise<boolean> {
    try {
      const groups = await this.sqlite.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM user_groups WHERE user_email = ?',
        [email]
      );
      
      if (!groups || groups.count === 0) {
        logger.logSecurity({
          userId: email,
          event: 'validateRequiredGroups',
          severity: 'low',
          details: { message: 'User is not part of any groups' }
        });
        return false;
      }
      return true;
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionService',
        message: 'Group validation error',
        email
      });
      return false;
    }
  }

  /**
   * 特定のリソースとアクションに対する権限をチェックする
   * @param userId ユーザーIDまたはメールアドレス
   * @param resource リソース名
   * @param action アクション（read, write, admin）
   * @returns 権限があるかどうか
   */
  public async checkPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      // メールアドレスの場合はMicrosoft Graph APIを使用
      if (userId.includes('@')) {
        const userEmail = userId;
        const roles = await this.authService.getUserRoles(userEmail);
        
        // グローバル管理者は全ての権限を持つ
        if (roles.isGlobalAdmin) {
          return true;
        }

        const permissionKey = `${resource}:${action}`;
        const requiredGroups = permissionMappings[permissionKey] || [];
        
        if (requiredGroups.length === 0) {
          logger.logSecurity({
            userId: userEmail,
            event: 'checkPermission',
            severity: 'medium',
            details: { message: 'No required groups found', permissionKey }
          });
          return false;
        }

        // ユーザーのロールまたはグループのいずれかが必要なグループに含まれているか
        const hasPermission = 
          roles.roles.some(role => requiredGroups.includes(role)) ||
          roles.userGroups.some(group => requiredGroups.includes(group));

        if (!hasPermission) {
          logger.logSecurity({
            userId: userEmail,
            event: 'checkPermission',
            severity: 'high',
            details: { 
              message: 'Permission denied', 
              resource, 
              action,
              userRoles: roles.roles,
              userGroups: roles.userGroups,
              requiredGroups
            }
          });
        }

        return hasPermission;
      } 
      // それ以外の場合は従来の方法でチェック
      else {
        const userRoles = await this.getUserRoles(userId);
        if (!userRoles) {
          logger.logSecurity({
            userId,
            event: 'checkPermission',
            severity: 'medium',
            details: { message: 'No roles found', resource, action }
          });
          return false;
        }

        if (userRoles.isGlobalAdmin) {
          return true;
        }

        const permissionKey = `${resource}:${action}`;
        const requiredGroups = await this.getRequiredGroups(permissionKey);

        if (requiredGroups.length === 0) {
          logger.logSecurity({
            userId,
            event: 'checkPermission',
            severity: 'medium',
            details: { message: 'No required groups found', permissionKey }
          });
          return false;
        }

        const hasPermission = requiredGroups.some(group =>
          userRoles.permissions.includes(group)
        );

        if (!hasPermission) {
          logger.logSecurity({
            userId,
            event: 'checkPermission',
            severity: 'high',
            details: { message: 'Permission denied', resource, action }
          });
        }

        return hasPermission;
      }
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionService',
        message: 'Permission check error',
        userId,
        resource,
        action
      });
      return false;
    }
  }

  /**
   * ユーザーが特定の権限レベルを満たしているかチェック
   * @param userId ユーザーIDまたはメールアドレス
   * @param level 必要な権限レベル
   * @returns 権限レベルを満たしているかどうか
   */
  public async checkAuthorizationLevel(
    userId: string,
    level: AuthorizationLevel
  ): Promise<boolean> {
    try {
      // メールアドレスの場合はMicrosoft Graph APIを使用
      if (userId.includes('@')) {
        const userEmail = userId;
        const roles = await this.authService.getUserRoles(userEmail);

        switch (level) {
          case AuthorizationLevel.GLOBAL_ADMIN_ONLY:
            return roles.isGlobalAdmin;
          
          case AuthorizationLevel.ADMIN_ROLE:
            return roles.isGlobalAdmin || 
              roles.roles.some(role => role.includes(':admin') || role.includes(':write'));
          
          case AuthorizationLevel.USER_ROLE:
            return roles.isGlobalAdmin || roles.roles.length > 0;
          
          case AuthorizationLevel.AUTHENTICATED:
            return true;
          
          default:
            return false;
        }
      } 
      // それ以外の場合は従来の方法でチェック
      else {
        const userRoles = await this.getUserRoles(userId);
        if (!userRoles) {
          return level === AuthorizationLevel.AUTHENTICATED;
        }

        switch (level) {
          case AuthorizationLevel.GLOBAL_ADMIN_ONLY:
            return userRoles.isGlobalAdmin;
          
          case AuthorizationLevel.ADMIN_ROLE:
            return userRoles.isGlobalAdmin || 
              userRoles.permissions.some(perm => perm.includes(':admin') || perm.includes(':write'));
          
          case AuthorizationLevel.USER_ROLE:
            return userRoles.isGlobalAdmin || userRoles.permissions.length > 0;
          
          case AuthorizationLevel.AUTHENTICATED:
            return true;
          
          default:
            return false;
        }
      }
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionService',
        message: 'Authorization level check error',
        userId,
        level
      });
      
      // エラーが発生した場合はデフォルトでfalseを返す
      return false;
    }
  }

  /**
   * 特定の権限に必要なグループを取得
   * @param permissionKey 権限キー（例: "dashboard:read"）
   * @returns 必要なグループのリスト
   */
  private async getRequiredGroups(permissionKey: string): Promise<string[]> {
    try {
      // メモリ内のマッピングを優先チェック
      if (permissionMappings[permissionKey]) {
        return permissionMappings[permissionKey];
      }

      // データベースから検索
      const result = await this.sqlite.get<{ groups: string }>(
        'SELECT groups FROM permission_mappings WHERE permission_key = ?',
        [permissionKey]
      );

      if (!result) {
        logger.logSecurity({
          userId: 'system',
          event: 'getRequiredGroups',
          severity: 'low',
          details: { message: 'No permission mapping found', permissionKey }
        });
        return [];
      }

      try {
        return JSON.parse(result.groups);
      } catch (parseError) {
        logger.logError(parseError as Error, {
          context: 'PermissionService',
          message: 'Failed to parse required groups',
          permissionKey
        });
        return [];
      }
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionService',
        message: 'Failed to fetch required groups',
        permissionKey
      });
      return [];
    }
  }

  /**
   * ユーザーのロール情報を取得
   * @param userId ユーザーID
   * @returns ユーザーのロール情報
   */
  public async getUserRoles(userId: string): Promise<UserRole | null> {
    try {
      const result = await this.sqlite.get<{
        is_global_admin: number;
        permissions: string;
      }>(
        'SELECT is_global_admin, permissions FROM user_roles WHERE user_id = ?',
        [userId]
      );

      if (!result) {
        logger.logSecurity({
          userId,
          event: 'getUserRoles',
          severity: 'medium',
          details: { message: 'No roles found' }
        });
        return null;
      }

      let permissions: string[] = [];
      try {
        permissions = JSON.parse(result.permissions);
      } catch (parseError) {
        logger.logError(parseError as Error, {
          context: 'PermissionService',
          message: 'Failed to parse user permissions',
          userId
        });
      }

      return {
        isGlobalAdmin: result.is_global_admin === 1,
        permissions
      };
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionService',
        message: 'Failed to fetch user roles',
        userId
      });
      return null;
    }
  }

  /**
   * 権限マッピングを同期する（メモリ内のマッピングとDBを同期）
   */
  public async syncPermissionMappings(): Promise<void> {
    try {
      // メモリ内のマッピングをDBに反映
      for (const [key, groups] of Object.entries(permissionMappings)) {
        // 既に存在するかチェック
        const existing = await this.sqlite.get<{ id: number }>(
          'SELECT id FROM permission_mappings WHERE permission_key = ?',
          [key]
        );

        if (existing) {
          // 更新
          await this.sqlite.run(
            'UPDATE permission_mappings SET groups = ? WHERE permission_key = ?',
            [JSON.stringify(groups), key]
          );
        } else {
          // 新規作成
          await this.sqlite.run(
            'INSERT INTO permission_mappings (permission_key, groups) VALUES (?, ?)',
            [key, JSON.stringify(groups)]
          );
        }
      }

      logger.logInfo({
        message: 'Permission mappings synced successfully'
      });
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionService',
        message: 'Failed to sync permission mappings'
      });
    }
  }
}