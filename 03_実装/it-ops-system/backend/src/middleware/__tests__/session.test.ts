import { Request, Response, NextFunction } from 'express';
import { validateSession, refreshSession } from '../session';
import { AuthService } from '../../services/authService';
import { RedisService } from '../../services/redisService';
import { AuditPermissionError } from '../../errors/AuditError';

jest.mock('../../services/authService');
jest.mock('../../services/redisService');

describe('Session Middleware Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRedisService: jest.Mocked<RedisService>;

  beforeEach(() => {
    mockReq = {
      headers: {},
      session: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn()
    };
    mockNext = jest.fn();

    mockAuthService = {
      verifyToken: jest.fn().mockResolvedValue({ id: 'test-user' }),
      refreshToken: jest.fn().mockResolvedValue('new-token'),
      getInstance: jest.fn().mockReturnThis()
    } as any;

    mockRedisService = {
      get: jest.fn().mockResolvedValue('valid-session'),
      set: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
      getInstance: jest.fn().mockReturnThis()
    } as any;

    (AuthService as any).getInstance = jest.fn().mockReturnValue(mockAuthService);
    (RedisService as any).getInstance = jest.fn().mockReturnValue(mockRedisService);
  });

  describe('validateSession', () => {
    it('有効なセッションをパスすること', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      await validateSession(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
    });

    it('無効なトークンを拒否すること', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      mockAuthService.verifyToken.mockRejectedValueOnce(new Error('Invalid token'));
      
      await validateSession(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('無効なセッションを拒否すること', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      mockRedisService.get.mockResolvedValueOnce(null);
      
      await validateSession(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('Authorization headerがない場合を拒否すること', async () => {
      await validateSession(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('refreshSession', () => {
    it('セッションを更新できること', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      mockReq.user = { id: 'test-user' };
      
      await refreshSession(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockAuthService.refreshToken).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Refresh-Token',
        'new-token'
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('ユーザー情報がない場合にエラーを返すこと', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      mockReq.user = undefined;
      
      await expect(refreshSession(mockReq as Request, mockRes as Response, mockNext))
        .rejects.toThrow(AuditPermissionError);
      
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('トークン更新に失敗した場合にエラーを返すこと', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      mockReq.user = { id: 'test-user' };
      mockAuthService.refreshToken.mockRejectedValueOnce(new Error('Refresh failed'));
      
      await refreshSession(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('セッション保存に失敗した場合にエラーを返すこと', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      mockReq.user = { id: 'test-user' };
      mockRedisService.set.mockRejectedValueOnce(new Error('Save failed'));
      
      await refreshSession(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});