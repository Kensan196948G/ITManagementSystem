"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const setup_1 = require("../setup");
const index_1 = __importDefault(require("../../index"));
const tokenManager_1 = require("../../services/tokenManager");
describe('認証セキュリティテスト', () => {
    let testToken;
    beforeEach(() => {
        testToken = (0, setup_1.createTestToken)({ id: 'test-user-id', roles: ['admin'] });
    });
    describe('レート制限テスト', () => {
        it('短時間での多数のリクエストをブロック', async () => {
            const requests = Array(105).fill(null).map(() => (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({
                username: 'testuser',
                password: 'validpassword',
            }));
            const responses = await Promise.all(requests);
            const blockedRequests = responses.filter(res => res.status === 429);
            expect(blockedRequests.length).toBeGreaterThan(0);
        });
    });
    describe('パスワードポリシーテスト', () => {
        it('弱いパスワードを拒否', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({
                username: 'testuser',
                password: 'weak',
            });
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Password does not meet security requirements');
        });
    });
    describe('セッション管理テスト', () => {
        it('最大同時セッション数を超えたログインを拒否', async () => {
            // 最大セッション数まで作成
            for (let i = 0; i < 3; i++) {
                await tokenManager_1.TokenManager.addUserSession('test-user-id');
            }
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({
                username: 'testuser',
                password: 'ValidPassword123!',
            });
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Maximum number of concurrent sessions reached');
        });
    });
    describe('トークンブラックリストテスト', () => {
        it('ログアウト後のトークンを無効化', async () => {
            // ログアウト
            await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${testToken}`);
            // 無効化されたトークンでのアクセス試行
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${testToken}`);
            expect(response.status).toBe(401);
            expect(response.body.message).toContain('Token has been invalidated');
        });
    });
    describe('強制ログアウトテスト', () => {
        it('ユーザーの全セッションを無効化', async () => {
            // 強制ログアウト実行
            await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/force-logout')
                .set('Authorization', `Bearer ${testToken}`)
                .send({ userId: 'test-user-id' });
            // セッション数の確認
            const activeSessions = await tokenManager_1.TokenManager.getUserActiveSessions('test-user-id');
            expect(activeSessions).toBe(0);
        });
    });
});
//# sourceMappingURL=auth.security.test.js.map