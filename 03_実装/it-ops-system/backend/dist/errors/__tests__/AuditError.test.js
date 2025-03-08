"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AuditError_1 = require("../AuditError");
describe('Audit Error Classes', () => {
    describe('AuditError', () => {
        it('基本的なエラーメッセージと情報を保持すること', () => {
            const error = new AuditError_1.AuditError('Test error', 'TEST_ERROR', 400);
            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_ERROR');
            expect(error.statusCode).toBe(400);
            expect(error.name).toBe('AuditError');
        });
        it('追加の詳細情報を保持できること', () => {
            const details = { field: 'test', value: 123 };
            const error = new AuditError_1.AuditError('Test error', 'TEST_ERROR', 400, details);
            expect(error.details).toEqual(details);
        });
    });
    describe('AuditValidationError', () => {
        it('バリデーションエラー情報を正しく設定すること', () => {
            const details = { field: 'email', message: 'Invalid format' };
            const error = new AuditError_1.AuditValidationError('Validation failed', details);
            expect(error.message).toBe('Validation failed');
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.statusCode).toBe(400);
            expect(error.details).toEqual(details);
            expect(error.name).toBe('AuditValidationError');
        });
    });
    describe('AuditPermissionError', () => {
        it('権限エラー情報を正しく設定すること', () => {
            const error = new AuditError_1.AuditPermissionError('Permission denied');
            expect(error.message).toBe('Permission denied');
            expect(error.code).toBe('PERMISSION_DENIED');
            expect(error.statusCode).toBe(403);
            expect(error.name).toBe('AuditPermissionError');
        });
    });
    describe('AuditNotFoundError', () => {
        it('Not Foundエラー情報を正しく設定すること', () => {
            const error = new AuditError_1.AuditNotFoundError('Record not found');
            expect(error.message).toBe('Record not found');
            expect(error.code).toBe('NOT_FOUND');
            expect(error.statusCode).toBe(404);
            expect(error.name).toBe('AuditNotFoundError');
        });
    });
    describe('AuditDatabaseError', () => {
        it('データベースエラー情報を正しく設定すること', () => {
            const details = { sql: 'SELECT * FROM test', error: 'Connection failed' };
            const error = new AuditError_1.AuditDatabaseError('Database error', details);
            expect(error.message).toBe('Database error');
            expect(error.code).toBe('DATABASE_ERROR');
            expect(error.statusCode).toBe(500);
            expect(error.details).toEqual(details);
            expect(error.name).toBe('AuditDatabaseError');
        });
    });
});
//# sourceMappingURL=AuditError.test.js.map