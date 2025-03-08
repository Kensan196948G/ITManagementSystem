"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const permissionAuditService_1 = require("../permissionAuditService");
const sqliteService_1 = require("../sqliteService");
const notificationService_1 = require("../notificationService");
// モックのセットアップ
jest.mock('../sqliteService');
jest.mock('../loggingService');
jest.mock('../authService');
jest.mock('../notificationService');
describe('PermissionAuditService', () => {
    let permissionAuditService;
    let mockSQLite;
    beforeEach(async () => {
        // モックのリセット
        jest.clearAllMocks();
        // SQLiteServiceのモックセットアップ
        mockSQLite = {
            run: jest.fn().mockResolvedValue({ lastID: 1 }),
            all: jest.fn().mockResolvedValue([]),
            get: jest.fn().mockResolvedValue(null),
            exec: jest.fn().mockResolvedValue(undefined),
            getInstance: jest.fn().mockReturnThis(),
            initialize: jest.fn().mockResolvedValue(undefined),
            healthCheck: jest.fn().mockResolvedValue(true)
        };
        sqliteService_1.SQLiteService.getInstance = jest.fn().mockReturnValue(mockSQLite);
        // サービスのインスタンス作成前にデータベース初期化を待機
        await mockSQLite.initialize();
        permissionAuditService = permissionAuditService_1.PermissionAuditService.getInstance();
    });
    describe('recordChange', () => {
        it('権限変更を正常に記録できること', async () => {
            const testRecord = {
                timestamp: new Date(),
                actorId: 'actor123',
                actorEmail: 'actor@example.com',
                targetId: 'target456',
                targetEmail: 'target@example.com',
                action: 'add',
                resourceType: 'role',
                resourceName: 'admin',
                reason: 'Test reason'
            };
            await expect(permissionAuditService.recordChange(testRecord))
                .resolves.toBe(1);
            expect(mockSQLite.run).toHaveBeenCalled();
        });
        it('エラー時に例外をスローすること', async () => {
            mockSQLite.run.mockRejectedValueOnce(new Error('Database error'));
            const testRecord = {
                timestamp: new Date(),
                actorId: 'actor123',
                actorEmail: 'actor@example.com',
                targetId: 'target456',
                targetEmail: 'target@example.com',
                action: 'add',
                resourceType: 'role',
                resourceName: 'admin'
            };
            await expect(permissionAuditService.recordChange(testRecord))
                .rejects.toThrow('Database error');
        });
    });
    describe('searchAuditRecords', () => {
        it('フィルター条件に基づいて監査レコードを検索できること', async () => {
            const mockRecords = [
                {
                    id: 1,
                    timestamp: '2024-01-01T00:00:00.000Z',
                    actor_id: 'actor1',
                    actor_email: 'actor1@example.com',
                    target_id: 'target1',
                    target_email: 'target1@example.com',
                    action: 'add',
                    resource_type: 'role',
                    resource_name: 'admin'
                }
            ];
            mockSQLite.all.mockResolvedValueOnce(mockRecords);
            const filter = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-02'),
                actorEmail: 'actor1@example.com'
            };
            const result = await permissionAuditService.searchAuditRecords(filter);
            expect(result).toHaveLength(1);
            expect(result[0].actorEmail).toBe('actor1@example.com');
            expect(mockSQLite.all).toHaveBeenCalled();
        });
    });
    describe('getChangeStatistics', () => {
        it('権限変更の統計情報を取得できること', async () => {
            const mockActionStats = [
                { action: 'add', count: 5 },
                { action: 'remove', count: 3 }
            ];
            const mockResourceStats = [
                { resource_type: 'role', count: 4 },
                { resource_type: 'permission', count: 4 }
            ];
            mockSQLite.all
                .mockResolvedValueOnce(mockActionStats)
                .mockResolvedValueOnce(mockResourceStats)
                .mockResolvedValueOnce([]);
            const filter = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-02')
            };
            const result = await permissionAuditService.getChangeStatistics(filter);
            expect(result).toHaveProperty('actionStats');
            expect(result).toHaveProperty('resourceStats');
            expect(result.actionStats).toEqual(mockActionStats);
            expect(result.resourceStats).toEqual(mockResourceStats);
        });
    });
    describe('generateReport', () => {
        it('権限変更レポートを生成できること', async () => {
            const mockRecords = [
                {
                    id: 1,
                    timestamp: '2024-01-01T00:00:00.000Z',
                    actor_id: 'actor1',
                    actor_email: 'actor1@example.com',
                    target_id: 'target1',
                    target_email: 'target1@example.com',
                    action: 'add',
                    resource_type: 'role',
                    resource_name: 'admin'
                }
            ];
            mockSQLite.all
                .mockResolvedValueOnce(mockRecords) // searchAuditRecords
                .mockResolvedValueOnce([]) // getChangeStatistics - actionStats
                .mockResolvedValueOnce([]) // getChangeStatistics - resourceStats
                .mockResolvedValueOnce([]); // getChangeStatistics - actorStats
            const filter = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-02')
            };
            const result = await permissionAuditService.generateReport(filter);
            expect(result).toHaveProperty('metadata');
            expect(result).toHaveProperty('statistics');
            expect(result).toHaveProperty('records');
            expect(result.records).toHaveLength(1);
        });
    });
    describe('recordReview', () => {
        it('権限変更レビューを正常に記録できること', async () => {
            await permissionAuditService.recordReview(1, 'reviewer123', 'reviewer@example.com', true, 'Approved');
            expect(mockSQLite.run).toHaveBeenCalled();
        });
        it('エラー時に例外をスローすること', async () => {
            mockSQLite.run.mockRejectedValueOnce(new Error('Database error'));
            await expect(permissionAuditService.recordReview(1, 'reviewer123', 'reviewer@example.com', true, 'Approved')).rejects.toThrow('Database error');
        });
    });
    describe('getUserPermissionHistory', () => {
        it('ユーザーの権限変更履歴を取得できること', async () => {
            const mockHistory = [
                {
                    id: 1,
                    timestamp: '2024-01-01T00:00:00.000Z',
                    actor_id: 'actor1',
                    actor_email: 'actor1@example.com',
                    target_id: 'target1',
                    target_email: 'user@example.com',
                    action: 'add',
                    resource_type: 'role',
                    resource_name: 'admin'
                }
            ];
            mockSQLite.all.mockResolvedValueOnce(mockHistory);
            const result = await permissionAuditService.getUserPermissionHistory('user@example.com');
            expect(result).toHaveLength(1);
            expect(result[0].targetEmail).toBe('user@example.com');
            expect(mockSQLite.all).toHaveBeenCalled();
        });
        it('エラー時に空配列を返すこと', async () => {
            mockSQLite.all.mockRejectedValueOnce(new Error('Database error'));
            const result = await permissionAuditService.getUserPermissionHistory('user@example.com');
            expect(result).toEqual([]);
        });
    });
    describe('notifyPermissionChange', () => {
        let mockNotificationService;
        beforeEach(() => {
            mockNotificationService = {
                sendNotification: jest.fn().mockResolvedValue(undefined),
                getInstance: jest.fn().mockReturnThis(),
            };
            notificationService_1.NotificationService.getInstance = jest.fn().mockReturnValue(mockNotificationService);
        });
        it('グローバル管理者に通知が送信されること', async () => {
            const globalAdmins = [
                { id: 'admin1', email: 'admin1@example.com' },
                { id: 'admin2', email: 'admin2@example.com' }
            ];
            mockSQLite.all.mockResolvedValueOnce(globalAdmins);
            const testRecord = {
                timestamp: new Date(),
                actorId: 'actor123',
                actorEmail: 'actor@example.com',
                targetId: 'target456',
                targetEmail: 'target@example.com',
                action: 'add',
                resourceType: 'role',
                resourceName: 'admin',
                reason: 'Test reason'
            };
            await permissionAuditService.recordChange(testRecord);
            expect(mockNotificationService.sendNotification).toHaveBeenCalledTimes(globalAdmins.length + 1);
            globalAdmins.forEach(admin => {
                expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(expect.objectContaining({
                    userId: admin.id,
                    userEmail: admin.email,
                    type: 'security',
                    priority: 'high'
                }));
            });
        });
        it('対象ユーザーに通知が送信されること', async () => {
            mockSQLite.all.mockResolvedValueOnce([]); // グローバル管理者なし
            const testRecord = {
                timestamp: new Date(),
                actorId: 'actor123',
                actorEmail: 'actor@example.com',
                targetId: 'target456',
                targetEmail: 'target@example.com',
                action: 'add',
                resourceType: 'role',
                resourceName: 'admin',
                reason: 'Test reason'
            };
            await permissionAuditService.recordChange(testRecord);
            expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(expect.objectContaining({
                userId: testRecord.targetId,
                userEmail: testRecord.targetEmail,
                type: 'security',
                priority: 'high'
            }));
        });
        it('自分自身の変更の場合、対象ユーザーに通知が送信されないこと', async () => {
            mockSQLite.all.mockResolvedValueOnce([]); // グローバル管理者なし
            const testRecord = {
                timestamp: new Date(),
                actorId: 'user123',
                actorEmail: 'user@example.com',
                targetId: 'user123',
                targetEmail: 'user@example.com',
                action: 'modify',
                resourceType: 'role',
                resourceName: 'admin',
                reason: 'Self modification'
            };
            await permissionAuditService.recordChange(testRecord);
            expect(mockNotificationService.sendNotification).not.toHaveBeenCalledWith(expect.objectContaining({
                userId: testRecord.targetId,
                userEmail: testRecord.targetEmail
            }));
        });
    });
    describe('searchAuditRecords with validation', () => {
        it('無効な日付範囲でエラーとなること', async () => {
            const filter = {
                startDate: new Date('2024-01-02'),
                endDate: new Date('2024-01-01') // startDateより前
            };
            await expect(permissionAuditService.searchAuditRecords(filter))
                .rejects.toThrow('Invalid date range');
        });
        it('無効なアクションタイプでエラーとなること', async () => {
            const filter = {
                action: 'invalid'
            };
            await expect(permissionAuditService.searchAuditRecords(filter))
                .rejects.toThrow('Invalid action type');
        });
        it('無効なメールアドレスでエラーとなること', async () => {
            const filter = {
                actorEmail: 'invalid-email'
            };
            await expect(permissionAuditService.searchAuditRecords(filter))
                .rejects.toThrow('Invalid email format');
        });
    });
});
//# sourceMappingURL=permissionAuditService.test.js.map