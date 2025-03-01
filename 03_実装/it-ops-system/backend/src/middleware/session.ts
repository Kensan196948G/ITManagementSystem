import { Request, Response, NextFunction } from 'express';
import { TokenVerificationResult } from '@/types/auth';
import { validateToken } from '@/utils/tokenUtils';
import { PermissionService } from '@/services/permissionService';
import { createError, ErrorCode } from '@/types/errors';
import LoggingService from '@/services/loggingService';

const logger = LoggingService.getInstance();
const permissionService = PermissionService.getInstance();

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw createError(ErrorCode.AUTH_TOKEN_MISSING, 'トークンが見つかりません', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw createError(ErrorCode.AUTH_TOKEN_MISSING, 'トークンが見つかりません', 401);
    }

    let decoded: TokenVerificationResult;
    try {
      decoded = validateToken(token);
    } catch (tokenError) {
      throw createError(ErrorCode.AUTH_TOKEN_INVALID, '無効なトークンです', 401);
    }

    if (!decoded.valid || !decoded.userId) {
      throw createError(ErrorCode.AUTH_TOKEN_INVALID, '無効なトークンです', 401);
    }

    // トークンからユーザー情報を取得
    const userInfo = await permissionService.getUserInfo(decoded.userId);
    if (!userInfo) {
      throw createError(ErrorCode.AD_USER_NOT_FOUND, 'ユーザーが見つかりません', 401);
    }

    // ユーザー情報をリクエストに設定
    (req as any).user = {
      id: decoded.userId,
      email: userInfo.email,
      username: userInfo.username,
      roles: userInfo.roles
    };

    // 必要なグループのバリデーション
    const isValid = await permissionService.validateRequiredGroups(userInfo.email);
    if (!isValid) {
      throw createError(ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS, '必要な権限がありません', 403);
    }

    next();
  } catch (error) {
    const statusCode = (error as any).statusCode || 401;
    logger.logError(error as Error, {
      context: 'Auth',
      message: '認証エラー'
    });

    res.status(statusCode).json({
      status: 'error',
      message: (error as Error).message
    });
  }
}