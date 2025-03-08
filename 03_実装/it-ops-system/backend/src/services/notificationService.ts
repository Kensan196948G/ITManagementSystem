import WebSocket from 'ws';
import http from 'http';
import url from 'url';
import { AuditLogService } from './auditLogService';
import { verifyJwt } from '../utils/jwt';

/**
 * 通知サービス
 * WebSocketを使用したリアルタイム通知機能を提供
 */
export class NotificationService {
  private static instance: NotificationService;
  private wss: WebSocket.Server;
  private clients: Map<string, Set<WebSocket>> = new Map();
  private auditLogService: AuditLogService;
  private initialized: boolean = false;

  private constructor() {
    this.auditLogService = AuditLogService.getInstance();
    this.wss = new WebSocket.Server({ noServer: true });
    this.initialize();
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * 初期化処理
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // WebSocketサーバーの接続イベントを設定
    this.wss.on('connection', (ws: WebSocket, request: any) => {
      this.handleConnection(ws, request);
    });

    this.initialized = true;
    this.auditLogService.logInfo({
      userId: 'system',
      event: 'NotificationService initialized',
      details: { timestamp: new Date().toISOString() }
    });
  }

  /**
   * WebSocket接続ハンドラ
   * @param ws WebSocketインスタンス
   * @param request リクエスト情報
   */
  private handleConnection(ws: WebSocket, request: { userEmail: string }): void {
    const { userEmail } = request;

    // クライアントマップにユーザーを追加
    if (!this.clients.has(userEmail)) {
      this.clients.set(userEmail, new Set());
    }
    this.clients.get(userEmail)?.add(ws);

    // 接続確立メッセージを送信
    ws.send(JSON.stringify({
      type: 'connection_established',
      message: 'Connected to notification service',
      timestamp: new Date().toISOString()
    }));

    // メッセージイベントリスナー
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        // クライアントからのメッセージ処理（必要に応じて実装）
        this.auditLogService.logInfo({
          userId: userEmail,
          event: 'WebSocket message received',
          details: { type: data.type }
        });
      } catch (error) {
        this.auditLogService.logError(error as Error, {
          userId: userEmail,
          event: 'WebSocket message parse error',
          details: { message }
        });
      }
    });

    // 切断イベントリスナー
    ws.on('close', () => {
      this.removeClient(ws, userEmail);
      this.auditLogService.logInfo({
        userId: userEmail,
        event: 'WebSocket connection closed',
        details: { timestamp: new Date().toISOString() }
      });
    });

    this.auditLogService.logInfo({
      userId: userEmail,
      event: 'WebSocket connection established',
      details: { timestamp: new Date().toISOString() }
    });
  }

  /**
   * クライアントを削除
   * @param ws WebSocketインスタンス
   * @param userEmail ユーザーメールアドレス
   */
  private removeClient(ws: WebSocket, userEmail: string): void {
    const userClients = this.clients.get(userEmail);
    if (userClients) {
      userClients.delete(ws);
      if (userClients.size === 0) {
        this.clients.delete(userEmail);
      }
    }
  }

  /**
   * HTTP接続をWebSocketにアップグレード
   * @param request HTTPリクエスト
   * @param socket ソケット
   * @param head ヘッダー
   */
  public async handleUpgrade(
    request: http.IncomingMessage,
    socket: any,
    head: Buffer
  ): Promise<void> {
    try {
      // URLからトークンを取得
      const { query } = url.parse(request.url || '', true);
      const token = query.token as string;

      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      // トークンを検証
      const payload = await this.verifyJwt(token);
      const userEmail = payload.email;

      if (!userEmail) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      // WebSocketにアップグレード
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, { userEmail });
      });
    } catch (error) {
      this.auditLogService.logError(error as Error, {
        userId: 'unknown',
        event: 'WebSocket upgrade failed',
        details: { url: request.url }
      });
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  }

  /**
   * JWT検証
   * @param token JWTトークン
   */
  private async verifyJwt(token: string): Promise<any> {
    return verifyJwt(token);
  }

  /**
   * 通知を送信
   * @param notification 通知内容
   */
  public sendNotification(notification: {
    userEmail?: string;
    type: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    message: string;
    data?: any;
  }): void {
    const { userEmail, ...notificationData } = notification;
    const timestamp = new Date().toISOString();
    const message = JSON.stringify({
      ...notificationData,
      timestamp
    });

    try {
      if (userEmail) {
        // 特定のユーザーに送信
        const userClients = this.clients.get(userEmail);
        if (userClients) {
          this.sendToClients(userClients, message);
        }
      } else {
        // 全ユーザーに送信
        for (const clients of this.clients.values()) {
          this.sendToClients(clients, message);
        }
      }

      // 監査ログに記録
      this.auditLogService.logSecurity({
        userId: userEmail || 'system',
        event: 'Notification sent',
        severity: notification.severity === 'critical' ? 'critical' : 
                 notification.severity === 'error' ? 'high' : 
                 notification.severity === 'warning' ? 'medium' : 'low',
        details: {
          type: notification.type,
          title: notification.title,
          timestamp
        }
      });
    } catch (error) {
      this.auditLogService.logError(error as Error, {
        userId: userEmail || 'system',
        event: 'Failed to send notification',
        details: {
          type: notification.type,
          title: notification.title
        }
      });
    }
  }

  /**
   * クライアントセットにメッセージを送信
   * @param clients WebSocketのセット
   * @param message 送信メッセージ
   */
  private sendToClients(clients: Set<WebSocket>, message: string): void {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  /**
   * パーミッション変更通知を送信
   * @param params パラメータ
   */
  public sendPermissionChangeNotification(params: {
    userEmail: string;
    permission: string;
    action: 'grant' | 'revoke';
    operatorEmail: string;
  }): void {
    const { userEmail, permission, action, operatorEmail } = params;
    const actionText = action === 'grant' ? '付与' : '削除';

    this.sendNotification({
      userEmail,
      type: 'permission_change',
      severity: 'info',
      title: 'パーミッション変更通知',
      message: `あなたのGraph APIパーミッション "${permission}" が${actionText}されました`,
      data: {
        permission,
        action,
        operatorEmail
      }
    });
  }

  /**
   * システムステータス変更通知を送信
   * @param params パラメータ
   */
  public sendSystemStatusNotification(params: {
    status: 'healthy' | 'degraded' | 'critical';
    previousStatus: 'healthy' | 'degraded' | 'critical';
    affectedComponents?: string[];
    message: string;
  }): void {
    const { status, previousStatus, affectedComponents, message } = params;
    
    // ステータスに応じた重要度を設定
    let severity: 'info' | 'warning' | 'error' = 'info';
    if (status === 'critical') {
      severity = 'error';
    } else if (status === 'degraded') {
      severity = 'warning';
    }

    // ステータスの日本語表記
    const statusText = status === 'healthy' ? '正常' : 
                      status === 'degraded' ? '劣化' : '危機的';

    this.sendNotification({
      type: 'system_status',
      severity,
      title: `システムステータス: ${statusText}`,
      message,
      data: {
        status,
        previousStatus,
        affectedComponents
      }
    });
  }

  /**
   * セキュリティアラート通知を送信
   * @param alert アラート情報
   */
  public sendSecurityAlertNotification(alert: {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    message: string;
    source: string;
    details?: any;
  }): void {
    // アラートの重要度に応じた通知の重要度を設定
    let severity: 'info' | 'warning' | 'error' = 'info';
    if (alert.severity === 'critical' || alert.severity === 'high') {
      severity = 'error';
    } else if (alert.severity === 'medium') {
      severity = 'warning';
    }

    // アラートタイプの日本語表記
    let typeText = alert.type;
    if (alert.type === 'unauthorized_access') {
      typeText = '不正アクセス';
    } else if (alert.type === 'suspicious_activity') {
      typeText = '不審な活動';
    } else if (alert.type === 'data_breach') {
      typeText = 'データ漏洩';
    }

    this.sendNotification({
      type: 'security_alert',
      severity,
      title: `セキュリティアラート: ${typeText}`,
      message: alert.message,
      data: {
        id: alert.id,
        severity: alert.severity,
        type: alert.type,
        source: alert.source,
        details: alert.details
      }
    });
  }

  /**
   * リソース警告通知を送信
   * @param params パラメータ
   */
  public sendResourceWarningNotification(params: {
    resource: 'cpu' | 'memory' | 'disk' | 'network';
    usagePercentage: number;
    threshold: number;
    details?: any;
  }): void {
    const { resource, usagePercentage, threshold, details } = params;
    
    // 使用率に応じた重要度を設定
    let severity: 'info' | 'warning' | 'error' = 'warning';
    if (usagePercentage > 95) {
      severity = 'error';
    } else if (usagePercentage <= threshold) {
      severity = 'info';
    }

    // リソースの日本語表記
    const resourceText = resource === 'cpu' ? 'CPU' : 
                        resource === 'memory' ? 'メモリ' : 
                        resource === 'disk' ? 'ディスク' : 'ネットワーク';

    this.sendNotification({
      type: 'resource_warning',
      severity,
      title: `リソース警告: ${resourceText}使用率`,
      message: `${resourceText}使用率が${usagePercentage.toFixed(1)}%に達しました（閾値: ${threshold}%）`,
      data: {
        resource,
        usagePercentage,
        threshold,
        details
      }
    });
  }
}

export default NotificationService;
