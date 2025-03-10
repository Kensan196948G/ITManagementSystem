# IT運用システム 実行手順書

## 前提条件
- Node.js v18.x以上がインストールされていること
- npmが利用可能であること
- MongoDBがインストールされ、実行されていること
- Redisがインストールされ、実行されていること（オプション：キャッシュ機能を使用する場合）

## 環境構築手順

### 1. リポジトリのクローン
```bash
git clone [リポジトリURL]
cd it-ops-system
```

### 2. 環境変数の設定

#### バックエンド (.env)
1. backend/.env.example を backend/.env にコピー
2. 以下の項目を環境に合わせて設定：
   - データベース接続情報 (MONGODB_URI)
   - JWT設定 (JWT_SECRET)
   - Active Directory設定
   - Microsoft 365設定
   - その他必要な環境変数

#### フロントエンド (.env)
1. frontend/.env.example を frontend/.env にコピー
2. 以下の項目を確認・設定：
   - REACT_APP_API_URL=http://localhost:3000/api
   - その他必要な環境変数

### 3. 依存パッケージのインストール

#### バックエンド
```bash
cd backend
npm install
```

#### フロントエンド
```bash
cd frontend
npm install
```

## 実行手順

### 1. バックエンドの起動
```bash
cd backend
npm run dev
```
- サーバーが http://localhost:3000 で起動します
- API エンドポイントは http://localhost:3000/api/ で利用可能になります

### 2. フロントエンドの起動
```bash
cd frontend
npm run dev
```
- 開発サーバーが http://localhost:3001 で起動します
- 自動的にデフォルトブラウザが開きます

## 動作確認

1. ブラウザで http://localhost:3001 にアクセス
2. ログイン画面が表示されることを確認
3. テストユーザーでログイン：
   - ユーザー名: testuser
   - パスワード: password123
   （※実際の環境では適切なクレデンシャルに変更してください）

## トラブルシューティング

### よくある問題と解決方法

1. CORS エラー
- バックエンドの .env ファイルで CORS_ORIGIN が正しく設定されているか確認
- フロントエンドの API_URL が正しく設定されているか確認

2. データベース接続エラー
- MongoDB が起動していることを確認
- 接続文字列が正しいことを確認

3. 認証エラー
- JWT_SECRET が正しく設定されているか確認
- トークンが正しく生成・送信されているか確認

4. ポートの競合
- 3000/3001ポートが他のプロセスで使用されていないか確認
- 使用中の場合は、.env ファイルで別のポートを指定

### ログの確認方法

1. バックエンドログ
- console.log 出力を確認
- logs/ ディレクトリ内のログファイルを確認

2. フロントエンドログ
- ブラウザの開発者ツール > Console タブで確認

## システムの停止方法

1. フロントエンドの停止
- ターミナルで Ctrl+C を押下

2. バックエンドの停止
- ターミナルで Ctrl+C を押下

## 備考

- 開発モードでの実行手順です。本番環境への展開は別途デプロイメントガイドを参照してください。
- セキュリティ設定やパフォーマンスチューニングについては、それぞれのガイドラインを参照してください。
- システムの詳細な操作方法については、ユーザーマニュアルを参照してください。