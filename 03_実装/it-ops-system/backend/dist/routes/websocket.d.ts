declare const router: import("express-serve-static-core").Router;
/**
 * WebSocketハンドラークラス
 * WebSocket接続の管理と処理を行う
 */
export declare class WebSocketHandler {
    private static instance;
    private wss;
    private clients;
    private pingInterval;
    private constructor();
    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(): WebSocketHandler;
    /**
     * WebSocketサーバーを初期化
     * @param server HTTPサーバーインスタンス
     */
    initialize(server: any): void;
    /**
     * 新しいWebSocket接続のハンドリング
     * @param ws WebSocketインスタンス
     */
    private handleConnection;
    /**
     * すべてのクライアントにpingを送信して生存確認
     */
    private pingClients;
    /**
     * 特定のクライアントにメッセージを送信
     * @param ws 送信先のWebSocketインスタンス
     * @param data 送信するデータ
     */
    private sendToClient;
    /**
     * すべてのクライアントにブロードキャスト
     * @param data 送信するデータ
     */
    broadcast(data: any): void;
    /**
     * リソースのクリーンアップ
     */
    cleanup(): void;
    /**
     * 現在の接続数を取得
     */
    getConnectionsCount(): number;
}
export declare const startSystemStatusUpdates: (wsHandler: WebSocketHandler) => NodeJS.Timeout;
export default router;
//# sourceMappingURL=websocket.d.ts.map