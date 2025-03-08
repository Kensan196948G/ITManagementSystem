"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const session_1 = require("../session");
const authService_1 = require("../../services/authService");
const redisService_1 = require("../../services/redisService");
const AuditError_1 = require("../../errors/AuditError");
jest.mock('../../services/authService');
jest.mock('../../services/redisService');
describe('Session Middleware Tests', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let mockAuthService;
    let mockRedisService;
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
        };
        mockRedisService = {
            get: jest.fn().mockResolvedValue('valid-session'),
            set: jest.fn().mockResolvedValue(true),
            delete: jest.fn().mockResolvedValue(true),
            getInstance: jest.fn().mockReturnThis()
        };
        authService_1.AuthService.getInstance = jest.fn().mockReturnValue(mockAuthService);
        redisService_1.RedisService.getInstance = jest.fn().mockReturnValue(mockRedisService);
    });
    describe('validateSession', () => {
        it('有効なセッションをパスすること', async () => {
            mockReq.headers.authorization = 'Bearer valid-token';
            await (0, session_1.validateSession)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.user).toBeDefined();
        });
        it('無効なトークンを拒否すること', async () => {
            mockReq.headers.authorization = 'Bearer invalid-token';
            mockAuthService.verifyToken.mockRejectedValueOnce(new Error('Invalid token'));
            await (0, session_1.validateSession)(mockReq, mockRes, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });
        it('無効なセッションを拒否すること', async () => {
            mockReq.headers.authorization = 'Bearer valid-token';
            mockRedisService.get.mockResolvedValueOnce(null);
            await (0, session_1.validateSession)(mockReq, mockRes, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });
        it('Authorization headerがない場合を拒否すること', async () => {
            await (0, session_1.validateSession)(mockReq, mockRes, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });
    });
    describe('refreshSession', () => {
        it('セッションを更新できること', async () => {
            mockReq.headers.authorization = 'Bearer valid-token';
            mockReq.user = { id: 'test-user' };
            await (0, session_1.refreshSession)(mockReq, mockRes, mockNext);
            expect(mockAuthService.refreshToken).toHaveBeenCalled();
            expect(mockRedisService.set).toHaveBeenCalled();
            expect(mockRes.setHeader).toHaveBeenCalledWith('X-Refresh-Token', 'new-token');
            expect(mockNext).toHaveBeenCalled();
        });
        it('ユーザー情報がない場合にエラーを返すこと', async () => {
            mockReq.headers.authorization = 'Bearer valid-token';
            mockReq.user = undefined;
            await expect((0, session_1.refreshSession)(mockReq, mockRes, mockNext))
                .rejects.toThrow(AuditError_1.AuditPermissionError);
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('トークン更新に失敗した場合にエラーを返すこと', async () => {
            mockReq.headers.authorization = 'Bearer valid-token';
            mockReq.user = { id: 'test-user' };
            mockAuthService.refreshToken.mockRejectedValueOnce(new Error('Refresh failed'));
            await (0, session_1.refreshSession)(mockReq, mockRes, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });
        it('セッション保存に失敗した場合にエラーを返すこと', async () => {
            mockReq.headers.authorization = 'Bearer valid-token';
            mockReq.user = { id: 'test-user' };
            mockRedisService.set.mockRejectedValueOnce(new Error('Save failed'));
            await (0, session_1.refreshSession)(mockReq, mockRes, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });
});
//# sourceMappingURL=session.test.js.map