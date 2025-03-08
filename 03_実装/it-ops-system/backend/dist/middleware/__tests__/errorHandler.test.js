"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const errorHandler_1 = require("../errorHandler");
const AuditError_1 = require("../../errors/AuditError");
const loggingService_1 = __importDefault(require("../../services/loggingService"));
jest.mock('../../services/loggingService');
describe('Error Handler Middleware Tests', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    beforeEach(() => {
        mockReq = {};
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();
    });
    it('バリデーションエラーを適切に処理すること', () => {
        const error = new AuditError_1.AuditValidationError('Invalid input', {
            field: 'email',
            message: 'Invalid format'
        });
        (0, errorHandler_1.errorHandler)(error, mockReq, mockRes, mockNext);
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
        const error = new AuditError_1.AuditPermissionError('Permission denied');
        (0, errorHandler_1.errorHandler)(error, mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Permission denied',
            code: 'PERMISSION_DENIED'
        });
    });
    it('Not Foundエラーを適切に処理すること', () => {
        const error = new AuditError_1.AuditNotFoundError('Record not found');
        (0, errorHandler_1.errorHandler)(error, mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Record not found',
            code: 'NOT_FOUND'
        });
    });
    it('データベースエラーを適切に処理すること', () => {
        const error = new AuditError_1.AuditDatabaseError('Database error', {
            query: 'SELECT * FROM table',
            error: 'Connection failed'
        });
        (0, errorHandler_1.errorHandler)(error, mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Database error',
            code: 'DATABASE_ERROR'
        });
        // 機密情報は公開しない
        expect(mockRes.json).not.toHaveBeenCalledWith(expect.objectContaining({
            details: expect.anything()
        }));
    });
    it('一般的なエラーを適切に処理すること', () => {
        const error = new Error('Unknown error');
        (0, errorHandler_1.errorHandler)(error, mockReq, mockRes, mockNext);
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
        (0, errorHandler_1.errorHandler)(error, mockReq, mockRes, mockNext);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            stack: 'Error stack trace'
        }));
        process.env.NODE_ENV = originalEnv;
    });
    it('エラーをロギングサービスに記録すること', () => {
        const error = new Error('Test error');
        (0, errorHandler_1.errorHandler)(error, mockReq, mockRes, mockNext);
        expect(loggingService_1.default.getInstance().logError).toHaveBeenCalledWith(error, expect.any(Object));
    });
});
//# sourceMappingURL=errorHandler.test.js.map