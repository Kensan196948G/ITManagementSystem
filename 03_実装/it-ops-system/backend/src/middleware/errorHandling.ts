import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { ApplicationError, ErrorCode } from '../types/errors';

// Winstonロガーの設定
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: process.env.LOG_FILE_PATH || 'logs/error.log',
      level: 'error',
      maxsize: parseInt(process.env.LOG_MAX_SIZE || '10485760'), // 10MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '7')
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// リクエストログミドルウェア
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // レスポンス送信後のログ記録
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      type: 'request',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: (req as any).user?.id
    });
  });

  next();
};

// エラーログミドルウェア
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const error = err instanceof ApplicationError ? err : new ApplicationError(
    ErrorCode.UNEXPECTED_ERROR,
    err.message,
    500,
    { originalError: err }
  );

  logger.error({
    type: 'error',
    code: error.code,
    message: error.message,
    stack: error.stack,
    details: error.details,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id
  });

  next(error);
};

// エラーハンドラーミドルウェア
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  const error = err instanceof ApplicationError ? err : new ApplicationError(
    ErrorCode.UNEXPECTED_ERROR,
    err.message
  );

  // 本番環境ではスタックトレースを含めない
  const response = {
    ...error.toJSON(),
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
  };

  res.status(error.statusCode).json(response);
};