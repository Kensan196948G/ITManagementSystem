"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const setup_1 = require("../setup");
const index_1 = __importDefault(require("../../index"));
describe('Security Routes', () => {
    let testToken;
    beforeEach(async () => {
        const testUser = await (0, setup_1.createTestUser)();
        testToken = (0, setup_1.createTestToken)({ id: testUser.id });
    });
    describe('GET /security/threats', () => {
        it('認証済みユーザーが脅威情報を取得できる', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/security/threats')
                .set('Authorization', `Bearer ${testToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'success');
            expect(Array.isArray(response.body.data)).toBe(true);
            if (response.body.data.length > 0) {
                const threat = response.body.data[0];
                expect(threat).toHaveProperty('id');
                expect(threat).toHaveProperty('type');
                expect(threat).toHaveProperty('severity');
                expect(threat).toHaveProperty('status');
                expect(threat).toHaveProperty('detectedAt');
            }
        });
        it('認証なしでアクセスするとエラーになる', async () => {
            const response = await (0, supertest_1.default)(index_1.default).get('/api/security/threats');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('status', 'error');
        });
    });
    describe('GET /security/policies', () => {
        it('セキュリティポリシー一覧の取得が成功する', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/security/policies')
                .set('Authorization', `Bearer ${testToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'success');
            expect(Array.isArray(response.body.data)).toBe(true);
            if (response.body.data.length > 0) {
                const policy = response.body.data[0];
                expect(policy).toHaveProperty('id');
                expect(policy).toHaveProperty('name');
                expect(policy).toHaveProperty('type');
                expect(policy).toHaveProperty('settings');
                expect(policy).toHaveProperty('status');
            }
        });
    });
    describe('PUT /security/policies/:id', () => {
        const updateData = {
            settings: {
                minLength: 14,
                requireComplexity: true,
                expiryDays: 60,
                preventReuse: true
            },
            status: 'active'
        };
        it('ポリシーの更新が成功する', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .put('/api/security/policies/policy-1')
                .set('Authorization', `Bearer ${testToken}`)
                .send(updateData);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'success');
            expect(response.body).toHaveProperty('message', 'Security policy updated successfully');
        });
    });
    describe('GET /security/incidents', () => {
        it('セキュリティインシデント一覧の取得が成功する', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/security/incidents')
                .set('Authorization', `Bearer ${testToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'success');
            expect(Array.isArray(response.body.data)).toBe(true);
            if (response.body.data.length > 0) {
                const incident = response.body.data[0];
                expect(incident).toHaveProperty('id');
                expect(incident).toHaveProperty('type');
                expect(incident).toHaveProperty('severity');
                expect(incident).toHaveProperty('status');
                expect(incident).toHaveProperty('detectedAt');
            }
        });
    });
    describe('POST /security/incidents/:id/respond', () => {
        const response = {
            action: 'isolate',
            details: {
                reason: 'Suspicious activity detected',
                isolationType: 'network'
            }
        };
        it('インシデント対応の記録が成功する', async () => {
            const apiResponse = await (0, supertest_1.default)(index_1.default)
                .post('/api/security/incidents/incident-1/respond')
                .set('Authorization', `Bearer ${testToken}`)
                .send(response);
            expect(apiResponse.status).toBe(200);
            expect(apiResponse.body).toHaveProperty('status', 'success');
            expect(apiResponse.body).toHaveProperty('message', 'Incident response recorded successfully');
        });
        it('存在しないインシデントIDでリクエストするとエラーになる', async () => {
            const apiResponse = await (0, supertest_1.default)(index_1.default)
                .post('/api/security/incidents/invalid-id/respond')
                .set('Authorization', `Bearer ${testToken}`)
                .send(response);
            expect(apiResponse.status).toBe(404);
            expect(apiResponse.body).toHaveProperty('status', 'error');
        });
    });
    describe('POST /security/scan', () => {
        const scanRequest = {
            type: 'vulnerability',
            target: 'system',
            options: {
                depth: 'full',
                includeNetworkScan: true
            }
        };
        it('セキュリティスキャンの開始が成功する', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/security/scan')
                .set('Authorization', `Bearer ${testToken}`)
                .send(scanRequest);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'success');
            expect(response.body).toHaveProperty('message', 'Security scan initiated');
            expect(response.body.data).toHaveProperty('scanId');
            expect(response.body.data).toHaveProperty('startTime');
            expect(response.body.data).toHaveProperty('estimatedCompletion');
        });
        it('無効なスキャンタイプでリクエストするとエラーになる', async () => {
            const invalidRequest = {
                type: 'invalid-type',
                target: 'system'
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/security/scan')
                .set('Authorization', `Bearer ${testToken}`)
                .send(invalidRequest);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('status', 'error');
        });
    });
});
//# sourceMappingURL=security.test.js.map