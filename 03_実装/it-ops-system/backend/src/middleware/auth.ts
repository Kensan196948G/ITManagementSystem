import express from 'express';
import jwt from 'jsonwebtoken';
import { AuthUser } from '../types/system';
import { ErrorCode, createError } from '../types/errors';
import { TokenManager } from '../services/tokenManager';

export const verifyToken = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    next(createError(
      ErrorCode.AUTH_TOKEN_MISSING,
      'No token provided',
      401
    ));
    return;
  }

  try {
    const isBlacklisted = await TokenManager.isTokenBlacklisted(token);
    if (isBlacklisted) {
      next(createError(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Token has been invalidated',
        401
      ));
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(createError(
        ErrorCode.AUTH_TOKEN_EXPIRED,
        'Token has expired',
        401
      ));
    } else {
      next(createError(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Invalid token',
        401
      ));
    }
  }
};