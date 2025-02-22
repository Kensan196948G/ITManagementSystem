import { NotificationService } from '../../services/notificationService';
import { Alert } from '../../types/system';
import nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('NotificationService', () => {
  let notificationService: NotificationService;
  
  beforeEach(() => {
    // テスト用のトランスポーターをモック
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test-message-id'
      })
    });
    
    notificationService = NotificationService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendAlertEmail', () => {
    it('アラートメールを正常に送信できること', async () => {
      const alert: Alert = {
        id: 'test-alert-1',
        type: 'critical',
        source: 'test-monitor',
        message: 'Test alert message',
        timestamp: new Date(),
        acknowledged: false
      };

      process.env.ALERT_EMAIL_RECIPIENTS = 'test1@example.com,test2@example.com';
      process.env.SMTP_FROM = 'alert@example.com';

      await notificationService.sendAlertEmail(alert);

      const transporter = nodemailer.createTransport();
      expect(transporter.sendMail).toHaveBeenCalledWith({
        from: 'alert@example.com',
        to: 'test1@example.com,test2@example.com',
        subject: expect.stringContaining('[CRITICAL]'),
        html: expect.stringContaining('Test alert message')
      });
    });

    it('受信者が設定されていない場合は送信をスキップすること', async () => {
      const alert: Alert = {
        id: 'test-alert-2',
        type: 'warning',
        source: 'test-monitor',
        message: 'Test warning message',
        timestamp: new Date(),
        acknowledged: false
      };

      process.env.ALERT_EMAIL_RECIPIENTS = '';

      await notificationService.sendAlertEmail(alert);

      const transporter = nodemailer.createTransport();
      expect(transporter.sendMail).not.toHaveBeenCalled();
    });
  });
});