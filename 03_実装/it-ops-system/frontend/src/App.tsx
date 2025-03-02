import React, { useEffect, useState } from 'react';
import { AppRouter } from './routes/AppRouter';
import websocket from './services/websocket';

function App() {
  const [connectionStatus, setConnectionStatus] = useState<string>('initializing');
  
  // WebSocket接続を初期化（プログレッシブエンハンスメント）
  useEffect(() => {
    console.log('Initializing connectivity...');
    
    // 最初にAPIヘルスチェックを行ってから接続を試みる
    fetch('/api/health')
      .then(response => {
        if (response.ok) {
          console.log('Backend is available, attempting WebSocket connection');
          // バックエンドが利用可能な場合のみWebSocketを試みる
          setTimeout(() => {
            websocket.connect();
          }, 2000); // 2秒の遅延を入れてリソース競合を避ける
        } else {
          console.warn('Backend API check failed, skipping WebSocket connection');
          setConnectionStatus('backend-unavailable');
        }
      })
      .catch(err => {
        console.error('API health check failed:', err);
        setConnectionStatus('backend-error');
      });
    
    // イベントリスナーを登録
    websocket.on('connected', (data: { timestamp: string }) => {
      console.log('WebSocket connected:', data);
      setConnectionStatus('connected');
    });
    
    websocket.on('disconnected', (data: { code: number; reason: string; timestamp: string }) => {
      console.log('WebSocket disconnected:', data);
      setConnectionStatus('disconnected');
    });
    
    websocket.on('error', (error: { error: unknown; timestamp: string }) => {
      console.error('WebSocket error:', error);
      // エラーが発生してもステータスは更新しない（フォールバックメカニズムが処理）
    });
    
    // システム状態更新の受信
    websocket.on('system_status', (status: any) => {
      console.log('System status update received:', status);
      // ここでシステム状態を更新するための処理を追加できます
    });
    
    // コンポーネントがアンマウントされた時に接続を閉じる
    return () => {
      console.log('Closing WebSocket connection...');
      websocket.disconnect();
    };
  }, []);
  
  // 接続ステータスをデバッグ表示（開発環境のみ）
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Connection status changed: ${connectionStatus}`);
    }
  }, [connectionStatus]);

  return (
    <div className="App">
      <AppRouter />
    </div>
  );
}

export default App;
