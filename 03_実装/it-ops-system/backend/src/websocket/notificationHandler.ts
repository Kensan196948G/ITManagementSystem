import { WebSocket } from 'ws';
import { WebSocketHandler } from '../routes/websocket';
import LoggingService from '../services/loggingService';
import { verifyJwt } from '../utils/jwt';

const logger = LoggingService.getInstance();

/**
 * 通知メッセージの型定義
 */
export interface NotificationMessage {
  type: 'permission_change' | 'system_status' | 'security_alert' | 'resource_warning';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  data?: any;
}

/**
 * クライアント情報の型定義
 */
interface ClientInfo {
  userId: string;
  email: string;
  isAdmin: boolean;
}

/**
 * WebSocket通知ハンドラー
 * リアルタイム通知機能を提供
 */
export class NotificationHandler {
  private static instance: NotificationHandler;
  private wsHandler: WebSocketHandler;
  private clients: Map<WebSocket, ClientInfo>;
  
  private constructor() {
    this.wsHandler = WebSocketHandler.getInstance();
    this.clients = new Map();
    this.initialize();
  }
  
  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): NotificationHandler {
    if (!NotificationHandler.instance) {
      NotificationHandler.instance = new NotificationHandler();
    }
    return NotificationHandler.instance;
  }
  
  /**
   * 初期化処理
   */
  private initialize(): void {
    // 接続イベントのハンドリング
    this.wsHandler.on('connection', (ws: WebSocket, request: any) => {
      try {
        // トークンの検証
        const token = request.url.split('token=')[1]?.split('&')[0];
        if (!token) {
          ws.close(4001, 'Authentication required');
          return;
        }
        
        const decoded = verifyJwt(token);
        if (!decoded || !decoded.id || !decoded.email) {
          ws.close(4002, 'Invalid token');
          return;
        }
        
        // クライアント情報を保存
        this.clients.set(ws, {
          userId: decoded.id,
          email: decoded.email,
          isAdmin: decoded.isAdmin || false
        });
        
        logger.logInfo({
          context: 'WebSocket',
          message: 'Client connected',
          userId: decoded.id,
          email: decoded.email
        });
        
        // 接続成功通知
        ws.send(JSON.stringify({
          type: 'connection_established',
          message: 'Connected to notification service',
          timestamp: new Date().toISOString()
        }));
        
        // 切断イベントのハンドリング
        ws.on('close', () => {
          this.clients.delete(ws);
          logger.logInfo({
            context: 'WebSocket',
            message: 'Client disconnected',
            userId: decoded.id,
            email: decoded.email
          });
        });
        
        // エラーイベントのハンドリング
        ws.on('error', (error) => {
          logger.logError(error as Error, {
            context: 'WebSocket',
            message: 'WebSocket error',
            userId: decoded.id,
            email: decoded.email
          });
          this.clients.delete(ws);
        });
        
      } catch (error) {
        logger.logError(error as Error, {
          context: 'WebSocket',
          message: 'WebSocket connection error'
        });
        ws.close(4003, 'Internal server error');
      }
    });
  }
  
  /**
   * 特定のユーザーに通知を送信
   * @param userEmail 送信先ユーザーのメールアドレス
   * @param notification 通知メッセージ
   */
  public sendToUser(userEmail: string, notification: NotificationMessage): void {
    try {
      let sent = false;
      
      for (const [ws, clientInfo] of this.clients.entries()) {
        if (clientInfo.email.toLowerCase() === userEmail.toLowerCase()) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(notification));
            sent = true;
          }
        }
      }
      
      if (!sent) {
        logger.logInfo({
          context: 'WebSocket',
          message: 'User not connected',
          userEmail
        });
      }
    } catch (error) {
      logger.logError(error as Error, {
        context: 'WebSocket',
        message: 'Failed to send notification to user',
        userEmail
      });
    }
  }
  
  /**
   * 管理者に通知を送信
   * @param notification 通知メッセージ
   */
  public sendToAdmins(notification: NotificationMessage): void {
    try {
      let sent = false;
      
      for (const [ws, clientInfo] of this.clients.entries()) {
        if (clientInfo.isAdmin) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(notification));
            sent = true;
          }
        }
      }
      
      if (!sent) {
        logger.logInfo({
          context: 'WebSocket',
          message: 'No admin connected'
        });
      }
    } catch (error) {
      logger.logError(error as Error, {
        context: 'WebSocket',
        message: 'Failed to send notification to admins'
      });
    }
  }
  
  /**
   * すべてのクライアントに通知を送信
   * @param notification 通知メッセージ
   */
  public broadcast(notification: NotificationMessage): void {
    try {
      let sent = false;
      
      for (const [ws, _] of this.clients.entries()) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(notification));
          sent = true;
        }
      }
      
      if (!sent) {
        logger.logInfo({
          context: 'WebSocket',
          message: 'No clients connected'
        });
      }
    } catch (error) {
      logger.logError(error as Error, {
        context: 'WebSocket',
        message: 'Failed to broadcast notification'
      });
    }
  }
  
  /**
   * パーミッション変更通知を送信
   * @param userEmail 対象ユーザーのメールアドレス
   * @param action 変更アクション ('grant' | 'revoke')
   * @param permission 変更されたパーミッション
   * @param operatorEmail 操作者のメールアドレス
   */
  public sendPermissionChangeNotification(
    userEmail: string,
    action: 'grant' | 'revoke',
    permission: string,
    operatorEmail: string
  ): void {
    // 対象ユーザーへの通知
    this.sendToUser(userEmail, {
      type: 'permission_change',
      severity: 'info',
      title: 'パーミッション変更通知',
      message: `あなたのGraph APIパーミッション "${permission}" が${action === 'grant' ? '付与' : '削除'}されました`,
      timestamp: new Date().toISOString(),
      data: {
        action,
        permission,
        operatorEmail
      }
    });
    
    // 管理者への通知
    this.sendToAdmins({
      type: 'permission_change',
      severity: 'info',
      title: 'パーミッション変更通知',
      message: `ユーザー ${userEmail} のパーミッション "${permission}" が${action === 'grant' ? '付与' : '削除'}されました`,
      timestamp: new Date().toISOString(),
      data: {
        userEmail,
        action,
        permission,
        operatorEmail
      }
    });
  }
  
  /**
   * システムステータス変更通知を送信
   * @param status システムステータス
   * @param previousStatus 前回のシステムステータス
   */
  public sendSystemStatusNotification(
    status: 'healthy' | 'degraded' | 'critical',
    previousStatus?: 'healthy' | 'degraded' | 'critical'
  ): void {
    // ステータスが変わっていない場合は通知しない
    if (previousStatus && status === previousStatus) {
      return;
    }
    
    let severity: 'info' | 'warning' | 'error' | 'critical';
    let title: string;
    let message: string;
    
    switch (status) {
      case 'healthy':
        severity = 'info';
        title = 'システムステータス: 正常';
        message = 'システムは正常に動作しています';
        break;
      case 'degraded':
        severity = 'warning';
        title = 'システムステータス: 劣化';
        message = 'システムの一部機能が正常に動作していません';
        break;
      case 'critical':
        severity = 'critical';
        title = 'システムステータス: 危機的';
        message = '重大な問題が発生しています。システム管理者に連絡してください';
        break;
    }
    
    // すべてのユーザーに通知
    this.broadcast({
      type: 'system_status',
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
      data: {
        status,
        previousStatus
      }
    });
  }
  
  /**
   * セキュリティアラート通知を送信
   * @param alert セキュリティアラート情報
   */
  public sendSecurityAlertNotification(alert: {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    message: string;
  }): void {
    let notificationSeverity: 'info' | 'warning' | 'error' | 'critical';
    
    switch (alert.severity) {
      case 'low':
        notificationSeverity = 'info';
        break;
      case 'medium':
        notificationSeverity = 'warning';
        break;
      case 'high':
        notificationSeverity = 'error';
        break;
      case 'critical':
        notificationSeverity = 'critical';
        break;
    }
    
    // 管理者にのみ通知
    this.sendToAdmins({
      type: 'security_alert',
      severity: notificationSeverity,
      title: `セキュリティアラート: ${alert.type}`,
      message: alert.message,
      timestamp: new Date().toISOString(),
      data: alert
    });
  }
}

export default NotificationHandler;