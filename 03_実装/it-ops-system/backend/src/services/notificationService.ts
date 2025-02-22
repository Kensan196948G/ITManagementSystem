import { Alert } from '../types/system';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential, TokenCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import LoggingService from './loggingService';

const logger = LoggingService.getInstance();

export class NotificationService {
  private static instance: NotificationService;
  private graphClient: Client;
  private credential: TokenCredential;
  private readonly RETRY_ATTEMPTS = 3;
  private readonly TOKEN_REFRESH_BUFFER = 300; // 5分前にトークンを更新

  private constructor() {
    this.initializeGraphClient();
  }

  private async initializeGraphClient(): Promise<void> {
    try {
      this.credential = new ClientSecretCredential(
        process.env.AZURE_TENANT_ID!,
        process.env.AZURE_CLIENT_ID!,
        process.env.AZURE_CLIENT_SECRET!,
        {
          // トークン自動更新の設定
          retryOptions: {
            maxRetries: this.RETRY_ATTEMPTS,
            retryDelayInMs: 3000
          }
        }
      );

      const authProvider = new TokenCredentialAuthenticationProvider(this.credential, {
        // メール送信に必要な最小限のスコープを指定
        scopes: ['https://graph.microsoft.com/Mail.Send'],
        // トークンの自動更新を有効化
        tokenRefreshBufferSeconds: this.TOKEN_REFRESH_BUFFER
      });

      this.graphClient = Client.initWithMiddleware({
        authProvider,
        // タイムアウト設定を追加
        fetchOptions: {
          timeout: 10000 // 10秒
        }
      });

      // 初期認証テスト
      await this.validateAuth();
    } catch (error) {
      const err = error as Error;
      logger.logError(err, { 
        context: 'GraphClientAuth',
        message: 'Graph Client初期化エラー',
        details: err.message
      });
      throw new Error(`Microsoft Graph認証初期化エラー: ${err.message}`);
    }
  }

  private async validateAuth(): Promise<void> {
    try {
      const senderAccount = process.env.MS_SENDER_ACCOUNT || 'notification@mirai-const.co.jp';
      await this.graphClient
        .api(`/users/${senderAccount}`)
        .select('mail')
        .get();
    } catch (error) {
      const err = error as Error;
      logger.logError(err, {
        context: 'GraphClientAuth',
        message: '認証検証エラー',
        details: err.message
      });
      throw new Error('メール送信権限の検証に失敗しました');
    }
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async sendAlertEmail(alert: Alert): Promise<void> {
    let retryCount = 0;
    while (retryCount < this.RETRY_ATTEMPTS) {
      try {
        const recipients = process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [];
        if (recipients.length === 0) {
          logger.logWarning('メール受信者が設定されていません', {
            alertId: alert.id,
            alertType: alert.type
          });
          return;
        }

        const senderAccount = process.env.MS_SENDER_ACCOUNT || 'notification@mirai-const.co.jp';
        
        // メール送信前の権限チェック
        try {
          await this.validateAuth();
        } catch (error) {
          if (retryCount < this.RETRY_ATTEMPTS - 1) {
            await this.initializeGraphClient();
            retryCount++;
            continue;
          }
          throw error;
        }

        const message = {
          message: {
            subject: `[${alert.type.toUpperCase()}] システムアラート: ${alert.source}`,
            body: {
              contentType: 'HTML',
              content: this.generateAlertEmailTemplate(alert)
            },
            toRecipients: recipients.map(email => ({
              emailAddress: { address: email }
            })),
            from: {
              emailAddress: {
                address: process.env.SMTP_FROM || senderAccount
              }
            }
          },
          saveToSentItems: true
        };

        await this.graphClient
          .api(`/users/${senderAccount}/sendMail`)
          .post(message);

        logger.logInfo('アラートメール送信成功', {
          alertId: alert.id,
          recipients: recipients.length,
          alertType: alert.type,
          senderAccount,
          retryCount
        });
        return;

      } catch (error) {
        const err = error as Error;
        logger.logError(err, {
          context: 'AlertEmailNotification',
          alertId: alert.id,
          retryCount,
          message: 'メール送信エラー',
          details: err.message
        });

        if (retryCount < this.RETRY_ATTEMPTS - 1) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3秒待機
          continue;
        }
        throw new Error(`アラートメール送信エラー (${retryCount}回リトライ後): ${err.message}`);
      }
    }
  }

  private generateAlertEmailTemplate(alert: Alert): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${this.getAlertColor(alert.type)}; border-bottom: 2px solid ${this.getAlertColor(alert.type)}; padding-bottom: 10px;">
          ${this.getAlertTypeInJapanese(alert.type)} アラート
        </h2>
        <div style="margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>発生源:</strong> ${alert.source}</p>
          <p style="margin: 10px 0;"><strong>メッセージ:</strong> ${alert.message}</p>
          <p style="margin: 10px 0;"><strong>発生時刻:</strong> ${alert.timestamp.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
        </div>
        ${alert.metadata ? `
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <h3 style="margin-top: 0;">詳細情報:</h3>
            <pre style="margin: 0; white-space: pre-wrap;">${JSON.stringify(alert.metadata, null, 2)}</pre>
          </div>
        ` : ''}
      </div>
    `;
  }

  private getAlertColor(type: string): string {
    switch (type.toLowerCase()) {
      case 'critical':
        return '#FF0000';
      case 'error':
        return '#FF4444';
      case 'warning':
        return '#FFBB33';
      case 'info':
        return '#33B5E5';
      default:
        return '#333333';
    }
  }

  private getAlertTypeInJapanese(type: string): string {
    switch (type.toLowerCase()) {
      case 'critical':
        return '緊急';
      case 'error':
        return 'エラー';
      case 'warning':
        return '警告';
      case 'info':
        return '情報';
      default:
        return type;
    }
  }
}