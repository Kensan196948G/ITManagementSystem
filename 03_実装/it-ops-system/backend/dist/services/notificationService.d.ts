import http from 'http';
import { AuditLogService } from './auditLogService';
/**
 * 通知サービス
 * WebSocketを使用したリアルタイム通知機能を提供
 */
export declare class NotificationService {
    private static instance;
    private wss;
    private clients;
    private auditLogService;
    private initialized;
    private constructor();
    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(auditLogService?: AuditLogService): NotificationService;
    /**
     * 初期化処理
     */
    private initialize;
    /**
     * WebSocket接続ハンドラ
     * @param ws WebSocketインスタンス
     * @param request リクエスト情報
     */
    private handleConnection;
    /**
     * クライアントを削除
     * @param ws WebSocketインスタンス
     * @param userEmail ユーザーメールアドレス
     */
    private removeClient;
    /**
     * HTTP接続をWebSocketにアップグレード
     * @param request HTTPリクエスト
     * @param socket ソケット
     * @param head ヘッダー
     */
    handleUpgrade(request: http.IncomingMessage, socket: any, head: Buffer): Promise<void>;
    /**
     * JWT検証
     * @param token JWTトークン
     */
    private verifyJwt;
    /**
     * 通知を送信
     * @param notification 通知内容
     */
    sendNotification(notification: {
        userEmail?: string;
        type: string;
        severity: 'info' | 'warning' | 'error' | 'critical';
        title: string;
        message: string;
        data?: any;
    }): void;
    /**
     * クライアントセットにメッセージを送信
     * @param clients WebSocketのセット
     * @param message 送信メッセージ
     */
    private sendToClients;
    /**
     * パーミッション変更通知を送信
     * @param params パラメータ
     */
    sendPermissionChangeNotification(params: {
        userEmail: string;
        permission: string;
        action: 'grant' | 'revoke';
        operatorEmail: string;
    }): void;
    /**
     * システムステータス変更通知を送信
     * @param params パラメータ
     */
    sendSystemStatusNotification(params: {
        status: 'healthy' | 'degraded' | 'critical';
        previousStatus: 'healthy' | 'degraded' | 'critical';
        affectedComponents?: string[];
        message: string;
    }): void;
    /**
     * セキュリティアラート通知を送信
     * @param alert アラート情報
     */
    sendSecurityAlertNotification(alert: {
        id: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        type: string;
        message: string;
        source: string;
        details?: any;
    }): void;
    /**
     * リソース警告通知を送信
     * @param params パラメータ
     */
    sendResourceWarningNotification(params: {
        resource: 'cpu' | 'memory' | 'disk' | 'network';
        usagePercentage: number;
        threshold: number;
        details?: any;
    }): void;
}
export default NotificationService;
//# sourceMappingURL=notificationService.d.ts.map