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
 * WebSocket通知ハンドラー
 * リアルタイム通知機能を提供
 */
export declare class NotificationHandler {
    private static instance;
    private wsHandler;
    private clients;
    private constructor();
    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(): NotificationHandler;
    /**
     * 初期化処理
     */
    private initialize;
    /**
     * 特定のユーザーに通知を送信
     * @param userEmail 送信先ユーザーのメールアドレス
     * @param notification 通知メッセージ
     */
    sendToUser(userEmail: string, notification: NotificationMessage): void;
    /**
     * 管理者に通知を送信
     * @param notification 通知メッセージ
     */
    sendToAdmins(notification: NotificationMessage): void;
    /**
     * すべてのクライアントに通知を送信
     * @param notification 通知メッセージ
     */
    broadcast(notification: NotificationMessage): void;
    /**
     * パーミッション変更通知を送信
     * @param userEmail 対象ユーザーのメールアドレス
     * @param action 変更アクション ('grant' | 'revoke')
     * @param permission 変更されたパーミッション
     * @param operatorEmail 操作者のメールアドレス
     */
    sendPermissionChangeNotification(userEmail: string, action: 'grant' | 'revoke', permission: string, operatorEmail: string): void;
    /**
     * システムステータス変更通知を送信
     * @param status システムステータス
     * @param previousStatus 前回のシステムステータス
     */
    sendSystemStatusNotification(status: 'healthy' | 'degraded' | 'critical', previousStatus?: 'healthy' | 'degraded' | 'critical'): void;
    /**
     * セキュリティアラート通知を送信
     * @param alert セキュリティアラート情報
     */
    sendSecurityAlertNotification(alert: {
        id: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        type: string;
        message: string;
    }): void;
}
export default NotificationHandler;
//# sourceMappingURL=notificationHandler.d.ts.map