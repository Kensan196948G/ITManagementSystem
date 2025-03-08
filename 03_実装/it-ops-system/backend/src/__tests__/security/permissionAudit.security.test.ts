import { PermissionAuditService } from '../../services/permissionAuditService';
import { AuthService } from '../../services/authService';
import { SQLiteService } from '../../services/sqliteService';
import { AuditPermissionError } from '../../errors/AuditError';

describe('権限変更監査セキュリティテスト', () => {
  let auditService: PermissionAuditService;
  let authService: AuthService;

  beforeEach(() => {
    auditService = PermissionAuditService.getInstance();
    authService = AuthService.getInstance();
  });

  describe('権限チェック', () => {
    it('権限のないユーザーによる監査記録の取得を拒否', async () => {
      jest.spyOn(authService, 'hasPermission').mockResolvedValue(false);

      await expect(auditService.searchAuditRecords({}))
        .rejects
        .toThrow(AuditPermissionError);
    });

    it('権限のないユーザーによるレビュー操作を拒否', async () => {
      jest.spyOn(authService, 'hasPermission').mockResolvedValue(false);

      await expect(auditService.recordReview(
        1,
        'user123',
        'user@example.com',
        true,
        'Test comment'
      )).rejects.toThrow(AuditPermissionError);
    });
  });

  describe('入力値の検証とサニタイズ', () => {
    it('SQLインジェクション攻撃を防止', async () => {
      const maliciousInput = "' OR '1'='1";
      await expect(auditService.searchAuditRecords({
        actorEmail: maliciousInput
      })).rejects.toThrow();
    });

    it('XSSペイロードを無害化', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      const result = await auditService.recordChange({
        timestamp: new Date(),
        actorId: 'actor1',
        actorEmail: 'actor@example.com',
        targetId: 'target1',
        targetEmail: 'target@example.com',
        action: 'add',
        resourceType: 'role',
        resourceName: 'admin',
        reason: xssPayload
      });

      const record = await auditService.getAuditRecordById(result);
      expect(record?.reason).not.toContain('<script>');
    });
  });

  describe('セッションとトークンの検証', () => {
    it('無効なセッションでのアクセスを拒否', async () => {
      jest.spyOn(authService, 'validateSession').mockResolvedValue(false);

      await expect(auditService.searchAuditRecords({}))
        .rejects
        .toThrow('Invalid session');
    });

    it('期限切れトークンでのアクセスを拒否', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(false);

      await expect(auditService.searchAuditRecords({}))
        .rejects
        .toThrow('Invalid token');
    });
  });

  describe('監査ログのセキュリティ', () => {
    it('機密情報が適切にマスクされていることを確認', async () => {
      const sensitiveData = {
        timestamp: new Date(),
        actorId: 'actor1',
        actorEmail: 'actor@example.com',
        targetId: 'target1',
        targetEmail: 'target@example.com',
        action: 'add',
        resourceType: 'role',
        resourceName: 'admin',
        permissionBefore: 'password123', // 機密情報
        permissionAfter: 'newpassword456', // 機密情報
        reason: 'Password change'
      };

      const result = await auditService.recordChange(sensitiveData);
      const record = await auditService.getAuditRecordById(result);

      expect(record?.permissionBefore).toMatch(/^\*+$/);
      expect(record?.permissionAfter).toMatch(/^\*+$/);
    });

    it('監査ログの改ざんを検知', async () => {
      const sqlite = SQLiteService.getInstance();
      const recordId = 1;

      // 直接データベースを操作して改ざんを試みる
      await sqlite.run(
        'UPDATE permission_audit SET action = ? WHERE id = ?',
        ['modified', recordId]
      );

      // 改ざん検知機能によって検知されることを確認
      await expect(auditService.verifyAuditIntegrity(recordId))
        .resolves
        .toBe(false);
    });
  });

  describe('レート制限', () => {
    it('短時間での大量リクエストを制限', async () => {
      const requests = Array(100).fill(null).map(() => 
        auditService.searchAuditRecords({})
      );

      await expect(Promise.all(requests))
        .rejects
        .toThrow('Rate limit exceeded');
    });
  });

  describe('データアクセス制御', () => {
    it('ユーザーは自分に関連する監査ログのみアクセス可能', async () => {
      jest.spyOn(authService, 'getCurrentUser').mockResolvedValue({
        id: 'user123',
        email: 'user@example.com',
        permissions: ['audit.read']
      });

      const records = await auditService.searchAuditRecords({});
      records.forEach(record => {
        expect(
          record.actorEmail === 'user@example.com' ||
          record.targetEmail === 'user@example.com'
        ).toBe(true);
      });
    });
  });

  describe('セキュリティヘッダー', () => {
    it('適切なセキュリティヘッダーが設定されていることを確認', async () => {
      const headers = await auditService.getSecurityHeaders();

      expect(headers).toEqual(expect.objectContaining({
        'Content-Security-Policy': expect.any(String),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      }));
    });
  });
});