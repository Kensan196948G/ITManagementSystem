"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const permissionAuditValidation_1 = require("../permissionAuditValidation");
jest.mock('../../services/loggingService');
describe('Permission Audit Validation Tests', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    beforeEach(() => {
        mockReq = {
            body: {},
            params: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();
    });
    describe('validateAuditFilter', () => {
        it('有効なフィルター条件を許可すること', async () => {
            mockReq.body = {
                startDate: '2024-01-01T00:00:00.000Z',
                endDate: '2024-01-02T00:00:00.000Z',
                actorEmail: 'actor@example.com',
                action: 'add'
            };
            await (0, permissionAuditValidation_1.validateAuditFilter)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('無効なメールアドレスを拒否すること', async () => {
            mockReq.body = {
                actorEmail: 'invalid-email'
            };
            await (0, permissionAuditValidation_1.validateAuditFilter)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.any(String)
            }));
        });
        it('無効なアクションタイプを拒否すること', async () => {
            mockReq.body = {
                action: 'invalid'
            };
            await (0, permissionAuditValidation_1.validateAuditFilter)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });
    describe('validateReview', () => {
        it('有効なレビューデータを許可すること', async () => {
            mockReq.body = {
                approved: true,
                comments: 'Valid comment'
            };
            await (0, permissionAuditValidation_1.validateReview)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('コメントが長すぎる場合を拒否すること', async () => {
            mockReq.body = {
                approved: true,
                comments: 'a'.repeat(1001)
            };
            await (0, permissionAuditValidation_1.validateReview)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
        it('必須フィールドが欠けている場合を拒否すること', async () => {
            mockReq.body = {
                approved: true
                // comments missing
            };
            await (0, permissionAuditValidation_1.validateReview)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });
    describe('validateEmail', () => {
        it('有効なメールアドレスを許可すること', async () => {
            mockReq.params = {
                email: 'test@example.com'
            };
            await (0, permissionAuditValidation_1.validateEmail)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('無効なメールアドレスを拒否すること', async () => {
            mockReq.params = {
                email: 'invalid-email'
            };
            await (0, permissionAuditValidation_1.validateEmail)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: '無効なメールアドレスです'
            }));
        });
    });
});
//# sourceMappingURL=permissionAuditValidation.test.js.map