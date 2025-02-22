import { Request, Response, NextFunction } from 'express';
import { PermissionError, AuthenticationError, ErrorCode } from '../types/errors';
import LoggingService from '../services/loggingService';

const logger = LoggingService.getInstance();

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.logError(error, {
    context: 'ErrorHandler',
    path: req.path,
    method: req.method
  });

  if (error instanceof PermissionError) {
    return res.status(403).json({
      error: 'PermissionError',
      message: error.message,
      code: error.code
    });
  }

  if (error instanceof AuthenticationError) {
    return res.status(401).json({
      error: 'AuthenticationError',
      message: error.message,
      code: error.code
    });
  }

  // Microsoft Graph APIのエラーハンドリング
  if (error.message.includes('Graph API')) {
    return res.status(502).json({
      error: 'ExternalServiceError',
      message: 'Microsoft Graph APIとの通信中にエラーが発生しました',
      code: 'GRAPH_API_ERROR'
    });
  }

  // 一般的なエラー
  return res.status(500).json({
    error: 'InternalServerError',
    message: '内部サーバーエラーが発生しました',
    code: 'INTERNAL_SERVER_ERROR'
  });
};