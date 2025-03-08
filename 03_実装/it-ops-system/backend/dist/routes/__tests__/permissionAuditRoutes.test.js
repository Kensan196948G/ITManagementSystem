"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const permissionAuditService_1 = require("../../services/permissionAuditService");
const authService_1 = require("../../services/authService");
const permissionAuditRoutes_1 = __importDefault(require("../permissionAuditRoutes"));
jest.mock('../../services/permissionAuditService');
jest.mock('../../services/authService');
describe('Permission Audit Routes', () => {
    let app;
    let mockAuditService;
    let mockAuthService;
    beforeEach(() => {
        mockAuthService = {
            hasPermission: jest.fn().mockResolvedValue(true),
            getCurrentUser: jest.fn().mockResolvedValue({
                id: 'test-user',
                email: 'test@example.com'
            }),
            getInstance: jest.fn().mockReturnThis()
        };
        mockAuditService = {
            searchAuditRecords: jest.fn().mockResolvedValue([]),
            getChangeStatistics: jest.fn().mockResolvedValue({
                actionStats: [],
                resourceStats: []
            }),
            recordReview: jest.fn().mockResolvedValue(1),
            getInstance: jest.fn().mockReturnThis()
        };
        permissionAuditService_1.PermissionAuditService.getInstance = jest.fn().mockReturnValue(mockAuditService);
        authService_1.AuthService.getInstance = jest.fn().mockReturnValue(mockAuthService);
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/permission-audit', permissionAuditRoutes_1.default);
    });
    describe('GET /records', () => {
        it('認証済みユーザーが監査レコードを取得できること', async () => {
            const mockRecords = [
                {
                    id: 1,
                    timestamp: new Date().toISOString(),
                    actorEmail: 'actor@example.com',
                    targetEmail: 'target@example.com',
                    action: 'add'
                }
            ];
            mockAuditService.searchAuditRecords.mockResolvedValueOnce(mockRecords);
            const response = await (0, supertest_1.default)(app)
                .get('/api/permission-audit/records')
                .query({
                startDate: '2024-01-01',
                endDate: '2024-01-02'
            });
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockRecords);
        });
        it('権限のないユーザーがアクセスを拒否されること', async () => {
            mockAuthService.hasPermission.mockResolvedValueOnce(false);
            const response = await (0, supertest_1.default)(app)
                .get('/api/permission-audit/records');
            expect(response.status).toBe(403);
        });
    });
    describe('GET /statistics', () => {
        it('権限変更の統計情報を取得できること', async () => {
            const mockStats = {
                actionStats: [{ action: 'add', count: 5 }],
                resourceStats: [{ resource_type: 'role', count: 3 }]
            };
            mockAuditService.getChangeStatistics.mockResolvedValueOnce(mockStats);
            const response = await (0, supertest_1.default)(app)
                .get('/api/permission-audit/statistics');
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockStats);
        });
        it('統計情報取得でエラーが発生した場合を処理できること', async () => {
            mockAuditService.getChangeStatistics.mockRejectedValueOnce(new Error('Database error'));
            const response = await (0, supertest_1.default)(app)
                .get('/api/permission-audit/statistics');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('POST /review/:recordId', () => {
        it('有効なレビューを登録できること', async () => {
            const reviewData = {
                approved: true,
                comments: 'Approved by reviewer'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/permission-audit/review/1')
                .send(reviewData);
            expect(response.status).toBe(200);
            expect(mockAuditService.recordReview).toHaveBeenCalledWith(1, 'test-user', 'test@example.com', true, 'Approved by reviewer');
        });
        it('無効なレビューデータを拒否すること', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/permission-audit/review/1')
                .send({
            // missing required fields
            });
            expect(response.status).toBe(400);
        });
    });
    describe('GET /user/:email/history', () => {
        it('ユーザーの権限変更履歴を取得できること', async () => {
            const mockHistory = [
                {
                    id: 1,
                    timestamp: new Date().toISOString(),
                    action: 'add',
                    resourceName: 'admin'
                }
            ];
            mockAuditService.getUserPermissionHistory.mockResolvedValueOnce(mockHistory);
            const response = await (0, supertest_1.default)(app)
                .get('/api/permission-audit/user/test@example.com/history');
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockHistory);
        });
        it('無効なメールアドレスでリクエストを拒否すること', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/permission-audit/user/invalid-email/history');
            expect(response.status).toBe(400);
        });
    });
});
//# sourceMappingURL=permissionAuditRoutes.test.js.map