"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSystemStatusUpdates = exports.WebSocketHandler = void 0;
const express_1 = __importDefault(require("express"));
const ws_1 = __importDefault(require("ws"));
const loggingService_1 = __importDefault(require("../services/loggingService"));
const router = express_1.default.Router();
const logger = loggingService_1.default.getInstance();
/**
 * WebSocketハンドラークラス
 * WebSocket接続の管理と処理を行う
 */
class WebSocketHandler {
    constructor() {
        this.wss = null;
        this.clients = new Set();
        this.pingInterval = null;
    }
    /**
     * シングルトンインスタンスを取得
     */
    static getInstance() {
        if (!WebSocketHandler.instance) {
            WebSocketHandler.instance = new WebSocketHandler();
        }
        return WebSocketHandler.instance;
    }
    /**
     * WebSocketサーバーを初期化
     * @param server HTTPサーバーインスタンス
     */
    initialize(server) {
        if (this.wss) {
            this.cleanup();
        }
        // WebSocketサーバーを作成
        this.wss = new ws_1.default.Server({
            server,
            path: '/ws'
        });
        logger.logInfo('WebSocket server initialized', {
            context: 'WebSocketHandler',
            path: '/ws'
        });
        // 接続イベントのハンドリング
        this.wss.on('connection', (ws) => {
            this.handleConnection(ws);
        });
        // クライアントの生存確認のためのpingを定期的に送信
        this.pingInterval = setInterval(() => {
            this.pingClients();
        }, 30000); // 30秒ごとにping
    }
    /**
     * 新しいWebSocket接続のハンドリング
     * @param ws WebSocketインスタンス
     */
    handleConnection(ws) {
        logger.logInfo('New WebSocket client connected', {
            context: 'WebSocketHandler',
            clientsCount: this.clients.size + 1
        });
        // クライアントをセットに追加
        this.clients.add(ws);
        // 接続確認メッセージを送信
        this.sendToClient(ws, {
            type: 'connection',
            message: 'WebSocket connection established',
            timestamp: new Date().toISOString()
        });
        // メッセージイベントのハンドリング
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                logger.logInfo('Received WebSocket message', {
                    context: 'WebSocketHandler',
                    messageType: data.type || 'unknown'
                });
                // メッセージにレスポンス
                this.sendToClient(ws, {
                    type: 'response',
                    message: 'Message received',
                    timestamp: new Date().toISOString()
                });
            }
            catch (err) {
                logger.logError(err, {
                    context: 'WebSocketHandler',
                    message: 'Error parsing WebSocket message'
                });
            }
        });
        // エラーイベントのハンドリング
        ws.on('error', (error) => {
            logger.logError(error, {
                context: 'WebSocketHandler',
                message: 'WebSocket error occurred'
            });
        });
        // 切断イベントのハンドリング
        ws.on('close', (code, reason) => {
            this.clients.delete(ws);
            logger.logInfo('WebSocket client disconnected', {
                context: 'WebSocketHandler',
                code,
                reason: reason || 'No reason provided',
                remainingClients: this.clients.size
            });
        });
        // pong受信のハンドリング
        ws.on('pong', () => {
            ws.isAlive = true; // 生存フラグを立てる
        });
        // 生存フラグの初期化
        ws.isAlive = true;
    }
    /**
     * すべてのクライアントにpingを送信して生存確認
     */
    pingClients() {
        if (!this.wss)
            return;
        this.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                return ws.terminate(); // 死んでいるクライアントを切断
            }
            ws.isAlive = false; // フラグをリセット
            ws.ping(() => { }); // ping送信
        });
    }
    /**
     * 特定のクライアントにメッセージを送信
     * @param ws 送信先のWebSocketインスタンス
     * @param data 送信するデータ
     */
    sendToClient(ws, data) {
        try {
            if (ws.readyState === ws_1.default.OPEN) {
                ws.send(JSON.stringify(data));
            }
        }
        catch (err) {
            logger.logError(err, {
                context: 'WebSocketHandler',
                message: 'Error sending message to client'
            });
        }
    }
    /**
     * すべてのクライアントにブロードキャスト
     * @param data 送信するデータ
     */
    broadcast(data) {
        this.clients.forEach((client) => {
            this.sendToClient(client, data);
        });
    }
    /**
     * リソースのクリーンアップ
     */
    cleanup() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
        this.clients.clear();
    }
    /**
     * 現在の接続数を取得
     */
    getConnectionsCount() {
        return this.clients.size;
    }
}
exports.WebSocketHandler = WebSocketHandler;
// システム状態を定期的に送信する
const startSystemStatusUpdates = (wsHandler) => {
    return setInterval(() => {
        const status = {
            type: 'system_status',
            status: 'ok',
            connections: wsHandler.getConnectionsCount(),
            timestamp: new Date().toISOString(),
            memory: process.memoryUsage()
        };
        wsHandler.broadcast(status);
    }, 10000); // 10秒ごとに更新
};
exports.startSystemStatusUpdates = startSystemStatusUpdates;
exports.default = router;
//# sourceMappingURL=websocket.js.map