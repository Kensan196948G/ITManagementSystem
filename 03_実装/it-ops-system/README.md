# IT運用システム 実装ガイド

## プロジェクト概要

WebUIベースのIT運用管理システム。Active Directory、Microsoft 365、セキュリティツールなどの統合管理を提供します。

## システム要件

### フロントエンド
- Node.js v20.x
- React 18.x
- TypeScript 4.x
- Material-UI 5.x

### バックエンド
- Node.js v20.x
- Express 4.x
- TypeScript 4.x
- MongoDB 6.x
- Redis 7.x

## 環境構築

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd it-ops-system
```

### 2. 依存関係のインストール

```bash
# ルートディレクトリで
npm install

# フロントエンド
cd frontend
npm install

# バックエンド
cd ../backend
npm install
```

### 3. 環境変数の設定

#### フロントエンド (.env)
```bash
cp frontend/.env.example frontend/.env
```

必要に応じて以下の値を設定:
- REACT_APP_API_URL
- REACT_APP_AUTH_STORAGE_KEY
- その他の環境固有の設定

#### バックエンド (.env)
```bash
cp backend/.env.example backend/.env
```

以下の項目を環境に合わせて設定:
- データベース接続情報
- JWT設定
- Active Directory設定
- Microsoft 365設定
- セキュリティツール設定

### 4. データベースのセットアップ

```bash
# MongoDBの起動
mongod --dbpath /path/to/data

# Redisの起動
redis-server
```

## 開発サーバーの起動

### フロントエンド開発サーバー
```bash
cd frontend
npm run dev
```
http://localhost:3001 でアクセス可能

### バックエンド開発サーバー
```bash
cd backend
npm run dev
```
http://localhost:3000 でAPIが利用可能

### 両方同時に起動（ルートディレクトリで）
```bash
npm run dev
```

## ビルドと本番デプロイ

### フロントエンドのビルド
```bash
cd frontend
npm run build
```

### バックエンドのビルド
```bash
cd backend
npm run build
```

### 本番環境での実行
```bash
# バックエンド
cd backend
npm run start

# または、PM2を使用
pm2 start ecosystem.config.js
```

## テストの実行

### フロントエンドのテスト
```bash
cd frontend
npm run test
```

### バックエンドのテスト
```bash
cd backend
npm run test
```

## コード品質管理

### リンター実行
```bash
# フロントエンド
cd frontend
npm run lint

# バックエンド
cd backend
npm run lint
```

### コードフォーマット
```bash
# フロントエンド
cd frontend
npm run format

# バックエンド
cd backend
npm run format
```

## ディレクトリ構造

```
it-ops-system/
├── frontend/              # フロントエンドアプリケーション
│   ├── src/
│   │   ├── components/   # Reactコンポーネント
│   │   ├── services/     # APIサービス
│   │   ├── types/        # 型定義
│   │   └── utils/        # ユーティリティ関数
│   └── public/           # 静的ファイル
│
├── backend/              # バックエンドアプリケーション
│   ├── src/
│   │   ├── routes/      # APIルート
│   │   ├── services/    # ビジネスロジック
│   │   ├── types/       # 型定義
│   │   └── utils/       # ユーティリティ関数
│   └── tests/           # テストファイル
│
└── shared/              # 共有リソース
    ├── types/           # 共有型定義
    └── constants/       # 共有定数
```

## トラブルシューティング

### よくある問題と解決方法

1. TypeScriptのコンパイルエラー
```bash
npm install -g typescript
tsc --version
```

2. 依存関係の問題
```bash
rm -rf node_modules
npm cache clean --force
npm install
```

3. 環境変数の問題
- .envファイルが正しく配置されているか確認
- 必要な環境変数が全て設定されているか確認

4. データベース接続エラー
- MongoDBが起動しているか確認
- 接続文字列が正しいか確認
- ネットワーク接続を確認

## セキュリティ注意事項

1. 本番環境では必ず以下を実施:
   - 強力なJWTシークレットの設定
   - 適切なCORS設定
   - 環境変数の適切な管理
   - セキュアなHTTPS通信の確保

2. Active Directory接続:
   - 最小権限のサービスアカウント使用
   - パスワードの適切な管理
   - 安全な接続方式の使用

## 権限変更監査機能

### 概要
権限変更の履歴を記録し、変更内容のレビューと承認を管理する機能を提供します。

### 主な機能
- 権限変更の記録と履歴管理
- 変更内容のレビューと承認フロー
- 統計情報の可視化
- パフォーマンスモニタリング

### セキュリティ対策
- アクセス制御とアクセスログの記録
- 入力値の検証とサニタイズ
- SQLインジェクション対策
- XSS対策
- レート制限
- 監査ログの改ざん検知

### パフォーマンス要件
- 検索応答時間: 1秒以内
- 一覧表示応答時間: 3秒以内
- 同時リクエスト処理: 10リクエスト/秒以上
- メモリ使用量: 100MB以内

### インストールと設定
```bash
# 依存パッケージのインストール
npm install

# データベースの初期化
npm run init-db

# 開発サーバーの起動
npm run dev
```

### 使用方法
1. 権限変更履歴の表示
   - 日付範囲でのフィルタリング
   - アクション種別での絞り込み
   - 変更者/対象者でのフィルタリング

2. レビュー機能の利用
   - レビュー対象の選択
   - コメントの入力
   - 承認/却下の選択

3. 統計情報の確認
   - アクション別集計
   - リソース別集計
   - 変更者別集計

### APIリファレンス
- GET /api/permission-audit/records - 権限変更履歴の取得
- POST /api/permission-audit/review/:recordId - レビューの登録
- GET /api/permission-audit/statistics - 統計情報の取得

### トラブルシューティング
- パフォーマンス低下時の対処
  - インデックスの再構築
  - キャッシュのクリア
  - 不要なデータの削除

- エラー発生時の対処
  - ログの確認
  - 権限の確認
  - セッション状態の確認

## サポートとコントリビューション

- バグ報告は Issues で受け付けています
- プルリクエストは develop ブランチに対して作成してください
- コーディング規約に従ってください