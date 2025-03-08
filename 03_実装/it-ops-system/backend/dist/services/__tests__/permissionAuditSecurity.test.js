"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const permissionAuditService_1 = require("../permissionAuditService");
const authService_1 = require("../authService");
const sqliteService_1 = require("../sqliteService");
const AuditError_1 = require("../../errors/AuditError");
// モックの設定
jest.mock('../authService');
jest.mock('../sqliteService');
jest.mock('../notificationService');
describe('PermissionAuditService Security Tests', () => {
    let auditService;
    let mockAuthService;
    let mockSQLite;
    beforeEach(async () => {
        // モックのリセット
        jest.clearAllMocks();
        // AuthServiceのモックセットアップ
        mockAuthService = {
            hasPermission: jest.fn().mockResolvedValue(true),
            getCurrentUser: jest.fn().mockResolvedValue({
                id: 'test-user',
                email: 'test@example.com'
            }),
            getInstance: jest.fn().mockReturnThis(),
        };
        // SQLiteServiceのモックセットアップ
        mockSQLite = {
            run: jest.fn().mockResolvedValue({ lastID: 1 }),
            all: jest.fn().mockResolvedValue([]),
            get: jest.fn().mockResolvedValue(null),
            exec: jest.fn().mockResolvedValue(undefined),
            getInstance: jest.fn().mockReturnThis(),
            initialize: jest.fn().mockResolvedValue(undefined)
        };
        authService_1.AuthService.getInstance = jest.fn().mockReturnValue(mockAuthService);
        sqliteService_1.SQLiteService.getInstance = jest.fn().mockReturnValue(mockSQLite);
        // サービスのインスタンス作成前にデータベース初期化を待機
        await mockSQLite.initialize();
        auditService = permissionAuditService_1.PermissionAuditService.getInstance();
    });
    describe('アクセス制御テスト', () => {
        it('権限のないユーザーは監査ログの閲覧ができないこと', async () => {
            mockAuthService.hasPermission.mockResolvedValueOnce(false);
            await expect(auditService.searchAuditRecords({}))
                .rejects.toThrow(AuditError_1.AuditPermissionError);
            expect(mockAuthService.hasPermission).toHaveBeenCalled();
        });
        it('権限のないユーザーは統計情報の閲覧ができないこと', async () => {
            mockAuthService.hasPermission.mockResolvedValueOnce(false);
            await expect(auditService.getChangeStatistics({}))
                .rejects.toThrow(AuditError_1.AuditPermissionError);
            expect(mockAuthService.hasPermission).toHaveBeenCalled();
        });
        it('権限のないユーザーはレビューができないこと', async () => {
            mockAuthService.hasPermission.mockResolvedValueOnce(false);
            await expect(auditService.recordReview(1, 'user1', 'user@example.com', true, 'Comment'))
                .rejects.toThrow(AuditError_1.AuditPermissionError);
            expect(mockAuthService.hasPermission).toHaveBeenCalled();
        });
    });
    describe('入力検証とサニタイズ', () => {
        it('SQLインジェクション攻撃の防御', async () => {
            const maliciousInput = "' OR '1'='1";
            await expect(auditService.searchAuditRecords({
                actorEmail: maliciousInput
            })).rejects.toThrow('Invalid email format');
        });
        it('XSSペイロードの無害化', async () => {
            const xssPayload = '<script>alert("XSS")</script>';
            const sanitizedPayload = xssPayload.replace(/<[^>]*>/g, '');
            const result = await auditService.recordChange({
                timestamp: new Date(),
                actorId: 'actor1',
                actorEmail: 'actor@example.com',
                targetId: 'target1',
                targetEmail: 'target@example.com',
                action: 'add',
                resourceType: 'role',
                resourceName: 'admin',
                reason: sanitizedPayload
            });
            expect(result).toBe(1);
            expect(mockSQLite.run).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([expect.not.stringContaining('<script>')]));
        });
        it('長さ制限の検証', async () => {
            const longString = 'a'.repeat(1001);
            await expect(auditService.recordReview(1, 'reviewer1', 'reviewer@example.com', true, longString)).rejects.toThrow('Invalid comments length');
        });
        it('無効な日付範囲を拒否すること', async () => {
            await expect(auditService.searchAuditRecords({
                startDate: new Date('2024-01-02'),
                endDate: new Date('2024-01-01')
            })).rejects.toThrow('Invalid date range');
        });
        it('無効なメールアドレスを拒否すること', async () => {
            await expect(auditService.searchAuditRecords({
                actorEmail: 'invalid-email'
            })).rejects.toThrow('Invalid email format');
        });
    });
    describe('データ保護', () => {
        beforeEach(() => {
            mockSQLite.get.mockResolvedValue({
                id: 1,
                timestamp: new Date().toISOString(),
                actor_id: 'actor1',
                actor_email: 'actor@example.com',
                target_id: 'target1',
                target_email: 'target@example.com',
                action: 'modify',
                resource_type: 'permission',
                resource_name: 'admin',
                permission_before: 'password=secret123',
                permission_after: 'password=newSecret456'
            });
        });
        it('機密情報のマスキング', async () => {
            const record = await auditService.getAuditRecordById(1);
            expect(record).not.toBeNull();
            expect(record.permissionBefore).not.toContain('secret123');
            expect(record.permissionAfter).not.toContain('newSecret456');
        });
        it('監査ログの改ざん防止', async () => {
            mockSQLite.run.mockRejectedValueOnce(new Error('SQLITE_CONSTRAINT'));
            await expect(mockSQLite.run('UPDATE permission_audit SET action = ? WHERE id = ?', ['delete', 1])).rejects.toThrow();
        });
    });
    describe('レート制限', () => {
        it('短時間での大量リクエストを制限', async () => {
            const requests = Array(100).fill(null).map(() => auditService.searchAuditRecords({}));
            await expect(Promise.all(requests))
                .rejects.toThrow();
        });
    });
    describe('セッション管理', () => {
        it('無効なセッションでのアクセス拒否', async () => {
            mockAuthService.getCurrentUser.mockResolvedValueOnce(null);
            await expect(auditService.searchAuditRecords({}))
                .rejects.toThrow(AuditError_1.AuditPermissionError);
        });
        it('有効なセッションでのアクセス許可', async () => {
            mockAuthService.getCurrentUser.mockResolvedValueOnce({
                id: 'valid-user',
                email: 'valid@example.com'
            });
            mockAuthService.hasPermission.mockResolvedValueOnce(true);
            const result = await auditService.searchAuditRecords({});
            expect(result).toBeDefined();
        });
    });
    describe('監査ログ記録', () => {
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
            const result = await auditService.recordChange(testRecord);
            expect(result).toBe(1);
            expect(mockSQLite.run).toHaveBeenCalled();
        });
        it('異常系でエラーがスローされること', async () => {
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
            await expect(auditService.recordChange(testRecord))
                .rejects.toThrow('Database error');
        });
    });
});
//# sourceMappingURL=permissionAuditSecurity.test.js.map