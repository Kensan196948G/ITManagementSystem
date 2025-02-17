"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const setup_1 = require("../setup");
const index_1 = __importDefault(require("../../index"));
describe('API Integration Tests', () => {
    let testToken;
    beforeEach(() => {
        testToken = (0, setup_1.createTestToken)({ id: 'test-user-id', roles: ['admin'] });
    });
    describe('認証フロー', () => {
        it('ログイン -> ユーザー情報取得 -> ログアウトのフロー', async () => {
            // ログイン
            const loginResponse = await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({
                username: 'testuser',
                password: 'validpassword',
            });
            expect(loginResponse.status).toBe(200);
            expect(loginResponse.body).toHaveProperty('status', 'success');
            const token = loginResponse.body.data.token;
            // ユーザー情報取得
            const userResponse = await (0, supertest_1.default)(index_1.default)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);
            expect(userResponse.status).toBe(200);
            expect(userResponse.body).toHaveProperty('status', 'success');
            expect(userResponse.body.data.user).toHaveProperty('username', 'testuser');
            // ログアウト
            const logoutResponse = await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${token}`);
            expect(logoutResponse.status).toBe(200);
            expect(logoutResponse.body).toHaveProperty('status', 'success');
        });
    });
    describe('ダッシュボードデータフロー', () => {
        it('メトリクス、アラート、ログの同時取得', async () => {
            const responses = await Promise.all([
                (0, supertest_1.default)(index_1.default)
                    .get('/api/monitoring/metrics')
                    .set('Authorization', `Bearer ${testToken}`),
                (0, supertest_1.default)(index_1.default)
                    .get('/api/monitoring/alerts')
                    .set('Authorization', `Bearer ${testToken}`),
                (0, supertest_1.default)(index_1.default)
                    .get('/api/monitoring/logs')
                    .set('Authorization', `Bearer ${testToken}`),
            ]);
            // メトリクスの検証
            expect(responses[0].status).toBe(200);
            expect(responses[0].body.data).toBeDefined();
            expect(responses[0].body.data.cpu).toBeDefined();
            // アラートの検証
            expect(responses[1].status).toBe(200);
            expect(responses[1].body.data).toBeInstanceOf(Array);
            // ログの検証
            expect(responses[2].status).toBe(200);
            expect(responses[2].body.data).toBeInstanceOf(Array);
        });
    });
    describe('ユーザー管理フロー', () => {
        it('ADユーザー作成 -> M365ライセンス割り当て', async () => {
            // ADユーザー作成
            const adResponse = await (0, supertest_1.default)(index_1.default)
                .post('/api/ad/users')
                .set('Authorization', `Bearer ${testToken}`)
                .send({
                sAMAccountName: 'newuser',
                displayName: 'New User',
                mail: 'newuser@example.com',
                department: 'IT',
            });
            expect(adResponse.status).toBe(200);
            expect(adResponse.body).toHaveProperty('status', 'success');
            // M365ユーザー作成とライセンス割り当て
            const m365Response = await (0, supertest_1.default)(index_1.default)
                .post('/api/m365/users')
                .set('Authorization', `Bearer ${testToken}`)
                .send({
                displayName: 'New User',
                email: 'newuser@example.com',
                password: 'Password123!',
                accountEnabled: true,
                licenses: ['E3-License'],
            });
            expect(m365Response.status).toBe(200);
            expect(m365Response.body).toHaveProperty('status', 'success');
        });
    });
    describe('システム監視フロー', () => {
        it('アラート発生 -> 通知 -> 確認のフロー', async () => {
            // アラートの取得
            const alertsResponse = await (0, supertest_1.default)(index_1.default)
                .get('/api/monitoring/alerts')
                .set('Authorization', `Bearer ${testToken}`);
            expect(alertsResponse.status).toBe(200);
            const alerts = alertsResponse.body.data;
            const unacknowledgedAlert = alerts.find((a) => !a.acknowledged);
            if (unacknowledgedAlert) {
                // アラートの確認
                const ackResponse = await (0, supertest_1.default)(index_1.default)
                    .post(`/api/monitoring/alerts/${unacknowledgedAlert.id}/acknowledge`)
                    .set('Authorization', `Bearer ${testToken}`);
                expect(ackResponse.status).toBe(200);
                expect(ackResponse.body).toHaveProperty('status', 'success');
                // 更新後のアラート状態確認
                const updatedAlertsResponse = await (0, supertest_1.default)(index_1.default)
                    .get('/api/monitoring/alerts')
                    .set('Authorization', `Bearer ${testToken}`);
                expect(updatedAlertsResponse.status).toBe(200);
                const updatedAlert = updatedAlertsResponse.body.data
                    .find((a) => a.id === unacknowledgedAlert.id);
                expect(updatedAlert.acknowledged).toBe(true);
            }
        });
    });
    describe('エラーハンドリング', () => {
        it('無効なトークンでのアクセス拒否', async () => {
            const responses = await Promise.all([
                (0, supertest_1.default)(index_1.default)
                    .get('/api/monitoring/metrics')
                    .set('Authorization', 'Bearer invalid-token'),
                (0, supertest_1.default)(index_1.default)
                    .get('/api/ad/users')
                    .set('Authorization', 'Bearer invalid-token'),
                (0, supertest_1.default)(index_1.default)
                    .get('/api/m365/users')
                    .set('Authorization', 'Bearer invalid-token'),
            ]);
            responses.forEach(response => {
                expect(response.status).toBe(401);
                expect(response.body).toHaveProperty('status', 'error');
            });
        });
        it('不正なリクエストパラメータのハンドリング', async () => {
            const responses = await Promise.all([
                (0, supertest_1.default)(index_1.default)
                    .post('/api/ad/users')
                    .set('Authorization', `Bearer ${testToken}`)
                    .send({}),
                (0, supertest_1.default)(index_1.default)
                    .post('/api/m365/users')
                    .set('Authorization', `Bearer ${testToken}`)
                    .send({}),
            ]);
            responses.forEach(response => {
                expect(response.status).toBe(400);
                expect(response.body).toHaveProperty('status', 'error');
            });
        });
    });
});
//# sourceMappingURL=api.test.js.map