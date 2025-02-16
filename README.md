# IT運用システムプロジェクト

## プロジェクト概要

本プロジェクトは、WebUIベースの統合IT運用管理システムを構築し、以下のシステムを効率的に運用管理することを目的としています：

### 対象システム
- Active Directory（AD）
- Microsoft Entra ID（旧Azure AD）
- Exchange Online
- Microsoft 365（Teams, OneDrive for Businessを含む）
- 外部ファイルサーバ（Windows Server）
- DeskNet's Neo（Appsuite含む）
- セキュリティサービス
  - TrendMicro Apex One
  - Carbon Black
- DirectCloud

## WebUIシステム概要

### アーキテクチャ
- フロントエンド
  - React + TypeScript
  - Material-UI
  - Redux状態管理
- バックエンド
  - Node.js + Express
  - MongoDB
  - マイクロサービスアーキテクチャ
- インフラストラクチャ
  - Docker/Kubernetes
  - CI/CD（GitHub Actions）

### 主要機能
1. 統合ダッシュボード
   - システム状態監視
   - アラート管理
   - リソース使用状況

2. システム管理
   - ID管理（AD/Entra ID）
   - クラウドサービス管理
   - セキュリティ管理

3. 運用管理
   - 監視・ログ管理
   - バックアップ管理
   - インシデント管理

## プロジェクト目的
- システム運用の効率化
- システムの信頼性向上
- 運用コストの削減
- ハイブリッド環境の統合管理
- セキュリティ強化

## フォルダ構成

プロジェクトは以下の6つのフェーズに分かれており、各フェーズごとに専用のフォルダを持ちます：

1. `01_企画・要件定義/` - システムの役割定義、現状分析、要件収集
2. `02_設計/` - アーキテクチャ設計、運用プロセス設計、ツール選定
3. `03_実装/` - 環境構築、システム設定、自動化実装
   - `web-system-requirements.md` - WebUIシステムの詳細要件
   - `web-system-implementation-plan.md` - 実装計画書
4. `04_テスト/` - 機能テスト、統合テスト、性能テスト
5. `05_展開・移行/` - 本番環境移行、ユーザー教育
6. `06_運用・保守/` - 運用監視、保守管理、継続的改善

## 主要な統合ポイント

1. ID・認証基盤
   - ADとEntra IDのハイブリッド構成
   - シングルサインオン（SSO）
   - 多要素認証（MFA）

2. クラウドサービス統合
   - Exchange Online
   - Microsoft 365サービス
   - DeskNet's Neo

3. セキュリティ統合
   - TrendMicro Apex One
   - Carbon Black
   - 統合ログ管理
   - アラート連携

4. バックアップ・リカバリ
   - DirectCloud統合
   - データ保護策
   - リカバリ計画

## 開発環境

### 必要なツール
- Node.js 20.x
- Docker/Docker Compose
- Git
- Visual Studio Code

### セットアップ手順
詳細は `03_実装/web-system-implementation-plan.md` を参照

## バージョン管理

本プロジェクトはGitを使用してバージョン管理を行います。

## ドキュメント管理

- 各フェーズのフォルダにはREADME.mdを配置
- 詳細仕様書は各フェーズのフォルダ内に配置
- 命名規則：フェーズ番号_内容（例：01_要件定義.md）

## プロンプト管理

ClineやRooCodeでの実装支援のため：

- フェーズごとの目的と成果物を明確に定義
- 具体的な指示例を提供
- 各システムの設定手順や連携手順を体系化
- 次フェーズへの連携方法を明示