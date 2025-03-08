# 開発環境セットアップガイド

## 概要

本ガイドは、IT運用システムの開発環境を構築するための手順を説明します。このシステムは、ISO 20000（ITサービスマネジメント）およびISO 27001（情報セキュリティマネジメント）の要件に準拠して設計されています。

## バージョン情報

- ガイドバージョン: 1.0.0
- 最終更新日: 2025年3月8日
- 対応システムバージョン: 1.0.0

## 前提条件

### 必要なソフトウェア

| ソフトウェア | バージョン | 用途 |
|------------|----------|------|
| Node.js | 18.x以上 | バックエンド実行環境 |
| npm | 8.x以上 | パッケージ管理 |
| Git | 2.x以上 | バージョン管理 |
| Visual Studio Code | 最新版推奨 | 開発IDE |
| PowerShell | 7.x以上 | スクリプト実行 |
| SQLite | 3.x | データベース |
| Chrome/Firefox/Edge | 最新版 | テスト・デバッグ |

### 必要なアクセス権限

- GitHubリポジトリへのアクセス権
- 開発環境用Microsoft 365テナントへのアクセス権
- 開発用Graph APIアプリケーション登録へのアクセス権

## 開発環境構築手順

### 1. リポジトリのクローン

```bash
# リポジトリをクローン
git clone https://github.com/your-organization/it-ops-system.git

# プロジェクトディレクトリに移動
cd it-ops-system
```

### 2. 依存パッケージのインストール

```bash
# ルートディレクトリで依存パッケージをインストール
npm install

# バックエンドの依存パッケージをインストール
cd backend
npm install

# フロントエンドの依存パッケージをインストール
cd ../frontend
npm install

# ルートディレクトリに戻る
cd ..
```

### 3. 環境設定ファイルの作成

#### バックエンド環境設定

`backend/.env` ファイルを作成し、以下の内容を設定します：

```
# サーバー設定
PORT=3001
NODE_ENV=development
LOG_LEVEL=debug

# データベース設定
DB_PATH=./database.sqlite

# JWT設定
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=1d

# Graph API設定
TENANT_ID=your-tenant-id
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
```

#### フロントエンド環境設定

`frontend/.env` ファイルを作成し、以下の内容を設定します：

```
# API設定
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=ws://localhost:3001/ws

# 認証設定
REACT_APP_AUTH_STORAGE_KEY=it_ops_auth
```

### 4. データベースの初期化

```bash
# バックエンドディレクトリに移動
cd backend

# データベース初期化スクリプトを実行
npm run db:init
```

### 5. 開発サーバーの起動

#### バックエンドサーバー

```bash
# バックエンドディレクトリで
npm run dev
```

#### フロントエンドサーバー

新しいターミナルを開き、以下を実行：

```bash
# フロントエンドディレクトリで
cd frontend
npm start
```

### 6. 動作確認

ブラウザで以下のURLにアクセスし、動作を確認します：

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:3001/api/health

## Microsoft Graph API設定

### 1. Azure ADアプリケーション登録

1. [Azure Portal](https://portal.azure.com)にアクセス
2. 「Azure Active Directory」→「アプリの登録」→「新規登録」を選択
3. 以下の情報を入力：
   - 名前: IT運用システム開発環境
   - サポートされているアカウントの種類: 単一テナント
   - リダイレクトURI: Web, http://localhost:3000/auth/callback
4. 「登録」をクリック

### 2. APIアクセス許可の設定

1. 作成したアプリケーション登録を選択
2. 「APIのアクセス許可」を選択
3. 「アクセス許可の追加」→「Microsoft Graph」→「委任された許可」を選択
4. 以下の許可を追加：
   - User.Read
   - User.ReadBasic.All
   - Directory.Read.All
   - Directory.ReadWrite.All
5. 「アクセス許可の追加」をクリック
6. 「（テナント名）に管理者の同意を与えます」をクリック

### 3. クライアントシークレットの作成

1. 「証明書とシークレット」を選択
2. 「新しいクライアントシークレット」をクリック
3. 説明と有効期限を入力
4. 「追加」をクリック
5. 生成されたシークレット値をコピーし、安全に保管

### 4. アプリケーションIDとテナントIDの取得

1. 「概要」ページで以下の情報を確認：
   - アプリケーション（クライアント）ID
   - ディレクトリ（テナント）ID
2. これらの値を `.env` ファイルに設定

## PowerShellスクリプト設定

### 1. PowerShellモジュールのインストール

管理者権限でPowerShellを開き、以下を実行：

```powershell
# Microsoft Graph PowerShellモジュールのインストール
Install-Module Microsoft.Graph -Scope CurrentUser

# Azure ADモジュールのインストール
Install-Module AzureAD -Scope CurrentUser
```

### 2. 実行ポリシーの設定

開発環境でスクリプトを実行するために、以下を実行：

```powershell
# 現在のユーザーに対して実行ポリシーを設定
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 開発ツールの設定

### Visual Studio Code拡張機能

以下の拡張機能をインストールすることを推奨します：

1. ESLint - JavaScriptコード品質チェック
2. Prettier - コードフォーマッター
3. TypeScript Hero - TypeScriptインポート管理
4. SQLite - SQLiteデータベース管理
5. REST Client - APIテスト
6. Jest Runner - テスト実行
7. GitLens - Git統合強化

### ESLintとPrettierの設定

プロジェクトには既に `.eslintrc.js` と `.prettierrc` が含まれていますが、VSCodeでの自動フォーマットを有効にするには：

1. VSCodeの設定を開く（Ctrl+,）
2. 「Format On Save」で検索し、チェックを入れる
3. 「Default Formatter」で検索し、「Prettier - Code formatter」を選択

## テスト環境の設定

### 単体テスト

```bash
# バックエンドディレクトリで
cd backend
npm test

# フロントエンドディレクトリで
cd frontend
npm test
```

### E2Eテスト

```bash
# ルートディレクトリで
npm run test:e2e
```

## デバッグ設定

### バックエンドデバッグ

VSCodeでデバッグを設定するには：

1. `.vscode/launch.json` ファイルを作成
2. 以下の設定を追加：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/backend/src/index.ts",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
      "runtimeExecutable": "node",
      "runtimeArgs": ["--inspect", "-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### フロントエンドデバッグ

1. Chromeブラウザを使用
2. Chrome開発者ツールを開く（F12）
3. Sourcesタブでブレークポイントを設定

## CI/CD環境との連携

### GitHubアクション

プロジェクトには `.github/workflows` ディレクトリに以下のワークフローが定義されています：

1. `ci.yml` - プルリクエスト時の継続的インテグレーション
2. `cd-dev.yml` - 開発環境への継続的デリバリー
3. `cd-prod.yml` - 本番環境への継続的デリバリー

ローカル環境でGitHubアクションをテストするには：

```bash
# GitHub CLI をインストール
npm install -g @github/cli

# ワークフローをローカルで実行
gh workflow run ci.yml
```

## セキュリティ設定

ISO 27001に準拠したセキュリティ設定：

### 1. 開発環境のセキュリティ

- 開発用シークレットは環境変数または `.env` ファイルで管理し、リポジトリにコミットしない
- `.env.example` ファイルを参照し、必要な環境変数を設定
- `.gitignore` に機密情報を含むファイルを追加

### 2. 依存関係の脆弱性スキャン

定期的に依存関係の脆弱性をスキャンします：

```bash
# npm監査を実行
npm audit

# 自動修正を試みる
npm audit fix
```

### 3. セキュアコーディング

- OWASP Top 10に対応したセキュアコーディングプラクティスに従う
- コードレビューでセキュリティチェックを実施
- 静的コード解析ツールを使用

## トラブルシューティング

### 一般的な問題と解決方法

| 問題 | 考えられる原因 | 解決方法 |
|------|--------------|----------|
| `npm install` が失敗する | ネットワーク接続の問題、互換性の問題 | プロキシ設定を確認、Node.jsバージョンを確認 |
| バックエンドサーバーが起動しない | ポートの競合、環境変数の問題 | 使用中のポートを確認、.envファイルを確認 |
| フロントエンドビルドが失敗する | 依存関係の問題、TypeScriptエラー | 依存関係を更新、TypeScriptエラーを修正 |
| Graph API接続エラー | 認証情報の問題、アクセス許可の問題 | クライアントID/シークレットを確認、アクセス許可を確認 |
| テストが失敗する | コード変更による影響、環境の問題 | テストを更新、テスト環境を確認 |

### ログの確認

問題のトラブルシューティングには、ログを確認します：

- バックエンドログ: `backend/logs/`
- フロントエンドログ: ブラウザコンソール
- テストログ: テスト実行時の出力

## サポートとリソース

### 開発者サポート

- **開発者チャット**: [Slack #dev-support チャンネル](https://your-org.slack.com/dev-support)
- **技術文書**: [開発者ポータル](https://dev.your-org.com)
- **バグ報告**: [GitHub Issues](https://github.com/your-organization/it-ops-system/issues)

### 参考リソース

- [Node.js ドキュメント](https://nodejs.org/docs)
- [React ドキュメント](https://reactjs.org/docs)
- [TypeScript ドキュメント](https://www.typescriptlang.org/docs)
- [Microsoft Graph API ドキュメント](https://docs.microsoft.com/graph)
- [ISO 20000 ガイドライン](https://www.iso.org/standard/70636.html)
- [ISO 27001 ガイドライン](https://www.iso.org/standard/27001)

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2025-03-08 | 1.0.0 | 初版リリース |