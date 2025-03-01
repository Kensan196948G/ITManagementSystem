import { UserRole } from '../types/system';
import { SQLiteService } from './sqliteService';
import LoggingService from './loggingService';

const logger = LoggingService.getInstance();

export class PermissionService {
  private static instance: PermissionService;
  private sqlite: SQLiteService;

  private constructor() {
    this.sqlite = SQLiteService.getInstance();
  }

  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

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

  public async checkPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
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

  private async getRequiredGroups(permissionKey: string): Promise<string[]> {
    try {
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
}