import express from 'express';
import WebSocket from 'ws';
import { createServer } from 'http';
import LoggingService from '../services/loggingService';

const router = express.Router();
const logger = LoggingService.getInstance();

/**
 * WebSocketハンドラークラス
 * WebSocket接続の管理と処理を行う
 */
export class WebSocketHandler {
  private static instance: WebSocketHandler;
  private wss: WebSocket.Server | null = null;
  private clients: Set<WebSocket> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): WebSocketHandler {
    if (!WebSocketHandler.instance) {
      WebSocketHandler.instance = new WebSocketHandler();
    }
    return WebSocketHandler.instance;
  }

  /**
   * WebSocketサーバーを初期化
   * @param server HTTPサーバーインスタンス
   */
  public initialize(server: any): void {
    if (this.wss) {
      this.cleanup();
    }

    // WebSocketサーバーを作成
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws'
    });

    logger.logInfo('WebSocket server initialized', {
      context: 'WebSocketHandler',
      path: '/ws'
    });

    // 接続イベントのハンドリング
    this.wss.on('connection', (ws: WebSocket) => {
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
  private handleConnection(ws: WebSocket): void {
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
    ws.on('message', (message: WebSocket.Data) => {
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
      } catch (err) {
        logger.logError(err as Error, {
          context: 'WebSocketHandler',
          message: 'Error parsing WebSocket message'
        });
      }
    });

    // エラーイベントのハンドリング
    ws.on('error', (error: Error) => {
      logger.logError(error, {
        context: 'WebSocketHandler',
        message: 'WebSocket error occurred'
      });
    });

    // 切断イベントのハンドリング
    ws.on('close', (code: number, reason: string) => {
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
      (ws as any).isAlive = true; // 生存フラグを立てる
    });

    // 生存フラグの初期化
    (ws as any).isAlive = true;
  }

  /**
   * すべてのクライアントにpingを送信して生存確認
   */
  private pingClients(): void {
    if (!this.wss) return;

    this.clients.forEach((ws) => {
      if ((ws as any).isAlive === false) {
        return ws.terminate(); // 死んでいるクライアントを切断
      }

      (ws as any).isAlive = false; // フラグをリセット
      ws.ping(() => {}); // ping送信
    });
  }

  /**
   * 特定のクライアントにメッセージを送信
   * @param ws 送信先のWebSocketインスタンス
   * @param data 送信するデータ
   */
  private sendToClient(ws: WebSocket, data: any): void {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    } catch (err) {
      logger.logError(err as Error, {
        context: 'WebSocketHandler',
        message: 'Error sending message to client'
      });
    }
  }

  /**
   * すべてのクライアントにブロードキャスト
   * @param data 送信するデータ
   */
  public broadcast(data: any): void {
    this.clients.forEach((client) => {
      this.sendToClient(client, data);
    });
  }

  /**
   * リソースのクリーンアップ
   */
  public cleanup(): void {
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
  public getConnectionsCount(): number {
    return this.clients.size;
  }
}

// システム状態を定期的に送信する
export const startSystemStatusUpdates = (wsHandler: WebSocketHandler): NodeJS.Timeout => {
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

export default router;
