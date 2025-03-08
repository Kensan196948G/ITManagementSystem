import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../errorHandler';
import {
  AuditError,
  AuditValidationError,
  AuditPermissionError,
  AuditNotFoundError,
  AuditDatabaseError
} from '../../errors/AuditError';
import LoggingService from '../../services/loggingService';

jest.mock('../../services/loggingService');

describe('Error Handler Middleware Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  it('バリデーションエラーを適切に処理すること', () => {
    const error = new AuditValidationError('Invalid input', {
      field: 'email',
      message: 'Invalid format'
    });

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid input',
      code: 'VALIDATION_ERROR',
      details: {
        field: 'email',
        message: 'Invalid format'
      }
    });
  });

  it('権限エラーを適切に処理すること', () => {
    const error = new AuditPermissionError('Permission denied');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Permission denied',
      code: 'PERMISSION_DENIED'
    });
  });

  it('Not Foundエラーを適切に処理すること', () => {
    const error = new AuditNotFoundError('Record not found');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Record not found',
      code: 'NOT_FOUND'
    });
  });

  it('データベースエラーを適切に処理すること', () => {
    const error = new AuditDatabaseError('Database error', {
      query: 'SELECT * FROM table',
      error: 'Connection failed'
    });

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Database error',
      code: 'DATABASE_ERROR'
    });
    // 機密情報は公開しない
    expect(mockRes.json).not.toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.anything()
      })
    );
  });

  it('一般的なエラーを適切に処理すること', () => {
    const error = new Error('Unknown error');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  });

  it('開発環境でスタックトレースを含めること', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Test error');
    error.stack = 'Error stack trace';

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        stack: 'Error stack trace'
      })
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('エラーをロギングサービスに記録すること', () => {
    const error = new Error('Test error');
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(LoggingService.getInstance().logError).toHaveBeenCalledWith(
      error,
      expect.any(Object)
    );
  });
});