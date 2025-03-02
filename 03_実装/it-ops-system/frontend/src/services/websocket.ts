/**
 * WebSocketクライアント - リアルタイム通信用
 */
class WebSocketClient {
  private socket: WebSocket | null = null;
  public url: string; // urlをpublicにして外部からアクセス可能に
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 5000; // msを5秒に増やしてリソース消費を抑える
  private listeners: Record<string, Function[]> = {};
  
  constructor(initialUrl: string = 'ws://localhost:3000/ws') {
    // アドレスが変更された場合のフォールバック
    if (process.env.NODE_ENV === 'development') {
      // 開発環境ではプロキシを経由するため、フロントエンドのURLを使用
      this.url = initialUrl;
      // ウィンドウオブジェクトに現在のURLを保存して、ページ間で共有
      if (typeof window !== 'undefined') {
        (window as any).__websocketUrl = this.url;
      }
    } else {
      // 本番環境ではプロセス環境変数から取得
      this.url = process.env.REACT_APP_WEBSOCKET_URL || initialUrl;
    }
    
    console.log(`WebSocket configured with URL: ${this.url}`);
  }

  /**
   * WebSocket接続を開始する
   * @param fallbackUrls 接続に失敗した場合に試すフォールバックURL
   */
  connect(fallbackUrls: string[] = []): void {
    if (this.socket) {
      this.disconnect();
    }

    try {
      console.log(`Connecting to WebSocket at ${this.url}`);
      
      // WebSocketインスタンスを作成する前にURL検証
      if (!this.url || !this.url.startsWith('ws')) {
        throw new Error(`Invalid WebSocket URL: ${this.url}`);
      }
      
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.reconnectAttempts = 0;
        this.emit('connected', { timestamp: new Date().toISOString() });
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('message', data);
          
          // 特定のタイプのメッセージに対するイベント発火
          if (data.type) {
            this.emit(data.type, data);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };
      
      this.socket.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        this.socket = null;
        this.emit('disconnected', { 
          code: event.code, 
          reason: event.reason, 
          timestamp: new Date().toISOString() 
        });
        
        // 再接続を試みる（接続が正常に切断された場合を除く）
        if (event.code !== 1000 && event.code !== 1001) {
          this.attemptReconnect();
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', { error, timestamp: new Date().toISOString() });
        
        // フォールバックURLがあれば次のURLを試す
        if (fallbackUrls.length > 0) {
          console.log(`Trying fallback WebSocket URL: ${fallbackUrls[0]}`);
          this.url = fallbackUrls[0];
          setTimeout(() => {
            this.connect(fallbackUrls.slice(1));
          }, 1000); // 1秒待ってから次のURLを試す
        }
      };
    } catch (err) {
      console.error('Failed to establish WebSocket connection:', err);
      this.emit('error', { error: err, timestamp: new Date().toISOString() });
    }
  }
  
  /**
   * WebSocket接続を再接続する
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    // 再接続の間隔を指数関数的に増加させる（バックオフ戦略）
    const timeout = this.reconnectTimeout * Math.pow(1.5, this.reconnectAttempts - 1);
    console.log(`Will try again in ${timeout}ms`);
    
    setTimeout(() => {
      this.connect();
    }, timeout);
  }
  
  /**
   * WebSocket接続を閉じる
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'Closed by client');
      this.socket = null;
    }
  }
  
  /**
   * サーバーにメッセージを送信する
   */
  send(data: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket is not connected');
      return false;
    }
    
    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket.send(message);
      return true;
    } catch (err) {
      console.error('Failed to send message:', err);
      return false;
    }
  }
  
  /**
   * イベントリスナーを登録する
   */
  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
  
  /**
   * イベントリスナーを削除する
   */
  off(event: string, callback?: Function): void {
    if (!this.listeners[event]) return;
    
    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      delete this.listeners[event];
    }
  }
  
  /**
   * イベントを発火する
   */
  private emit(event: string, data: any): void {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in '${event}' event handler:`, err);
      }
    });
  }
  
  /**
   * WebSocket接続の状態を取得する
   */
  get status(): string {
    if (!this.socket) return 'CLOSED';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }
  
  /**
   * WebSocket接続が開いているかどうかを確認する
   */
  get isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

// シングルトンインスタンス
// APIの健全性チェック用にフォールバックモードを実装
class WebSocketManager {
  private client: WebSocketClient;
  private usePolling: boolean = false;
  private pollingInterval: number = 30000; // 30秒に増やしてリソース消費を抑える
  private pollingTimer: NodeJS.Timeout | null = null;
  private fallbackUrls: string[] = [
    'ws://localhost:3000/ws',   // 開発環境のプロキシ経由のWebSocketエンドポイント
    'ws://localhost:3002/ws',   // バックエンドへの直接接続（フォールバック）
  ];
  
  constructor() {
    // 最初に標準のURLで接続を試行するWebSocketクライアントを作成
    this.client = new WebSocketClient();
    
    // WebSocketが失敗した場合のフォールバック処理を設定
    this.client.on('error', () => {
      if (!this.usePolling) {
        console.log('WebSocket connection failed, trying alternative URLs');
        
        // 現在のURLをリストから除外
        const currentUrl = this.client.url;
        const remainingUrls = this.fallbackUrls.filter(url => url !== currentUrl);
        
        if (remainingUrls.length > 0) {
          // 残りのURLがあれば試す
          this.client.connect(remainingUrls);
        } else {
          // すべてのURLが失敗した場合はポーリングにフォールバック
          console.log('All WebSocket URLs failed, falling back to polling');
          this.enablePolling();
        }
      }
    });
  }
  
  // WebSocketクライアントを取得
  getClient(): WebSocketClient {
    return this.client;
  }
  
  // 接続を開始
  connect(): void {
    // すでにポーリングモードの場合は新しいWebSocket接続を試みない
    if (this.usePolling) {
      return;
    }
    
    // 最初に標準のURLで試し、失敗した場合はフォールバックURLを試す
    this.client.connect(this.fallbackUrls.filter(url => url !== this.client.url));
  }
  
  // 接続を終了
  disconnect(): void {
    this.client.disconnect();
    this.disablePolling();
  }
  
  // ポーリングモードを有効化
  private enablePolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
    
    this.usePolling = true;
    this.pollingTimer = setInterval(() => {
      // 従来のAPIエンドポイントを使用してヘルスチェック
      fetch('/api/health')
        .then(response => {
          if (response.ok) {
            console.log('Health check successful via polling');
          } else {
            console.error('Health check failed via polling');
          }
        })
        .catch(err => {
          console.error('Health check request failed:', err);
        });
    }, this.pollingInterval);
  }
  
  // ポーリングモードを無効化
  private disablePolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.usePolling = false;
  }
  
  // 接続状態を確認
  get isConnected(): boolean {
    return this.client.isConnected;
  }
  
  // WebSocketを使用するかポーリングを使用するかを確認
  get isUsingPolling(): boolean {
    return this.usePolling;
  }
}

const websocketManager = new WebSocketManager();
export default websocketManager.getClient();
