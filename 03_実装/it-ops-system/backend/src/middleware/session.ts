import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { validateToken } from '../utils/tokenUtils';
import { PermissionError } from '../types/errors';
import { PermissionService } from '../services/permissionService';

const permissionService = PermissionService.getInstance();

export const sessionMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    throw new PermissionError('認証が必要です', 'UNAUTHORIZED');
  }

  try {
    const decoded = await validateToken(token);
    req.user = decoded;
    
    // セッションの有効性を確認
    const isValid = await permissionService.validateRequiredGroups(decoded.email);
    if (!isValid) {
      throw new PermissionError('セッションが無効です', 'INVALID_SESSION');
    }

    next();
  } catch (error) {
    next(new PermissionError('セッションの検証に失敗しました', 'SESSION_VALIDATION_FAILED'));
  }
};