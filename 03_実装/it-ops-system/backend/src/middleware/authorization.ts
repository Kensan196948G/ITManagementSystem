import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../services/permissionService';
import { AuthService } from '../services/authService';
import { createError, ErrorCode } from '../types/errors';
import LoggingService from '../services/loggingService';
import { AuthorizationLevel } from '../types/authorization';

const logger = LoggingService.getInstance();
// 循環参照を避けるために、遅延初期化を使用
let permissionService: PermissionService;
let authService: AuthService;

function getPermissionService(): PermissionService {
  if (!permissionService) {
    permissionService = PermissionService.getInstance();
  }
  return permissionService;
}

function getAuthService(): AuthService {
  if (!authService) {
    authService = AuthService.getInstance();
  }
  return authService;
}

/**
 * 特定の権限レベルを要求するミドルウェア
 * @param level 必要な権限レベル
 */
export const requireAuthLevel = (level: AuthorizationLevel) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return next(createError(
          ErrorCode.AUTH_UNAUTHORIZED,
          '認証されていないユーザーです',
          401
        ));
      }

      const userInfo = await getPermissionService().getUserInfo(req.user.id);
      if (!userInfo) {
        return next(createError(
          ErrorCode.AD_USER_NOT_FOUND,
          'ユーザー情報が見つかりません',
          404
        ));
      }

      // ユーザーロールを取得
      const roles = await getAuthService().getUserRoles(userInfo.email);

      let authorized = false;
      switch (level) {
        case AuthorizationLevel.GLOBAL_ADMIN_ONLY:
          // グローバル管理者のみ許可
          authorized = roles.isGlobalAdmin;
          break;
          
        case AuthorizationLevel.ADMIN_ROLE:
          // 管理者権限があるか、グローバル管理者であれば許可
          authorized = roles.isGlobalAdmin || 
            roles.roles.some(role => role.includes(':admin') || role.includes(':write'));
          break;
          
        case AuthorizationLevel.USER_ROLE:
          // 何らかの権限（読み取りも含む）があれば許可
          authorized = roles.isGlobalAdmin || roles.roles.length > 0;
          break;
          
        case AuthorizationLevel.AUTHENTICATED:
          // 認証されていれば許可（すでにverifyTokenを通過しているため）
          authorized = true;
          break;
          
        default:
          authorized = false;
      }

      if (!authorized) {
        logger.logSecurity({
          userId: req.user.id,
          event: 'authorization',
          severity: 'medium',
          details: {
            requiredLevel: level,
            userRoles: roles,
            path: req.path,
            method: req.method
          }
        });

        return next(createError(
          ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
          '必要な権限がありません',
          403
        ));
      }

      next();
    } catch (error) {
      logger.logError(error as Error, {
        context: 'Authorization',
        message: '権限チェック中にエラーが発生しました',
        details: {
          path: req.path,
          method: req.method,
          userId: req.user?.id
        }
      });
      
      next(createError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        '権限の確認中にエラーが発生しました',
        500
      ));
    }
  };
};

/**
 * 特定のリソースへのアクセス権を確認するミドルウェア
 * @param resource リソース名
 * @param action アクション（read, write, adminなど）
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return next(createError(
          ErrorCode.AUTH_UNAUTHORIZED,
          '認証されていないユーザーです',
          401
        ));
      }

      const userInfo = await getPermissionService().getUserInfo(req.user.id);
      if (!userInfo) {
        return next(createError(
          ErrorCode.AD_USER_NOT_FOUND,
          'ユーザー情報が見つかりません',
          404
        ));
      }

      // 権限チェック
      const hasPermission = await getPermissionService().checkPermission(
        userInfo.email,
        resource,
        action
      );

      if (!hasPermission) {
        logger.logSecurity({
          userId: req.user.id,
          event: 'permission_check',
          severity: 'medium',
          details: {
            resource,
            action,
            path: req.path,
            method: req.method
          }
        });

        return next(createError(
          ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
          `リソース ${resource} に対する ${action} 権限がありません`,
          403
        ));
      }

      next();
    } catch (error) {
      logger.logError(error as Error, {
        context: 'Permission',
        message: '権限チェック中にエラーが発生しました',
        details: {
          resource,
          action,
          path: req.path,
          method: req.method,
          userId: req.user?.id
        }
      });
      
      next(createError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        '権限の確認中にエラーが発生しました',
        500
      ));
    }
  };
};

/**
 * グローバル管理者専用の機能へのアクセスを制限するミドルウェア
 */
export const requireGlobalAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return next(createError(
        ErrorCode.AUTH_UNAUTHORIZED,
        '認証されていないユーザーです',
        401
      ));
    }

    const userInfo = await getPermissionService().getUserInfo(req.user.id);
    if (!userInfo) {
      return next(createError(
        ErrorCode.AD_USER_NOT_FOUND,
        'ユーザー情報が見つかりません',
        404
      ));
    }

    // グローバル管理者かどうかを確認
    const roles = await getAuthService().getUserRoles(userInfo.email);
    
    if (!roles.isGlobalAdmin) {
      logger.logSecurity({
        userId: req.user.id,
        event: 'global_admin_access',
        severity: 'high',
        details: {
          path: req.path,
          method: req.method
        }
      });

      return next(createError(
        ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
        'この機能にはグローバル管理者権限が必要です',
        403
      ));
    }

    next();
  } catch (error) {
    logger.logError(error as Error, {
      context: 'GlobalAdmin',
      message: 'グローバル管理者チェック中にエラーが発生しました',
      details: {
        path: req.path,
        method: req.method,
        userId: req.user?.id
      }
    });
    
    next(createError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      '権限の確認中にエラーが発生しました',
      500
    ));
  }
};

/**
 * ユーザーのMicrosoft権限情報をリクエストに追加するミドルウェア
 * パフォーマンスを考慮して、必要な場合にのみ使用してください
 */
export const attachMicrosoftPermissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return next(createError(
        ErrorCode.AUTH_UNAUTHORIZED,
        '認証されていないユーザーです',
        401
      ));
    }

    const userInfo = await getPermissionService().getUserInfo(req.user.id);
    if (!userInfo) {
      return next(createError(
        ErrorCode.AD_USER_NOT_FOUND,
        'ユーザー情報が見つかりません',
        404
      ));
    }

    // Microsoft Graph API 権限情報を取得
    const msPermissions = await getAuthService().getMicrosoftPermissions(userInfo.email);
    
    // リクエストオブジェクトに権限情報を追加
    (req as any).msPermissions = msPermissions;
    
    next();
  } catch (error) {
    logger.logError(error as Error, {
      context: 'MSPermissions',
      message: 'Microsoft権限情報の取得中にエラーが発生しました',
      details: {
        path: req.path,
        method: req.method,
        userId: req.user?.id
      }
    });
    
    // エラーがあっても処理は続行（権限情報はオプショナル）
    next();
  }
};