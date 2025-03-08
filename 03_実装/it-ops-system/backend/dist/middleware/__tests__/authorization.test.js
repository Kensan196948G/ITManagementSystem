"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const authorization_1 = require("../authorization");
const authService_1 = require("../../services/authService");
const AuditError_1 = require("../../errors/AuditError");
jest.mock('../../services/authService');
describe('Authorization Middleware Tests', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let mockAuthService;
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
        };
        authService_1.AuthService.getInstance = jest.fn().mockReturnValue(mockAuthService);
    });
    describe('checkPermission', () => {
        it('権限があるユーザーをパスすること', async () => {
            const middleware = (0, authorization_1.checkPermission)('audit.read');
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockAuthService.hasPermission).toHaveBeenCalledWith('test-user', 'audit.read');
        });
        it('権限のないユーザーを拒否すること', async () => {
            mockAuthService.hasPermission.mockResolvedValueOnce(false);
            const middleware = (0, authorization_1.checkPermission)('audit.read');
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.any(String)
            }));
        });
        it('ユーザー情報がない場合を拒否すること', async () => {
            mockReq.user = undefined;
            const middleware = (0, authorization_1.checkPermission)('audit.read');
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });
    });
    describe('requirePermission', () => {
        it('権限があるユーザーをパスすること', async () => {
            const middleware = (0, authorization_1.requirePermission)('audit.read');
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('権限のないユーザーで例外をスローすること', async () => {
            mockAuthService.hasPermission.mockResolvedValueOnce(false);
            const middleware = (0, authorization_1.requirePermission)('audit.read');
            await expect(async () => {
                await middleware(mockReq, mockRes, mockNext);
            }).rejects.toThrow(AuditError_1.AuditPermissionError);
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('ユーザー情報がない場合に例外をスローすること', async () => {
            mockReq.user = undefined;
            const middleware = (0, authorization_1.requirePermission)('audit.read');
            await expect(async () => {
                await middleware(mockReq, mockRes, mockNext);
            }).rejects.toThrow(AuditError_1.AuditPermissionError);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
    describe('複数の権限チェック', () => {
        it('複数の権限を持つユーザーをパスすること', async () => {
            const middleware = (0, authorization_1.requirePermission)(['audit.read', 'audit.write']);
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockAuthService.hasPermission).toHaveBeenCalledTimes(2);
        });
        it('一部の権限が欠けている場合に例外をスローすること', async () => {
            mockAuthService.hasPermission
                .mockResolvedValueOnce(true) // audit.read
                .mockResolvedValueOnce(false); // audit.write
            const middleware = (0, authorization_1.requirePermission)(['audit.read', 'audit.write']);
            await expect(async () => {
                await middleware(mockReq, mockRes, mockNext);
            }).rejects.toThrow(AuditError_1.AuditPermissionError);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=authorization.test.js.map