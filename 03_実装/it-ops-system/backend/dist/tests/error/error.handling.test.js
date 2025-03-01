"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const setup_1 = require("../setup");
const index_1 = __importDefault(require("../../index"));
const errors_1 = require("../../types/errors");
describe('エラーハンドリングテスト', () => {
    let testToken;
    beforeEach(() => {
        testToken = (0, setup_1.createTestToken)({ id: 'test-user-id', roles: ['admin'] });
    });
    describe('バリデーションエラー', () => {
        it('必須フィールドの欠落時に適切なエラーを返す', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({});
            expect(response.status).toBe(400);
            expect(response.body).toMatchObject({
                status: 'error',
                code: errors_1.ErrorCode.MISSING_REQUIRED_FIELD,
                message: expect.any(String)
            });
        });
        it('無効なパスワードフォーマット時に詳細なエラーを返す', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({
                username: 'testuser',
                password: 'weak'
            });
            expect(response.status).toBe(400);
            expect(response.body).toMatchObject({
                status: 'error',
                code: errors_1.ErrorCode.VALIDATION_FAILED,
                message: expect.any(String),
                details: expect.objectContaining({
                    requirements: expect.any(Object)
                })
            });
        });
    });
    describe('認証エラー', () => {
        it('無効なトークンで適切なエラーを返す', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token');
            expect(response.status).toBe(401);
            expect(response.body).toMatchObject({
                status: 'error',
                code: errors_1.ErrorCode.AUTH_TOKEN_INVALID,
                message: expect.any(String)
            });
        });
        it('期限切れトークンで適切なエラーを返す', async () => {
            // 期限切れトークンを生成（1秒後に期限切れ）
            const expiredToken = (0, setup_1.createTestToken)({
                id: 'test-user-id',
                roles: ['admin']
            });
            // 2秒待機して期限切れにする
            await new Promise(resolve => setTimeout(resolve, 2000));
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${expiredToken}`);
            expect(response.status).toBe(401);
            expect(response.body).toMatchObject({
                status: 'error',
                code: errors_1.ErrorCode.AUTH_TOKEN_EXPIRED,
                message: expect.any(String)
            });
        });
    });
    describe('外部サービスエラー', () => {
        it('ADサービス接続エラー時に適切なエラーを返す', async () => {
            // ADサーバーが利用できない状態を模倣
            process.env.AD_URL = 'ldap://invalid-server:389';
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({
                username: 'testuser',
                password: 'ValidPassword123!'
            });
            expect(response.status).toBe(401);
            expect(response.body).toMatchObject({
                status: 'error',
                code: errors_1.ErrorCode.AD_CONNECTION_ERROR,
                message: expect.any(String)
            });
            // テスト後に環境変数を元に戻す
            process.env.AD_URL = 'ldap://your-ad-server:389';
        });
    });
    describe('エラーログ', () => {
        it('エラー発生時にログが記録される', async () => {
            const mockLogger = jest.spyOn(console, 'error');
            await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({});
            expect(mockLogger).toHaveBeenCalled();
            mockLogger.mockRestore();
        });
    });
});
//# sourceMappingURL=error.handling.test.js.map