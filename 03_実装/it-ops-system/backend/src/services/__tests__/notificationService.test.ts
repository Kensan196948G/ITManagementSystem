import { NotificationService } from '../notificationService';
import { SQLiteService } from '../sqliteService';
import { AuditLogService } from '../auditLogService';
import WebSocket from 'ws';

// モック
jest.mock('../sqliteService');
jest.mock('../auditLogService');
jest.mock('ws');

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockSqliteService: jest.Mocked<SQLiteService>;
  let mockAuditLogService: jest.Mocked<AuditLogService>;
  let mockWebSocketServer: jest.Mocked<WebSocket.Server>;
  let mockWebSocket: jest.Mocked<WebSocket>;

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();

    // モックの設定
    mockSqliteService = SQLiteService.getInstance() as jest.Mocked<SQLiteService>;
    mockAuditLogService = AuditLogService.getInstance() as jest.Mocked<AuditLogService>;
    
    // WebSocketのモック
    mockWebSocket = {
      send: jest.fn(),
      on: jest.fn(),
      readyState: WebSocket.OPEN
    } as unknown as jest.Mocked<WebSocket>;
    
    mockWebSocketServer = {
      on: jest.fn(),
      clients: new Set([mockWebSocket])
    } as unknown as jest.Mocked<WebSocket.Server>;
    
    (WebSocket.Server as jest.Mock).mockImplementation(() => mockWebSocketServer);

    // NotificationServiceのインスタンス化
    notificationService = NotificationService.getInstance();
  });

  afterEach(() => {
    // シングルトンをリセット
    NotificationService['instance'] = undefined;
  });

  describe('initialize', () => {
    it('should initialize WebSocket server and set up event listeners', async () => {
      // 初期化メソッドを呼び出す
      await notificationService['initialize']();

      // WebSocketサーバーが作成されたことを確認
      expect(WebSocket.Server).toHaveBeenCalledWith({
        noServer: true
      });

      // connectionイベントリスナーが設定されたことを確認
      expect(mockWebSocketServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('handleConnection', () => {
    it('should set up message and close event listeners for new connections', () => {
      // コネクションハンドラを呼び出す
      notificationService['handleConnection'](mockWebSocket, { userEmail: 'test@example.com' });

      // メッセージイベントリスナーが設定されたことを確認
      expect(mockWebSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
      
      // クローズイベントリスナーが設定されたことを確認
      expect(mockWebSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      
      // クライアントマップにユーザーが追加されたことを確認
      expect(notificationService['clients'].has('test@example.com')).toBeTruthy();
    });
  });

  describe('sendNotification', () => {
    it('should send notification to specific user', () => {
      // クライアントマップにユーザーを追加
      notificationService['clients'].set('test@example.com', new Set([mockWebSocket]));
      
      // 通知を送信
      notificationService.sendNotification({
        userEmail: 'test@example.com',
        type: 'permission_change',
        severity: 'info',
        title: 'パーミッション変更',
        message: 'パーミッションが変更されました',
        data: { permission: 'User.Read' }
      });
      
      // 通知が送信されたことを確認
      expect(mockWebSocket.send).toHaveBeenCalledWith(expect.any(String));
      
      // 送信されたメッセージを検証
      const sentMessage = JSON.parse((mockWebSocket.send as jest.Mock).mock.calls[0][0]);
      expect(sentMessage).toEqual({
        type: 'permission_change',
        severity: 'info',
        title: 'パーミッション変更',
        message: 'パーミッションが変更されました',
        timestamp: expect.any(String),
        data: { permission: 'User.Read' }
      });
      
      // 監査ログが記録されたことを確認
      expect(mockAuditLogService.logSecurity).toHaveBeenCalled();
    });

    it('should send notification to all users when userEmail is not specified', () => {
      // 複数のクライアントを設定
      const mockWebSocket2 = { ...mockWebSocket, send: jest.fn() } as unknown as jest.Mocked<WebSocket>;
      notificationService['clients'].set('user1@example.com', new Set([mockWebSocket]));
      notificationService['clients'].set('user2@example.com', new Set([mockWebSocket2]));
      
      // 全ユーザーに通知を送信
      notificationService.sendNotification({
        type: 'system_status',
        severity: 'warning',
        title: 'システム警告',
        message: 'システムパフォーマンスが低下しています',
        data: { component: 'database' }
      });
      
      // 両方のユーザーに通知が送信されたことを確認
      expect(mockWebSocket.send).toHaveBeenCalled();
      expect(mockWebSocket2.send).toHaveBeenCalled();
      
      // 監査ログが記録されたことを確認
      expect(mockAuditLogService.logSecurity).toHaveBeenCalled();
    });

    it('should not send notification to disconnected clients', () => {
      // 切断されたクライアント
      const disconnectedWebSocket = {
        ...mockWebSocket,
        readyState: WebSocket.CLOSED
      } as unknown as jest.Mocked<WebSocket>;
      
      notificationService['clients'].set('test@example.com', new Set([disconnectedWebSocket]));
      
      // 通知を送信
      notificationService.sendNotification({
        userEmail: 'test@example.com',
        type: 'permission_change',
        severity: 'info',
        title: 'パーミッション変更',
        message: 'パーミッションが変更されました'
      });
      
      // 切断されたクライアントには送信されないことを確認
      expect(disconnectedWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('sendPermissionChangeNotification', () => {
    it('should send permission change notification', () => {
      // sendNotificationのスパイ
      const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification');
      
      // パーミッション変更通知を送信
      notificationService.sendPermissionChangeNotification({
        userEmail: 'test@example.com',
        permission: 'User.Read',
        action: 'grant',
        operatorEmail: 'admin@example.com'
      });
      
      // sendNotificationが適切なパラメータで呼び出されたことを確認
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        userEmail: 'test@example.com',
        type: 'permission_change',
        severity: 'info',
        title: 'パーミッション変更通知',
        message: expect.stringContaining('User.Read'),
        data: {
          permission: 'User.Read',
          action: 'grant',
          operatorEmail: 'admin@example.com'
        }
      });
    });
  });

  describe('sendSystemStatusNotification', () => {
    it('should send system status notification', () => {
      // sendNotificationのスパイ
      const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification');
      
      // システムステータス通知を送信
      notificationService.sendSystemStatusNotification({
        status: 'degraded',
        previousStatus: 'healthy',
        affectedComponents: ['database'],
        message: 'データベースの応答が遅延しています'
      });
      
      // sendNotificationが適切なパラメータで呼び出されたことを確認
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        type: 'system_status',
        severity: 'warning',
        title: expect.stringContaining('システムステータス'),
        message: 'データベースの応答が遅延しています',
        data: {
          status: 'degraded',
          previousStatus: 'healthy',
          affectedComponents: ['database']
        }
      });
    });

    it('should set appropriate severity based on status', () => {
      // sendNotificationのスパイ
      const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification');
      
      // 危機的状態の通知を送信
      notificationService.sendSystemStatusNotification({
        status: 'critical',
        previousStatus: 'degraded',
        affectedComponents: ['api', 'database'],
        message: '複数のコンポーネントが応答していません'
      });
      
      // 重要度が「error」に設定されていることを確認
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error'
        })
      );
    });
  });

  describe('sendSecurityAlertNotification', () => {
    it('should send security alert notification', () => {
      // sendNotificationのスパイ
      const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification');
      
      // セキュリティアラート通知を送信
      notificationService.sendSecurityAlertNotification({
        id: 'alert123',
        severity: 'high',
        type: 'unauthorized_access',
        message: '不正アクセスの試行が検出されました',
        source: 'firewall',
        details: { ipAddress: '192.168.1.100', attempts: 5 }
      });
      
      // sendNotificationが適切なパラメータで呼び出されたことを確認
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        type: 'security_alert',
        severity: 'error',
        title: 'セキュリティアラート: 不正アクセス',
        message: '不正アクセスの試行が検出されました',
        data: {
          id: 'alert123',
          severity: 'high',
          type: 'unauthorized_access',
          source: 'firewall',
          details: { ipAddress: '192.168.1.100', attempts: 5 }
        }
      });
    });
  });

  describe('sendResourceWarningNotification', () => {
    it('should send resource warning notification', () => {
      // sendNotificationのスパイ
      const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification');
      
      // リソース警告通知を送信
      notificationService.sendResourceWarningNotification({
        resource: 'disk',
        usagePercentage: 92.5,
        threshold: 90,
        details: { drive: 'C:' }
      });
      
      // sendNotificationが適切なパラメータで呼び出されたことを確認
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        type: 'resource_warning',
        severity: 'warning',
        title: 'リソース警告: ディスク使用率',
        message: expect.stringContaining('92.5%'),
        data: {
          resource: 'disk',
          usagePercentage: 92.5,
          threshold: 90,
          details: { drive: 'C:' }
        }
      });
    });

    it('should set appropriate severity based on usage percentage', () => {
      // sendNotificationのスパイ
      const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification');
      
      // 危機的なリソース使用率の通知を送信
      notificationService.sendResourceWarningNotification({
        resource: 'memory',
        usagePercentage: 98.5,
        threshold: 90,
        details: { total: '16GB', free: '256MB' }
      });
      
      // 重要度が「error」に設定されていることを確認
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error'
        })
      );
    });
  });

  describe('handleUpgrade', () => {
    it('should authenticate user and upgrade connection', async () => {
      // モックリクエスト・レスポンス・ソケット
      const mockRequest = {
        url: 'ws://example.com/ws?token=valid-token',
        headers: {}
      };
      const mockSocket = {};
      const mockHead = Buffer.from('');
      
      // トークン検証のモック
      const mockVerifyJwt = jest.fn().mockResolvedValue({ email: 'test@example.com' });
      notificationService['verifyJwt'] = mockVerifyJwt;
      
      // WebSocketサーバーのemitメソッドをモック
      mockWebSocketServer.emit = jest.fn();
      
      // アップグレードハンドラを呼び出す
      await notificationService.handleUpgrade(
        mockRequest as any,
        mockSocket as any,
        mockHead
      );
      
      // トークンが検証されたことを確認
      expect(mockVerifyJwt).toHaveBeenCalledWith('valid-token');
      
      // WebSocketサーバーがアップグレードイベントを発行したことを確認
      expect(mockWebSocketServer.emit).toHaveBeenCalledWith(
        'connection',
        expect.any(Object),
        { userEmail: 'test@example.com' }
      );
    });

    it('should reject connection with invalid token', async () => {
      // モックリクエスト・レスポンス・ソケット
      const mockRequest = {
        url: 'ws://example.com/ws?token=invalid-token',
        headers: {}
      };
      const mockSocket = {
        write: jest.fn(),
        destroy: jest.fn()
      };
      const mockHead = Buffer.from('');
      
      // トークン検証のモック（エラーを投げる）
      const mockVerifyJwt = jest.fn().mockRejectedValue(new Error('Invalid token'));
      notificationService['verifyJwt'] = mockVerifyJwt;
      
      // アップグレードハンドラを呼び出す
      await notificationService.handleUpgrade(
        mockRequest as any,
        mockSocket as any,
        mockHead
      );
      
      // トークンが検証されたことを確認
      expect(mockVerifyJwt).toHaveBeenCalledWith('invalid-token');
      
      // 接続が拒否されたことを確認
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 401 Unauthorized')
      );
      expect(mockSocket.destroy).toHaveBeenCalled();
    });
  });

  describe('removeClient', () => {
    it('should remove client from clients map', () => {
      // クライアントを追加
      notificationService['clients'].set('test@example.com', new Set([mockWebSocket]));
      
      // クライアントを削除
      notificationService['removeClient'](mockWebSocket, 'test@example.com');
      
      // クライアントが削除されたことを確認
      expect(notificationService['clients'].get('test@example.com')?.size).toBe(0);
    });

    it('should not throw error when removing non-existent client', () => {
      // 存在しないクライアントを削除しても例外が発生しないことを確認
      expect(() => {
        notificationService['removeClient'](mockWebSocket, 'nonexistent@example.com');
      }).not.toThrow();
    });
  });
});