import { Request, Response, NextFunction } from 'express';
import { AuditError } from '../errors/AuditError';
import LoggingService from '../services/loggingService';

const logger = LoggingService.getInstance();

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // AuditError系の場合は、対応するステータスコードとエラーメッセージを返す
  if (error instanceof AuditError) {
    logger.logError(error, {
      context: 'ErrorHandler',
      code: error.code,
      details: error.details
    });

    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details
    });
  }

  // 予期せぬエラーの場合
  logger.logError(error, {
    context: 'ErrorHandler',
    path: req.path,
    method: req.method
  });

  return res.status(500).json({
    error: '予期せぬエラーが発生しました',
    code: 'INTERNAL_SERVER_ERROR'
  });
};