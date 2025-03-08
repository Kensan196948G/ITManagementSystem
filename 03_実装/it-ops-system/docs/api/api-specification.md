# IT運用システム API仕様書

## 概要

本ドキュメントは、IT運用システムが提供するRESTful APIエンドポイントの詳細な仕様を定義します。このAPIは、ISO 20000（ITサービスマネジメント）およびISO 27001（情報セキュリティマネジメント）の要件に準拠して設計されています。

## バージョン情報

- API バージョン: 1.0.0
- 最終更新日: 2025年3月8日

## ベースURL

```
https://[your-domain]/api
```

## 認証

すべてのAPIリクエストには認証が必要です。認証はJWTトークンを使用して行われます。

### 認証ヘッダー

```
Authorization: Bearer {token}
```

### 認証エラーレスポンス

```json
{
  "status": "error",
  "message": "認証が必要です",
  "code": "UNAUTHORIZED"
}
```

## 共通レスポンス形式

### 成功レスポンス

```json
{
  "status": "success",
  "data": {
    // レスポンスデータ
  }
}
```

### エラーレスポンス

```json
{
  "status": "error",
  "message": "エラーメッセージ",
  "code": "ERROR_CODE",
  "errors": [
    {
      "message": "詳細なエラーメッセージ",
      "path": ["エラーが発生したフィールドパス"],
      "type": "エラータイプ"
    }
  ]
}
```

## エンドポイント一覧

### 認証関連

#### ログイン

- **URL**: `/auth/login`
- **メソッド**: `POST`
- **説明**: ユーザー認証を行い、JWTトークンを取得します
- **リクエストボディ**:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

- **レスポンス**:

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user123",
      "email": "user@example.com",
      "name": "ユーザー名",
      "roles": ["user"]
    }
  }
}
```

#### ログアウト

- **URL**: `/auth/logout`
- **メソッド**: `POST`
- **説明**: 現在のセッションをログアウトします
- **レスポンス**:

```json
{
  "status": "success",
  "message": "ログアウトしました"
}
```

#### 現在のユーザー情報取得

- **URL**: `/auth/me`
- **メソッド**: `GET`
- **説明**: 現在ログインしているユーザーの情報を取得します
- **レスポンス**:

```json
{
  "status": "success",
  "data": {
    "id": "user123",
    "email": "user@example.com",
    "name": "ユーザー名",
    "roles": ["user"]
  }
}
```

### Graph APIパーミッション管理

#### 利用可能なパーミッション一覧取得

- **URL**: `/graph-permissions/available`
- **メソッド**: `GET`
- **説明**: 利用可能なGraph APIパーミッションの一覧を取得します
- **アクセス権限**: 認証済みユーザー
- **レスポンス**:

```json
{
  "status": "success",
  "data": [
    {
      "id": "perm1",
      "value": "User.Read",
      "type": "Delegated",
      "description": "ユーザープロファイルの読み取り"
    },
    {
      "id": "perm2",
      "value": "Mail.Read",
      "type": "Delegated",
      "description": "メールの読み取り"
    }
  ]
}
```

#### ユーザーのパーミッション一覧取得

- **URL**: `/graph-permissions/users/{userEmail}`
- **メソッド**: `GET`
- **説明**: 特定ユーザーのGraph APIパーミッション一覧を取得します
- **アクセス権限**: 自分自身のパーミッションまたはグローバル管理者
- **パスパラメータ**:
  - `userEmail`: ユーザーのメールアドレス
- **レスポンス**:

```json
{
  "status": "success",
  "data": [
    {
      "id": "perm1",
      "value": "User.Read",
      "type": "Delegated",
      "description": "ユーザープロファイルの読み取り"
    }
  ]
}
```

#### パーミッション付与

- **URL**: `/graph-permissions/users/{userEmail}/grant`
- **メソッド**: `POST`
- **説明**: ユーザーにGraph APIパーミッションを付与します
- **アクセス権限**: グローバル管理者のみ
- **パスパラメータ**:
  - `userEmail`: ユーザーのメールアドレス
- **リクエストボディ**:

```json
{
  "permission": "User.Read",
  "scope": "Delegated"
}
```

- **レスポンス**:

```json
{
  "status": "success",
  "message": "パーミッションが付与されました"
}
```

#### パーミッション削除

- **URL**: `/graph-permissions/users/{userEmail}/revoke`
- **メソッド**: `POST`
- **説明**: ユーザーからGraph APIパーミッションを削除します
- **アクセス権限**: グローバル管理者のみ
- **パスパラメータ**:
  - `userEmail`: ユーザーのメールアドレス
- **リクエストボディ**:

```json
{
  "permission": "User.Read",
  "scope": "Delegated"
}
```

- **レスポンス**:

```json
{
  "status": "success",
  "message": "パーミッションが削除されました"
}
```

#### パーミッション監査ログ取得

- **URL**: `/graph-permissions/audit-logs`
- **メソッド**: `GET`
- **説明**: パーミッション変更の監査ログを取得します
- **アクセス権限**: 自分に関連するログまたはグローバル管理者
- **クエリパラメータ**:
  - `userEmail`: (オプション) 特定ユーザーのログのみを取得
  - `limit`: (オプション) 取得する最大件数 (デフォルト: 100)
  - `offset`: (オプション) オフセット (デフォルト: 0)
- **レスポンス**:

```json
{
  "status": "success",
  "data": [
    {
      "id": "log1",
      "timestamp": "2025-03-08T12:34:56Z",
      "userEmail": "user@example.com",
      "operatorEmail": "admin@example.com",
      "action": "grant",
      "permission": "User.Read",
      "permissionType": "Delegated",
      "success": true
    }
  ]
}
```

#### IT運用情報概要取得

- **URL**: `/graph-permissions/operations-summary`
- **メソッド**: `GET`
- **説明**: IT運用情報の概要を取得します
- **アクセス権限**: 認証済みユーザー
- **レスポンス**:

```json
{
  "status": "success",
  "data": {
    "totalAvailablePermissions": 50,
    "delegatedPermissions": 30,
    "applicationPermissions": 20,
    "commonPermissions": [
      {
        "name": "User.Read",
        "description": "ユーザープロファイルの読み取り",
        "type": "Delegated"
      }
    ],
    "lastUpdated": "2025-03-08T12:34:56Z"
  }
}
```

### システムステータス

#### システムステータス情報取得

- **URL**: `/system-status/status`
- **メソッド**: `GET`
- **説明**: システム全体の健全性状態を取得します
- **アクセス権限**: 認証済みユーザー
- **レスポンス**:

```json
{
  "status": "success",
  "data": {
    "status": "healthy",
    "components": {
      "database": {
        "status": "healthy"
      },
      "api": {
        "status": "healthy"
      },
      "filesystem": {
        "status": "healthy"
      },
      "memory": {
        "status": "healthy",
        "usage": 45.2
      }
    },
    "lastChecked": "2025-03-08T12:34:56Z"
  }
}
```

#### リソース使用状況取得

- **URL**: `/system-status/resources`
- **メソッド**: `GET`
- **説明**: サーバーのリソース使用状況を取得します
- **アクセス権限**: 認証済みユーザー
- **レスポンス**:

```json
{
  "status": "success",
  "data": {
    "cpu": {
      "usage": {
        "user": 123456,
        "system": 78901
      },
      "cores": 8,
      "model": "Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz",
      "loadAverage": [1.2, 1.5, 1.7]
    },
    "memory": {
      "total": 16777216000,
      "free": 8388608000,
      "used": 8388608000,
      "usagePercentage": "50.00",
      "process": {
        "rss": 102400000,
        "heapTotal": 51200000,
        "heapUsed": 40960000,
        "external": 10240000
      }
    },
    "disk": {
      "C:": {
        "total": 256000000000,
        "free": 128000000000,
        "used": 128000000000,
        "usagePercentage": "50.00"
      }
    },
    "network": {},
    "system": {
      "platform": "win32",
      "release": "10.0.19042",
      "hostname": "SERVER01",
      "uptime": 1209600
    },
    "timestamp": "2025-03-08T12:34:56Z"
  }
}
```

#### セキュリティアラート取得

- **URL**: `/system-status/security-alerts`
- **メソッド**: `GET`
- **説明**: セキュリティアラート情報を取得します
- **アクセス権限**: 認証済みユーザー
- **レスポンス**:

```json
{
  "status": "success",
  "data": [
    {
      "id": "alert1",
      "severity": "high",
      "type": "unauthorized_access",
      "message": "不正アクセスの試行が検出されました",
      "source": "firewall",
      "timestamp": "2025-03-08T12:34:56Z",
      "status": "active"
    }
  ]
}
```

## エラーコード

| コード | 説明 |
|--------|------|
| `UNAUTHORIZED` | 認証が必要です |
| `FORBIDDEN` | アクセス権限がありません |
| `INVALID_REQUEST` | リクエストが無効です |
| `VALIDATION_ERROR` | 入力データが無効です |
| `RESOURCE_NOT_FOUND` | リソースが見つかりません |
| `INTERNAL_ERROR` | 内部エラーが発生しました |
| `GRAPH_PERMISSION_ERROR` | Graph APIパーミッション操作中にエラーが発生しました |
| `GRANT_PERMISSION_ERROR` | パーミッション付与中にエラーが発生しました |
| `REVOKE_PERMISSION_ERROR` | パーミッション削除中にエラーが発生しました |
| `AUDIT_LOG_ERROR` | 監査ログ取得中にエラーが発生しました |
| `SYSTEM_STATUS_ERROR` | システムステータス取得中にエラーが発生しました |
| `RESOURCE_STATUS_ERROR` | リソース使用状況取得中にエラーが発生しました |
| `SECURITY_ALERT_ERROR` | セキュリティアラート取得中にエラーが発生しました |

## セキュリティ要件

本APIは、ISO 27001に準拠した以下のセキュリティ要件を満たしています：

1. すべての通信はTLS 1.2以上で暗号化されます
2. 認証にはJWTトークンを使用し、有効期限を設定しています
3. 権限チェックは二重化され、フロントエンドとバックエンドの両方で実施されます
4. すべてのAPIリクエストは監査ログに記録され、追跡可能です
5. 入力データは厳格に検証され、インジェクション攻撃を防止します
6. レート制限が適用され、DoS攻撃を緩和します
7. センシティブな情報は適切に保護され、必要最小限のアクセス権限が適用されます

## ITサービスマネジメント統合

本APIは、ISO 20000に準拠したITサービスマネジメントプロセスと統合されています：

1. インシデント管理: セキュリティアラートはインシデント管理プロセスと連携
2. 変更管理: パーミッション変更は変更管理プロセスに従って記録・追跡
3. 構成管理: システムリソースは構成管理データベース（CMDB）と連携
4. サービスレベル管理: システムステータスはSLAモニタリングに使用
5. 可用性管理: リソース使用状況は可用性計画に活用
6. キャパシティ管理: パフォーマンスデータはキャパシティ計画に使用

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2025-03-08 | 1.0.0 | 初版リリース |