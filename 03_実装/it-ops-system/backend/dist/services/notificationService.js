"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const ws_1 = __importDefault(require("ws"));
const url_1 = __importDefault(require("url"));
const auditLogService_1 = require("./auditLogService");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
/**
 * 通知サービス
 * WebSocketを使用したリアルタイム通知機能を提供
 */
class NotificationService {
    constructor(auditLogService) {
        this.clients = new Map();
        this.initialized = false;
        this.auditLogService = auditLogService;
        this.wss = new ws_1.default.Server({ noServer: true });
        this.initialize();
    }
    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(auditLogService) {
        if (!NotificationService.instance) {
            // auditLogServiceが指定されていない場合は、getInstanceSyncを使用
            const logService = auditLogService || auditLogService_1.AuditLogService.getInstanceSync();
            NotificationService.instance = new NotificationService(logService);
        }
        return NotificationService.instance;
    }
    /**
     * 初期化処理
     */
    async initialize() {
        if (this.initialized)
            return;
        // WebSocketサーバーの接続イベントを設定
        this.wss.on('connection', (ws, request) => {
            this.handleConnection(ws, request);
        });
        this.initialized = true;
        this.auditLogService.log({
            userId: 'system',
            action: 'INITIALIZE',
            type: auditLogService_1.AuditLogType.SYSTEM_CONFIG_CHANGE,
            details: {
                event: 'NotificationService initialized',
                timestamp: new Date().toISOString()
            }
        });
    }
    /**
     * WebSocket接続ハンドラ
     * @param ws WebSocketインスタンス
     * @param request リクエスト情報
     */
    handleConnection(ws, request) {
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
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                // クライアントからのメッセージ処理（必要に応じて実装）
                this.auditLogService.log({
                    userId: userEmail,
                    action: 'RECEIVE',
                    type: auditLogService_1.AuditLogType.SYSTEM_CONFIG_CHANGE,
                    details: {
                        event: 'WebSocket message received',
                        type: data.type
                    }
                });
            }
            catch (error) {
                this.auditLogService.log({
                    userId: userEmail,
                    action: 'ERROR',
                    type: auditLogService_1.AuditLogType.SYSTEM_CONFIG_CHANGE,
                    details: {
                        event: 'WebSocket message parse error',
                        error: error.message,
                        message
                    }
                });
            }
        });
        // 切断イベントリスナー
        ws.on('close', () => {
            this.removeClient(ws, userEmail);
            this.auditLogService.log({
                userId: userEmail,
                action: 'DISCONNECT',
                type: auditLogService_1.AuditLogType.SYSTEM_CONFIG_CHANGE,
                details: {
                    event: 'WebSocket connection closed',
                    timestamp: new Date().toISOString()
                }
            });
        });
        this.auditLogService.log({
            userId: userEmail,
            action: 'CONNECT',
            type: auditLogService_1.AuditLogType.SYSTEM_CONFIG_CHANGE,
            details: {
                event: 'WebSocket connection established',
                timestamp: new Date().toISOString()
            }
        });
    }
    /**
     * クライアントを削除
     * @param ws WebSocketインスタンス
     * @param userEmail ユーザーメールアドレス
     */
    removeClient(ws, userEmail) {
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
    async handleUpgrade(request, socket, head) {
        try {
            // URLからトークンを取得
            const { query } = url_1.default.parse(request.url || '', true);
            const token = query.token;
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
        }
        catch (error) {
            this.auditLogService.log({
                userId: 'unknown',
                action: 'ERROR',
                type: auditLogService_1.AuditLogType.SYSTEM_CONFIG_CHANGE,
                details: {
                    event: 'WebSocket upgrade failed',
                    error: error.message,
                    url: request.url
                }
            });
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
        }
    }
    /**
     * JWT検証
     * @param token JWTトークン
     */
    async verifyJwt(token) {
        return new Promise((resolve, reject) => {
            jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret, (err, decoded) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(decoded);
                }
            });
        });
    }
    /**
     * 通知を送信
     * @param notification 通知内容
     */
    sendNotification(notification) {
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
            }
            else {
                // 全ユーザーに送信
                for (const clients of this.clients.values()) {
                    this.sendToClients(clients, message);
                }
            }
            // 監査ログに記録
            this.auditLogService.log({
                userId: userEmail || 'system',
                action: 'NOTIFY',
                type: auditLogService_1.AuditLogType.SYSTEM_CONFIG_CHANGE,
                details: {
                    event: 'Notification sent',
                    severity: notification.severity === 'critical' ? 'critical' :
                        notification.severity === 'error' ? 'high' :
                            notification.severity === 'warning' ? 'medium' : 'low',
                    type: notification.type,
                    title: notification.title,
                    timestamp
                }
            });
        }
        catch (error) {
            this.auditLogService.log({
                userId: userEmail || 'system',
                action: 'ERROR',
                type: auditLogService_1.AuditLogType.SYSTEM_CONFIG_CHANGE,
                details: {
                    event: 'Failed to send notification',
                    error: error.message,
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
    sendToClients(clients, message) {
        for (const client of clients) {
            if (client.readyState === ws_1.default.OPEN) {
                client.send(message);
            }
        }
    }
    /**
     * パーミッション変更通知を送信
     * @param params パラメータ
     */
    sendPermissionChangeNotification(params) {
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
    sendSystemStatusNotification(params) {
        const { status, previousStatus, affectedComponents, message } = params;
        // ステータスに応じた重要度を設定
        let severity = 'info';
        if (status === 'critical') {
            severity = 'error';
        }
        else if (status === 'degraded') {
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
    sendSecurityAlertNotification(alert) {
        // アラートの重要度に応じた通知の重要度を設定
        let severity = 'info';
        if (alert.severity === 'critical' || alert.severity === 'high') {
            severity = 'error';
        }
        else if (alert.severity === 'medium') {
            severity = 'warning';
        }
        // アラートタイプの日本語表記
        let typeText = alert.type;
        if (alert.type === 'unauthorized_access') {
            typeText = '不正アクセス';
        }
        else if (alert.type === 'suspicious_activity') {
            typeText = '不審な活動';
        }
        else if (alert.type === 'data_breach') {
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
    sendResourceWarningNotification(params) {
        const { resource, usagePercentage, threshold, details } = params;
        // 使用率に応じた重要度を設定
        let severity = 'warning';
        if (usagePercentage > 95) {
            severity = 'error';
        }
        else if (usagePercentage <= threshold) {
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
exports.NotificationService = NotificationService;
exports.default = NotificationService;
//# sourceMappingURL=notificationService.js.map