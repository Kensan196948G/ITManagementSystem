"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const setup_1 = require("../setup");
const index_1 = __importDefault(require("../../index"));
describe('System Routes', () => {
    let testToken;
    beforeEach(async () => {
        const testUser = await (0, setup_1.createTestUser)();
        testToken = (0, setup_1.createTestToken)({ id: testUser.id });
    });
    describe('GET /system/config', () => {
        it('認証済みユーザーがシステム設定を取得できる', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/system/config')
                .set('Authorization', `Bearer ${testToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'success');
            expect(response.body.data).toHaveProperty('ad');
            expect(response.body.data).toHaveProperty('m365');
            expect(response.body.data).toHaveProperty('monitoring');
        });
        it('認証なしでアクセスするとエラーになる', async () => {
            const response = await (0, supertest_1.default)(index_1.default).get('/api/system/config');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('status', 'error');
        });
    });
    describe('PUT /system/config', () => {
        const updateConfig = {
            monitoring: {
                checkInterval: 600,
                retentionDays: 45,
                alertThresholds: {
                    cpu: 85,
                    memory: 90,
                    disk: 85
                }
            }
        };
        it('システム設定の更新が成功する', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .put('/api/system/config')
                .set('Authorization', `Bearer ${testToken}`)
                .send(updateConfig);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'success');
            expect(response.body).toHaveProperty('message', 'System configuration updated successfully');
        });
        it('無効な設定値でリクエストするとエラーになる', async () => {
            const invalidConfig = {
                monitoring: {
                    checkInterval: -1, // 無効な値
                    retentionDays: 0 // 無効な値
                }
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .put('/api/system/config')
                .set('Authorization', `Bearer ${testToken}`)
                .send(invalidConfig);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('status', 'error');
        });
    });
    describe('GET /system/status', () => {
        it('システムステータスの取得が成功する', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/system/status')
                .set('Authorization', `Bearer ${testToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'success');
            expect(response.body.data).toHaveProperty('healthy');
            expect(response.body.data).toHaveProperty('services');
            expect(Array.isArray(response.body.data.services)).toBe(true);
            if (response.body.data.services.length > 0) {
                const service = response.body.data.services[0];
                expect(service).toHaveProperty('name');
                expect(service).toHaveProperty('status');
                expect(service).toHaveProperty('lastCheck');
            }
        });
        it('システムの健全性チェックが正しく動作する', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/system/status')
                .set('Authorization', `Bearer ${testToken}`);
            expect(response.status).toBe(200);
            expect(typeof response.body.data.healthy).toBe('boolean');
            response.body.data.services.forEach((service) => {
                expect(['up', 'down', 'degraded']).toContain(service.status);
                expect(new Date(service.lastCheck)).toBeInstanceOf(Date);
            });
        });
    });
    describe('エラー処理', () => {
        it('存在しないエンドポイントにアクセスすると404エラーを返す', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/system/nonexistent')
                .set('Authorization', `Bearer ${testToken}`);
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body).toHaveProperty('message', 'Not Found');
        });
        it('不正なJSONでリクエストするとエラーを返す', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .put('/api/system/config')
                .set('Authorization', `Bearer ${testToken}`)
                .set('Content-Type', 'application/json')
                .send('invalid json');
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('status', 'error');
        });
        it('大きすぎるペイロードを送信するとエラーを返す', async () => {
            const largeObject = { data: 'x'.repeat(1024 * 1024) }; // 1MB
            const response = await (0, supertest_1.default)(index_1.default)
                .put('/api/system/config')
                .set('Authorization', `Bearer ${testToken}`)
                .send(largeObject);
            expect(response.status).toBe(413);
        });
    });
});
//# sourceMappingURL=system.test.js.map