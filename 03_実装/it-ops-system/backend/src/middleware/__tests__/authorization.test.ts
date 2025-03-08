import { Request, Response, NextFunction } from 'express';
import { checkPermission, requirePermission } from '../authorization';
import { AuthService } from '../../services/authService';
import { AuditPermissionError } from '../../errors/AuditError';

jest.mock('../../services/authService');

describe('Authorization Middleware Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    mockReq = {
      user: {
        id: 'test-user',
        email: 'test@example.com'
      }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();

    mockAuthService = {
      hasPermission: jest.fn().mockResolvedValue(true),
      getInstance: jest.fn().mockReturnThis()
    } as any;

    (AuthService as any).getInstance = jest.fn().mockReturnValue(mockAuthService);
  });

  describe('checkPermission', () => {
    it('権限があるユーザーをパスすること', async () => {
      const middleware = checkPermission('audit.read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockAuthService.hasPermission).toHaveBeenCalledWith(
        'test-user',
        'audit.read'
      );
    });

    it('権限のないユーザーを拒否すること', async () => {
      mockAuthService.hasPermission.mockResolvedValueOnce(false);
      const middleware = checkPermission('audit.read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it('ユーザー情報がない場合を拒否すること', async () => {
      mockReq.user = undefined;
      const middleware = checkPermission('audit.read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requirePermission', () => {
    it('権限があるユーザーをパスすること', async () => {
      const middleware = requirePermission('audit.read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('権限のないユーザーで例外をスローすること', async () => {
      mockAuthService.hasPermission.mockResolvedValueOnce(false);
      const middleware = requirePermission('audit.read');
      
      await expect(async () => {
        await middleware(mockReq as Request, mockRes as Response, mockNext);
      }).rejects.toThrow(AuditPermissionError);
      
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('ユーザー情報がない場合に例外をスローすること', async () => {
      mockReq.user = undefined;
      const middleware = requirePermission('audit.read');
      
      await expect(async () => {
        await middleware(mockReq as Request, mockRes as Response, mockNext);
      }).rejects.toThrow(AuditPermissionError);
      
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('複数の権限チェック', () => {
    it('複数の権限を持つユーザーをパスすること', async () => {
      const middleware = requirePermission(['audit.read', 'audit.write']);
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockAuthService.hasPermission).toHaveBeenCalledTimes(2);
    });

    it('一部の権限が欠けている場合に例外をスローすること', async () => {
      mockAuthService.hasPermission
        .mockResolvedValueOnce(true)  // audit.read
        .mockResolvedValueOnce(false); // audit.write
      
      const middleware = requirePermission(['audit.read', 'audit.write']);
      
      await expect(async () => {
        await middleware(mockReq as Request, mockRes as Response, mockNext);
      }).rejects.toThrow(AuditPermissionError);
      
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});