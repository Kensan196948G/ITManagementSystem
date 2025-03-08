# WebSocket通信プロトコル仕様

## 概要

本ドキュメントは、IT運用システムにおけるWebSocket通信プロトコルの詳細な仕様を定義します。このプロトコルは、リアルタイム通知機能を提供し、ISO 20000（ITサービスマネジメント）およびISO 27001（情報セキュリティマネジメント）の要件に準拠して設計されています。

## バージョン情報

- プロトコルバージョン: 1.0.0
- 最終更新日: 2025年3月8日

## 接続情報

### WebSocketエンドポイント

```
wss://[your-domain]/ws
```

### 認証

WebSocket接続時には、クエリパラメータとしてJWTトークンを指定する必要があります。

```
wss://[your-domain]/ws?token={jwt-token}
```

### 接続エラーコード

| コード | 説明 |
|--------|------|
| 4001 | 認証が必要です |
| 4002 | 無効なトークンです |
| 4003 | 内部サーバーエラー |
| 4004 | セッションタイムアウト |

## メッセージフォーマット

WebSocketを通じて送受信されるすべてのメッセージはJSON形式です。

### 基本メッセージ構造

```json
{
  "type": "message_type",
  "severity": "info|warning|error|critical",
  "title": "メッセージタイトル",
  "message": "メッセージ本文",
  "timestamp": "2025-03-08T12:34:56Z",
  "data": {
    // メッセージタイプ固有のデータ
  }
}
```

### 共通フィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| type | string | メッセージタイプ |
| severity | string | 重要度（info, warning, error, critical） |
| title | string | メッセージタイトル |
| message | string | メッセージ本文 |
| timestamp | string | ISO 8601形式のタイムスタンプ |
| data | object | メッセージタイプ固有のデータ（オプション） |

## メッセージタイプ

### 接続確立メッセージ

クライアントが接続した際に送信されるメッセージです。

```json
{
  "type": "connection_established",
  "message": "Connected to notification service",
  "timestamp": "2025-03-08T12:34:56Z"
}
```

### パーミッション変更通知

ユーザーのGraph APIパーミッションが変更された際に送信されるメッセージです。

```json
{
  "type": "permission_change",
  "severity": "info",
  "title": "パーミッション変更通知",
  "message": "あなたのGraph APIパーミッション \"User.Read\" が付与されました",
  "timestamp": "2025-03-08T12:34:56Z",
  "data": {
    "action": "grant",
    "permission": "User.Read",
    "operatorEmail": "admin@example.com"
  }
}
```

#### データフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| action | string | 変更アクション（"grant" または "revoke"） |
| permission | string | 変更されたパーミッション |
| operatorEmail | string | 操作を実行した管理者のメールアドレス |

### システムステータス変更通知

システムの状態が変化した際に送信されるメッセージです。

```json
{
  "type": "system_status",
  "severity": "warning",
  "title": "システムステータス: 劣化",
  "message": "システムの一部機能が正常に動作していません",
  "timestamp": "2025-03-08T12:34:56Z",
  "data": {
    "status": "degraded",
    "previousStatus": "healthy",
    "affectedComponents": ["database"]
  }
}
```

#### データフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| status | string | 新しいシステムステータス（"healthy", "degraded", "critical"） |
| previousStatus | string | 以前のシステムステータス |
| affectedComponents | array | 影響を受けているコンポーネントの配列 |

### セキュリティアラート通知

セキュリティアラートが検出された際に送信されるメッセージです。

```json
{
  "type": "security_alert",
  "severity": "critical",
  "title": "セキュリティアラート: 不正アクセス",
  "message": "不正アクセスの試行が検出されました",
  "timestamp": "2025-03-08T12:34:56Z",
  "data": {
    "id": "alert123",
    "severity": "critical",
    "type": "unauthorized_access",
    "source": "firewall",
    "details": {
      "ipAddress": "192.168.1.100",
      "attempts": 5
    }
  }
}
```

#### データフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | アラートID |
| severity | string | アラートの重要度 |
| type | string | アラートのタイプ |
| source | string | アラートのソース |
| details | object | アラートの詳細情報 |

### リソース警告通知

システムリソースの使用状況が閾値を超えた際に送信されるメッセージです。

```json
{
  "type": "resource_warning",
  "severity": "warning",
  "title": "リソース警告: ディスク使用率",
  "message": "ディスク使用率が90%を超えています",
  "timestamp": "2025-03-08T12:34:56Z",
  "data": {
    "resource": "disk",
    "drive": "C:",
    "usagePercentage": 92.5,
    "threshold": 90
  }
}
```

#### データフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| resource | string | リソースタイプ（"disk", "memory", "cpu"） |
| usagePercentage | number | 使用率（%） |
| threshold | number | 警告閾値（%） |
| details | object | リソース固有の詳細情報 |

## クライアント実装ガイドライン

### 接続確立

1. JWTトークンを取得（REST APIの `/auth/login` エンドポイントを使用）
2. WebSocketエンドポイントに接続（トークンをクエリパラメータとして指定）
3. 接続確立メッセージを受信して接続状態を確認

```javascript
// 接続例
const token = localStorage.getItem('token');
const socket = new WebSocket(`wss://[your-domain]/ws?token=${token}`);

// 接続イベント
socket.onopen = () => {
  console.log('WebSocket接続が確立されました');
};

// メッセージ受信イベント
socket.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  
  // メッセージタイプに応じた処理
  switch (notification.type) {
    case 'connection_established':
      console.log('通知サービスに接続しました');
      break;
    case 'permission_change':
      console.log('パーミッション変更通知:', notification);
      // UIに通知を表示
      break;
    case 'system_status':
      console.log('システムステータス通知:', notification);
      // ステータス表示を更新
      break;
    case 'security_alert':
      console.log('セキュリティアラート:', notification);
      // アラート表示
      break;
    case 'resource_warning':
      console.log('リソース警告:', notification);
      // 警告表示
      break;
  }
};

// エラーイベント
socket.onerror = (error) => {
  console.error('WebSocketエラー:', error);
};

// 切断イベント
socket.onclose = (event) => {
  console.log('WebSocket接続が切断されました:', event.code, event.reason);
  
  // 再接続ロジック
  if (event.code !== 1000) {
    setTimeout(() => {
      // 再接続処理
    }, 5000);
  }
};
```

### 再接続戦略

1. 接続が切断された場合（コード1000以外）、指数バックオフを使用して再接続を試みる
2. 最大再試行回数を設定し、それを超えた場合はユーザーに通知
3. 認証エラー（コード4001, 4002）の場合は、トークンの再取得を試みる

```javascript
// 再接続例
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const baseReconnectDelay = 1000; // 1秒

function reconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error('最大再接続試行回数を超えました');
    return;
  }
  
  const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
  console.log(`${delay}ms後に再接続を試みます...`);
  
  setTimeout(() => {
    reconnectAttempts++;
    // 新しい接続を確立
    const token = localStorage.getItem('token');
    const socket = new WebSocket(`wss://[your-domain]/ws?token=${token}`);
    // イベントハンドラを設定
  }, delay);
}
```

## セキュリティ要件

本WebSocketプロトコルは、ISO 27001に準拠した以下のセキュリティ要件を満たしています：

1. すべての通信はTLS 1.2以上で暗号化されます（wssプロトコル）
2. 接続時にJWTトークンによる認証が必要です
3. トークンには有効期限が設定されており、期限切れの場合は再認証が必要です
4. すべての接続とメッセージは監査ログに記録され、追跡可能です
5. センシティブな情報は適切に保護され、必要最小限のアクセス権限が適用されます
6. 接続数の制限が適用され、DoS攻撃を緩和します

## ITサービスマネジメント統合

本WebSocketプロトコルは、ISO 20000に準拠したITサービスマネジメントプロセスと統合されています：

1. インシデント管理: セキュリティアラートはインシデント管理プロセスと連携
2. 変更管理: パーミッション変更は変更管理プロセスに従って通知
3. 可用性管理: システムステータス変更は可用性管理と連携
4. キャパシティ管理: リソース警告はキャパシティ管理プロセスに活用
5. サービスレベル管理: 通知の配信はSLAの一部として監視

## パフォーマンス考慮事項

1. メッセージサイズを最小限に保ち、ネットワーク帯域幅を節約
2. 重要でないメッセージはバッファリングし、一定間隔で送信
3. クライアント側でのメッセージ処理は非同期で行い、UIのブロックを防止
4. 接続数が多い場合は、水平スケーリングによりサーバー負荷を分散

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2025-03-08 | 1.0.0 | 初版リリース |