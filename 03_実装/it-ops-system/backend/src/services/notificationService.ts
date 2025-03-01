import { Alert } from '../types/system';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential, TokenCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import LoggingService from './loggingService';

const logger = LoggingService.getInstance();
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.AUTH_MODE === 'mock';

export class NotificationService {
  private static instance: NotificationService;
  private graphClient!: Client;
  private credential!: TokenCredential;
  private readonly RETRY_ATTEMPTS = 3;
  private isMockMode: boolean;

  private constructor() {
    this.isMockMode = isDevelopment;
    
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
}
