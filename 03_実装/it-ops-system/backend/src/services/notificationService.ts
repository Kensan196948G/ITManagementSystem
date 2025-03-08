import { Alert } from '../types/system';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential, TokenCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import LoggingService from './loggingService';
import { SQLiteService } from './sqliteService';
import nodemailer from 'nodemailer';
import { config } from 'dotenv';

// 環境変数を読み込み
config();

const logger = LoggingService.getInstance();
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.AUTH_MODE === 'mock';

export interface SystemNotification {
  id?: number;
  userId: string;
  userEmail: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  data?: any;
}

export class NotificationService {
  private static instance: NotificationService;
  private graphClient!: Client;
  private credential!: TokenCredential;
  private readonly RETRY_ATTEMPTS = 3;
  private isMockMode: boolean;
  private sqlite: SQLiteService;
  private emailTransporter: nodemailer.Transporter | null = null;

  private constructor() {
    this.isMockMode = isDevelopment;
    this.sqlite = SQLiteService.getInstance();
    this.initializeEmailTransporter();
    
    if (!this.isMockMode) {
      this.initializeGraphClient().catch(error => {
        logger.logError(error as Error, {
          context: 'GraphClientInit',
          message: 'Failed to initialize Graph Client during construction'
        });
      });
    } else {
      logger.logInfo({
        context: 'GraphClientInit',
        message: '開発モードでGraph Clientをモックに設定しました'
      });
    }
  }

  private async initializeGraphClient(): Promise<void> {
    if (this.isMockMode) {
      // 開発モードではGraphClientの初期化をスキップ
      return;
    }
    
    try {
      const tenantId = process.env.AZURE_TENANT_ID;
      const clientId = process.env.AZURE_CLIENT_ID;
      const clientSecret = process.env.AZURE_CLIENT_SECRET;

      if (!tenantId || !clientId || !clientSecret) {
        throw new Error('Azure credentials are not fully set in environment variables.');
      }

      this.credential = new ClientSecretCredential(
        tenantId,
        clientId,
        clientSecret,
        {
          retryOptions: {
            maxRetries: this.RETRY_ATTEMPTS,
            retryDelayInMs: 3000
          }
        }
      );

      const authProvider = new TokenCredentialAuthenticationProvider(this.credential, {
        scopes: ['https://graph.microsoft.com/.default']
      });

      this.graphClient = Client.initWithMiddleware({
        authProvider,
        defaultVersion: 'v1.0'
      });

      await this.validateAuth();
    } catch (error) {
      logger.logError(error as Error, {
        context: 'GraphClientAuth',
        message: 'Graph Client initialization error',
        details: (error as Error).message
      });
      throw new Error(`Microsoft Graph authentication initialization failed: ${(error as Error).message}`);
    }
  }

  private async validateAuth(): Promise<void> {
    if (this.isMockMode) {
      // 開発モードでは認証検証をスキップ
      return;
    }
    
    try {
      const senderAccount = process.env.MS_SENDER_ACCOUNT || 'notification@mirai-const.co.jp';
      await this.graphClient.api(`/users/${senderAccount}`).select('mail').get();
    } catch (error) {
      logger.logError(error as Error, {
        context: 'GraphClientAuth',
        message: 'Authentication validation failed',
        details: (error as Error).message
      });
      throw new Error('Failed to validate email sending permissions.');
    }
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async sendAlertEmail(alert: Alert): Promise<void> {
    if (this.isMockMode) {
      logger.logInfo({
        context: 'MockEmailNotification',
        alertId: alert.id,
        alertType: alert.type,
        message: '開発モードでメール送信をシミュレーション',
        mockEmail: {
          subject: `[${alert.type.toUpperCase()}] System Alert: ${alert.source}`,
          body: this.generateAlertEmailTemplate(alert)
        }
      });
      return;
    }
    
    let retryCount = 0;
    const recipients = process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [];

    if (recipients.length === 0) {
      logger.logError(new Error('No email recipients configured'), {
        context: 'EmailNotification',
        alertId: alert.id,
        alertType: alert.type
      });
      return;
    }

    const senderAccount = process.env.MS_SENDER_ACCOUNT || 'notification@mirai-const.co.jp';

    while (retryCount < this.RETRY_ATTEMPTS) {
      try {
        await this.validateAuth();

        const message = {
          message: {
            subject: `[${alert.type.toUpperCase()}] System Alert: ${alert.source}`,
            body: {
              contentType: 'HTML',
              content: this.generateAlertEmailTemplate(alert)
            },
            toRecipients: recipients.map(email => ({
              emailAddress: { address: email }
            })),
            from: {
              emailAddress: { address: process.env.SMTP_FROM || senderAccount }
            }
          },
          saveToSentItems: true
        };

        await this.graphClient.api(`/users/${senderAccount}/sendMail`).post(message);

        logger.logInfo({
          context: 'EmailNotification',
          alertId: alert.id,
          recipients: recipients.length,
          alertType: alert.type,
          senderAccount,
          retryCount,
          message: 'Alert email sent successfully'
        });

        return;
      } catch (error) {
        logger.logError(error as Error, {
          context: 'AlertEmailNotification',
          alertId: alert.id,
          retryCount,
          message: 'Email sending failed',
          details: (error as Error).message
        });

        if (retryCount < this.RETRY_ATTEMPTS - 1) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
        } else {
          throw new Error(`Failed to send alert email after ${this.RETRY_ATTEMPTS} attempts: ${(error as Error).message}`);
        }
      }
    }
  }

  private generateAlertEmailTemplate(alert: Alert): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${this.getAlertColor(alert.type)}; border-bottom: 2px solid ${this.getAlertColor(alert.type)}; padding-bottom: 10px;">
          ${this.getAlertTypeInJapanese(alert.type)} Alert
        </h2>
        <div style="margin: 20px 0;">
          <p><strong>Source:</strong> ${alert.source}</p>
          <p><strong>Message:</strong> ${alert.message}</p>
          <p><strong>Timestamp:</strong> ${alert.timestamp.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
        </div>
        ${alert.metadata ? `
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <h3>Details:</h3>
            <pre style="white-space: pre-wrap;">${JSON.stringify(alert.metadata, null, 2)}</pre>
          </div>
        ` : ''}
      </div>
    `;
  }

  private getAlertColor(type: string): string {
    const colors: Record<string, string> = {
      critical: '#FF0000',
      error: '#FF4444',
      warning: '#FFBB33',
      info: '#33B5E5',
      default: '#333333'
    };
    return colors[type.toLowerCase()] || colors.default;
  }

  private getAlertTypeInJapanese(type: string): string {
    const types: Record<string, string> = {
      critical: '緊急',
      error: 'エラー',
      warning: '警告',
      info: '情報'
    };
    return types[type.toLowerCase()] || type;
  }

  /**
   * メールトランスポーターの初期化
   */
  private initializeEmailTransporter(): void {
    try {
      // 開発環境でのテスト用設定
      if (process.env.NODE_ENV === 'development') {
        this.emailTransporter = nodemailer.createTransport({
          host: process.env.MAIL_HOST || 'smtp.ethereal.email',
          port: parseInt(process.env.MAIL_PORT || '587'),
          secure: process.env.MAIL_SECURE === 'true',
          auth: {
            user: process.env.MAIL_USER || 'test@example.com',
            pass: process.env.MAIL_PASSWORD || 'password'
          }
        });
      } else {
        // 本番環境の設定
        this.emailTransporter = nodemailer.createTransport({
          host: process.env.MAIL_HOST,
          port: parseInt(process.env.MAIL_PORT || '587'),
          secure: process.env.MAIL_SECURE === 'true',
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD
          }
        });
      }
    } catch (error) {
      logger.logError(error as Error, {
        context: 'NotificationService',
        message: 'メールトランスポーターの初期化に失敗しました'
      });
      this.emailTransporter = null;
    }
  }

  /**
   * メールを送信する
   * @param to 送信先メールアドレス
   * @param subject 件名
   * @param message 本文
   */
  public async sendEmail(to: string, subject: string, message: string): Promise<boolean> {
    try {
      // トランスポーターがない場合は初期化を試みる
      if (!this.emailTransporter) {
        this.initializeEmailTransporter();
        if (!this.emailTransporter) {
          throw new Error('メールトランスポーターを初期化できませんでした');
        }
      }

      // メール送信
      const info = await this.emailTransporter.sendMail({
        from: process.env.MAIL_FROM || 'IT管理システム <it-admin@example.com>',
        to,
        subject,
        text: message
      });

      logger.logInfo({
        message: 'メール送信成功',
        details: {
          to,
          subject,
          messageId: info.messageId
        }
      });

      return true;
    } catch (error) {
      logger.logError(error as Error, {
        context: 'NotificationService',
        message: 'メール送信に失敗しました',
        details: {
          to,
          subject
        }
      });
      return false;
    }
  }

  /**
   * システム通知を保存する
   * @param userEmail 通知先ユーザーのメールアドレス
   * @param message 通知メッセージ
   * @param type 通知の種類
   * @param data 追加データ（オプション）
   */
  public async sendSystemNotification(
    userEmail: string,
    message: string,
    type: string,
    data?: any
  ): Promise<number> {
    try {
      // ユーザーIDを取得
      const user = await this.sqlite.get<{ id: string }>(
        'SELECT id FROM users WHERE email = ?',
        [userEmail]
      );

      if (!user) {
        throw new Error(`ユーザー ${userEmail} が見つかりません`);
      }

      // 通知をDBに保存
      const timestamp = new Date().toISOString();
      const result = await this.sqlite.run(
        `INSERT INTO system_notifications
         (user_id, user_email, message, type, is_read, created_at, data)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          userEmail,
          message,
          type,
          0, // 未読
          timestamp,
          data ? JSON.stringify(data) : null
        ]
      );

      return result.lastID;
    } catch (error) {
      logger.logError(error as Error, {
        context: 'NotificationService',
        message: 'システム通知の保存に失敗しました',
        details: {
          userEmail,
          type
        }
      });
      throw error;
    }
  }

  /**
   * ユーザーの未読通知を取得する
   * @param userEmail ユーザーのメールアドレス
   * @param limit 取得する最大数
   */
  public async getUnreadNotifications(userEmail: string, limit = 50): Promise<SystemNotification[]> {
    try {
      const notifications = await this.sqlite.all<{
        id: number;
        user_id: string;
        user_email: string;
        message: string;
        type: string;
        is_read: number;
        created_at: string;
        read_at: string;
        data: string;
      }>(
        `SELECT * FROM system_notifications
         WHERE user_email = ? AND is_read = 0
         ORDER BY created_at DESC
         LIMIT ?`,
        [userEmail, limit]
      );

      return notifications.map(notification => ({
        id: notification.id,
        userId: notification.user_id,
        userEmail: notification.user_email,
        message: notification.message,
        type: notification.type,
        isRead: notification.is_read === 1,
        createdAt: notification.created_at,
        readAt: notification.read_at,
        data: notification.data ? JSON.parse(notification.data) : undefined
      }));
    } catch (error) {
      logger.logError(error as Error, {
        context: 'NotificationService',
        message: '未読通知の取得に失敗しました',
        userEmail
      });
      return [];
    }
  }

  /**
   * 通知を既読にする
   * @param notificationId 通知ID
   * @param userEmail ユーザーのメールアドレス（所有者の確認用）
   */
  public async markNotificationAsRead(notificationId: number, userEmail: string): Promise<boolean> {
    try {
      const notification = await this.sqlite.get<{ user_email: string }>(
        'SELECT user_email FROM system_notifications WHERE id = ?',
        [notificationId]
      );

      if (!notification) {
        throw new Error(`通知 ${notificationId} が見つかりません`);
      }

      if (notification.user_email !== userEmail) {
        throw new Error(`ユーザー ${userEmail} は通知 ${notificationId} の所有者ではありません`);
      }

      await this.sqlite.run(
        `UPDATE system_notifications
         SET is_read = 1, read_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), notificationId]
      );

      return true;
    } catch (error) {
      logger.logError(error as Error, {
        context: 'NotificationService',
        message: '通知の既読状態の更新に失敗しました',
        notificationId,
        userEmail
      });
      return false;
    }
  }

  /**
   * すべての通知を既読にする
   * @param userEmail ユーザーのメールアドレス
   */
  public async markAllNotificationsAsRead(userEmail: string): Promise<boolean> {
    try {
      await this.sqlite.run(
        `UPDATE system_notifications
         SET is_read = 1, read_at = ?
         WHERE user_email = ? AND is_read = 0`,
        [new Date().toISOString(), userEmail]
      );

      return true;
    } catch (error) {
      logger.logError(error as Error, {
        context: 'NotificationService',
        message: 'すべての通知の既読状態の更新に失敗しました',
        userEmail
      });
      return false;
    }
  }

  /**
   * 古い通知を削除する（定期的なメンテナンス用）
   * @param daysOld 何日前の通知を削除するか
   */
  public async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await this.sqlite.run(
        `DELETE FROM system_notifications
         WHERE created_at < ?`,
        [cutoffDate.toISOString()]
      );

      logger.logInfo({
        message: `${daysOld}日以上前の古い通知を削除しました`,
        details: {
          deletedCount: result.changes
        }
      });

      return result.changes;
    } catch (error) {
      logger.logError(error as Error, {
        context: 'NotificationService',
        message: '古い通知の削除に失敗しました',
        daysOld
      });
      return 0;
    }
  }

  /**
   * SMSによる通知を送信する（オプション機能）
   * @param phoneNumber 電話番号
   * @param message メッセージ
   */
  public async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    // 実際のSMS送信サービスの実装をここに追加
    // 現在はログ記録のみ
    logger.logInfo({
      message: 'SMS送信リクエスト',
      details: {
        phoneNumber,
        messageLength: message.length
      }
    });
    
    // 成功したと仮定
    return true;
  }
}
