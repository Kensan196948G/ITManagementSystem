"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationHandler = void 0;
const ws_1 = require("ws");
const websocket_1 = require("../routes/websocket");
const loggingService_1 = __importDefault(require("../services/loggingService"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// JWT秘密鍵
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// verifyJwt関数の再実装
const verifyJwt = (token) => {
    return new Promise((resolve, reject) => {
        jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(decoded);
            }
        });
    });
};
const logger = loggingService_1.default.getInstance();
/**
 * WebSocket通知ハンドラー
 * リアルタイム通知機能を提供
 */
class NotificationHandler {
    constructor() {
        this.wsHandler = websocket_1.WebSocketHandler.getInstance();
        this.clients = new Map();
        this.initialize();
    }
    /**
     * シングルトンインスタンスを取得
     */
    static getInstance() {
        if (!NotificationHandler.instance) {
            NotificationHandler.instance = new NotificationHandler();
        }
        return NotificationHandler.instance;
    }
    /**
     * 初期化処理
     */
    initialize() {
        // WebSocketHandlerのinitializeメソッドが呼び出された後に
        // 接続イベントが発生したときに処理を行うコールバック関数を登録する
        // WebSocketServerのインスタンスを取得
        const wss = this.wsHandler.wss;
        if (!wss) {
            logger.logError(new Error('WebSocketServer not initialized'), {
                context: 'NotificationHandler',
                message: 'Failed to initialize notification handler'
            });
            return;
        }
        // 接続イベントのリスナーをすべて削除
        wss.removeAllListeners('connection');
        // 新しい接続イベントハンドラを追加
        wss.on('connection', async (ws, request) => {
            try {
                // トークンの検証
                const token = request.url?.split('token=')[1]?.split('&')[0];
                if (!token) {
                    ws.close(4001, 'Authentication required');
                    return;
                }
                try {
                    const decoded = await verifyJwt(token);
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
                        logger.logError(error, {
                            context: 'WebSocket',
                            message: 'WebSocket error',
                            userId: decoded.id,
                            email: decoded.email
                        });
                        this.clients.delete(ws);
                    });
                }
                catch (tokenError) {
                    logger.logError(tokenError, {
                        context: 'WebSocket',
                        message: 'Token verification error'
                    });
                    ws.close(4002, 'Invalid token');
                    return;
                }
            }
            catch (error) {
                logger.logError(error, {
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
    sendToUser(userEmail, notification) {
        try {
            let sent = false;
            for (const [ws, clientInfo] of this.clients.entries()) {
                if (clientInfo.email.toLowerCase() === userEmail.toLowerCase()) {
                    if (ws.readyState === ws_1.WebSocket.OPEN) {
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
        }
        catch (error) {
            logger.logError(error, {
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
    sendToAdmins(notification) {
        try {
            let sent = false;
            for (const [ws, clientInfo] of this.clients.entries()) {
                if (clientInfo.isAdmin) {
                    if (ws.readyState === ws_1.WebSocket.OPEN) {
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
        }
        catch (error) {
            logger.logError(error, {
                context: 'WebSocket',
                message: 'Failed to send notification to admins'
            });
        }
    }
    /**
     * すべてのクライアントに通知を送信
     * @param notification 通知メッセージ
     */
    broadcast(notification) {
        try {
            let sent = false;
            for (const [ws, _] of this.clients.entries()) {
                if (ws.readyState === ws_1.WebSocket.OPEN) {
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
        }
        catch (error) {
            logger.logError(error, {
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
    sendPermissionChangeNotification(userEmail, action, permission, operatorEmail) {
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
    sendSystemStatusNotification(status, previousStatus) {
        // ステータスが変わっていない場合は通知しない
        if (previousStatus && status === previousStatus) {
            return;
        }
        let severity;
        let title;
        let message;
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
    sendSecurityAlertNotification(alert) {
        let notificationSeverity;
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
exports.NotificationHandler = NotificationHandler;
exports.default = NotificationHandler;
//# sourceMappingURL=notificationHandler.js.map