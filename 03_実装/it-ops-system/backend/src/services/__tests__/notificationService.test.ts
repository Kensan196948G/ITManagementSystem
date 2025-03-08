import { NotificationService } from '../notificationService';
import LoggingService from '../loggingService';
import { Alert, AlertType } from '../types/system';
import { AlertSeverity, NotificationType } from '../types/notifications';

jest.mock('../loggingService');

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockLogger: jest.Mocked<LoggingService>;
  let mockSendEmail: jest.Mock;
  let mockSendSlack: jest.Mock;

  beforeEach(() => {
    mockLogger = {
      logError: jest.fn(),
      logInfo: jest.fn(),
      logWarn: jest.fn(),
      getInstance: jest.fn().mockReturnThis()
    } as any;

    (LoggingService as any).getInstance = jest.fn().mockReturnValue(mockLogger);

    notificationService = NotificationService.getInstance();
    
    // モック実装の初期化
    mockSendEmail = jest.fn().mockResolvedValue(true);
    mockSendSlack = jest.fn().mockResolvedValue(true);

    // メソッドモック設定
    notificationService.sendEmail = mockSendEmail;
    notificationService.sendSlack = mockSendSlack;
  });

  describe('アラート送信', () => {
    it('重要度に応じて適切な通知チャネルを選択すること', async () => {
      const criticalAlert = {
        type: AlertType.SERVICE_DOWN,
        severity: AlertSeverity.CRITICAL,
        message: 'Database is down',
        timestamp: Date.now()
      };

      await notificationService.sendAlert(criticalAlert);
      expect(mockSendEmail).toHaveBeenCalled();
      expect(mockSendSlack).toHaveBeenCalled();
    });

    it('警告レベルのアラートはSlackのみに送信すること', async () => {
      const warningAlert = {
        type: AlertType.HIGH_CPU,
        severity: AlertSeverity.WARNING,
        message: 'High CPU usage detected',
        timestamp: Date.now()
      };

      await notificationService.sendAlert(warningAlert);
      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(mockSendSlack).toHaveBeenCalled();
    });

    it('アラートの重複を抑制できること', async () => {
      const alert = {
        type: AlertType.HIGH_MEMORY,
        severity: AlertSeverity.WARNING,
        message: 'High memory usage',
        timestamp: Date.now()
      };

      // 最初のアラート
      await notificationService.sendAlert(alert);
      expect(mockSendSlack).toHaveBeenCalledTimes(1);

      // 重複するアラート（抑制される）
      await notificationService.sendAlert(alert);
      expect(mockSendSlack).toHaveBeenCalledTimes(1);
    });
  });

  describe('通知送信', () => {
    it('通常の通知を送信できること', async () => {
      const notification = {
        type: NotificationType.INFO,
        message: 'System maintenance completed',
        timestamp: Date.now()
      };

      await notificationService.sendNotification(notification);
      expect(mockSendSlack).toHaveBeenCalled();
      expect(mockLogger.logInfo).toHaveBeenCalled();
    });

    it('通知の送信失敗を処理できること', async () => {
      mockSendSlack.mockRejectedValueOnce(new Error('Network error'));

      const notification = {
        type: NotificationType.INFO,
        message: 'Test notification',
        timestamp: Date.now()
      };

      await notificationService.sendNotification(notification);
      expect(mockLogger.logError).toHaveBeenCalled();
    });

    it('バッチ通知を送信できること', async () => {
      const notifications = [
        {
          type: NotificationType.INFO,
          message: 'Notification 1',
          timestamp: Date.now()
        },
        {
          type: NotificationType.INFO,
          message: 'Notification 2',
          timestamp: Date.now()
        }
      ];

      await notificationService.sendBatchNotifications(notifications);
      expect(mockSendSlack).toHaveBeenCalledTimes(1);
      expect(mockLogger.logInfo).toHaveBeenCalled();
    });
  });

  describe('通知設定', () => {
    it('通知チャネルを設定できること', async () => {
      const channels = {
        email: ['admin@example.com'],
        slack: ['#monitoring'],
        webhook: ['https://example.com/webhook']
      };

      await notificationService.configureChannels(channels);
      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Notification channels configured'
        })
      );
    });

    it('無効な通知設定を検出できること', async () => {
      const invalidChannels = {
        email: ['invalid-email'],
        slack: []
      };

      await expect(notificationService.configureChannels(invalidChannels))
        .rejects.toThrow('Invalid channel configuration');
      expect(mockLogger.logError).toHaveBeenCalled();
    });
  });

  describe('エラー処理', () => {
    it('無効なアラート形式でエラーをスローすること', async () => {
      const invalidAlert = {
        type: 'INVALID_TYPE',
        severity: AlertSeverity.WARNING,
        message: 'Test alert',
        timestamp: Date.now()
      };

      await expect(notificationService.sendAlert(invalidAlert))
        .rejects.toThrow('Invalid alert type');
      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation failed for alert'
        })
      );
    });

    it('複数サービス障害時のエラーログ記録', async () => {
      mockSendEmail.mockRejectedValue(new Error('SMTP Error'));
      mockSendSlack.mockRejectedValue(new Error('Slack API Error'));

      const alert = {
        type: AlertType.HIGH_CPU,
        severity: AlertSeverity.CRITICAL,
        message: 'Critical failure',
        timestamp: Date.now()
      };

      await expect(notificationService.sendAlert(alert))
        .rejects.toThrow('All notification channels failed');
      expect(mockLogger.logError).toHaveBeenCalledTimes(2);
    });

    it('送信リトライを実行できること', async () => {
      mockSendSlack
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce(true);

      const alert = {
        type: AlertType.HIGH_CPU,
        severity: AlertSeverity.WARNING,
        message: 'Test alert',
        timestamp: Date.now()
      };

      await notificationService.sendAlert(alert);
      expect(mockSendSlack).toHaveBeenCalledTimes(3);
      expect(mockLogger.logWarn).toHaveBeenCalledTimes(2);
    });

    it('最大リトライ回数を超えた場合エラーをスローすること', async () => {
      mockSendSlack.mockRejectedValue(new Error('Send failed'));

      const alert = {
        type: AlertType.HIGH_CPU,
        severity: AlertSeverity.WARNING,
        message: 'Test alert',
        timestamp: Date.now()
      };

      await expect(notificationService.sendAlert(alert))
        .rejects.toThrow('Max retry attempts exceeded');
      expect(mockLogger.logError).toHaveBeenCalled();
    });
  });

  describe('テンプレート管理', () => {
    it('アラートテンプレートを適用できること', async () => {
      const template = 'Alert: {{message}} (Severity: {{severity}})';
      const alert = {
        type: AlertType.HIGH_CPU,
        severity: AlertSeverity.WARNING,
        message: 'CPU usage at 90%',
        timestamp: Date.now()
      };

      await notificationService.setTemplate(AlertType.HIGH_CPU, template);
      await notificationService.sendAlert(alert);

      expect(mockSendSlack).toHaveBeenCalledWith(
        expect.stringContaining('Alert: CPU usage at 90% (Severity: warning)')
      );
    });

    it('カスタムテンプレートを検証できること', async () => {
      const invalidTemplate = 'Alert: {{invalid}}';
      await expect(notificationService.setTemplate(AlertType.HIGH_CPU, invalidTemplate))
        .rejects.toThrow('Invalid template variables');
    });
  });
});