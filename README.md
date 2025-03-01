# 🚀 IT運用システムプロジェクト

## <span style="color:#3498db">📋 プロジェクト概要</span>

本プロジェクトは、WebUIベースの統合IT運用管理システムを構築し、以下のシステムを効率的に運用管理することを目的としています：

### <span style="color:#2ecc71">🎯 対象システム</span>
- Active Directory（AD）
- Microsoft Entra ID（旧Azure AD）
- Exchange Online
- Microsoft 365（Teams, OneDrive for Businessを含む）
- 外部ファイルサーバ（Windows Server）
- DeskNet's Neo（Appsuite含む）
- セキュリティサービス
  - TrendMicro Apex One
  - Carbon Black
  - Defender for Endpoint（新規追加）
- DirectCloud
- AWS/Azure連携（新規追加）

## <span style="color:#9b59b6">💻 WebUIシステム概要</span>

### <span style="color:#e67e22">🏗️ アーキテクチャ</span>
- フロントエンド
  - React + TypeScript
  - Material-UI v5
  - Redux Toolkit + RTK Query
- バックエンド
  - Node.js 20.x + Express
  - MongoDB Atlas
  - GraphQL API（新規追加）
  - マイクロサービスアーキテクチャ
- インフラストラクチャ
  - Docker/Kubernetes
  - CI/CD（GitHub Actions）
  - Terraform IaC（新規追加）

### <span style="color:#e74c3c">🔧 主要機能</span>
1. 統合ダッシュボード
   - システム状態監視
   - アラート管理
   - リソース使用状況
   - カスタマイズ可能なウィジェット（新規追加）

2. システム管理
   - ID管理（AD/Entra ID）
   - クラウドサービス管理
   - セキュリティ管理
   - 自動化ワークフロー（新規追加）

3. 運用管理
   - 監視・ログ管理
   - バックアップ管理
   - インシデント管理
   - AI予測分析（新規追加）

## <span style="color:#1abc9c">🚩 プロジェクト目的</span>
- システム運用の効率化
- システムの信頼性向上
- 運用コストの削減
- ハイブリッド環境の統合管理
- セキュリティ強化
- 運用プロセスの自動化（新規追加）

## <span style="color:#f39c12">📂 フォルダ構成</span>

プロジェクトは以下の6つのフェーズに分かれており、各フェーズごとに専用のフォルダを持ちます：

1. `01_企画・要件定義/` - システムの役割定義、現状分析、要件収集
2. `02_設計/` - アーキテクチャ設計、運用プロセス設計、ツール選定
3. `03_実装/` - 環境構築、システム設定、自動化実装
   - `web-system-requirements.md` - WebUIシステムの詳細要件
   - `web-system-implementation-plan.md` - 実装計画書
4. `04_テスト/` - 機能テスト、統合テスト、性能テスト
5. `05_展開・移行/` - 本番環境移行、ユーザー教育
6. `06_運用・保守/` - 運用監視、保守管理、継続的改善

## <span style="color:#2980b9">🔄 主要な統合ポイント</span>

1. ID・認証基盤
   - ADとEntra IDのハイブリッド構成
   - シングルサインオン（SSO）
   - 多要素認証（MFA）
   - 条件付きアクセス（新規追加）

2. クラウドサービス統合
   - Exchange Online
   - Microsoft 365サービス
   - DeskNet's Neo
   - Power Platform連携（新規追加）

3. セキュリティ統合
   - TrendMicro Apex One
   - Carbon Black
   - Defender for Endpoint（新規追加）
   - 統合ログ管理
   - アラート連携
   - SIEM統合（新規追加）

4. バックアップ・リカバリ
   - DirectCloud統合
   - データ保護策
   - リカバリ計画
   - クラウドバックアップ（新規追加）

## <span style="color:#8e44ad">⚙️ 開発環境</span>

### <span style="color:#d35400">🔨 必要なツール</span>
- Node.js 20.x
- Docker/Docker Compose
- Git
- Visual Studio Code
- Terraform CLI（新規追加）

### <span style="color:#c0392b">📝 セットアップ手順</span>
詳細は `03_実装/it-ops-system/README.md` を参照

## <span style="color:#16a085">🔖 バージョン管理</span>

本プロジェクトはGitを使用してバージョン管理を行います。CI/CDパイプラインと連携しています。

## <span style="color:#2c3e50">📚 ドキュメント管理</span>

- 各フェーズのフォルダにはREADME.mdを配置
- 詳細仕様書は各フェーズのフォルダ内に配置
- 命名規則：フェーズ番号_内容（例：01_要件定義.md）
- API仕様書はOpenAPI形式で管理（新規追加）

## <span style="color:#27ae60">🤖 プロンプト管理</span>

ClineやRooCodeでの実装支援のため：

- フェーズごとの目的と成果物を明確に定義
- 具体的な指示例を提供
- 各システムの設定手順や連携手順を体系化
- 次フェーズへの連携方法を明示
- AI支援のためのプロンプトテンプレート（新規追加）