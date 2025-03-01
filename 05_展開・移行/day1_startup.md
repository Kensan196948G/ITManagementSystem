# 🚀 IT運用システム Day1スタートアップガイド

## 📋 概要

このガイドは、IT運用システムの展開フェーズDay1の実行に関わるチームメンバー向けに作成されています。Day1では、基本的なインフラストラクチャのセットアップと初期構成を行います。

## ✅ 前提条件

1. 以下のツールがインストールされていること
   - 🔧 Azure CLI (最新バージョン)
   - ⚙️ kubectl (最新バージョン)
   - 🏗️ Terraform (バージョン1.0以上)
   - 🔄 Helm (バージョン3.0以上)

2. 必要な権限
   - 🔑 Azureサブスクリプションの管理者権限
   - 🔐 Kubernetes管理者権限

## 🔍 事前準備

### 🌍 1. 環境変数の設定

以下の環境変数を設定します。

```bash
# 共通環境変数
export ENVIRONMENT="staging"                     # 環境名 (staging/production)
export AZURE_SUBSCRIPTION="your-subscription-id" # Azureサブスクリプションのセットアップ
export RESOURCE_GROUP="it-ops-$ENVIRONMENT-rg"   # リソースグループ名
export CLUSTER_NAME="it-ops-$ENVIRONMENT-aks"    # AKSクラスタ名
export ACR_NAME="itops$ENVIRONMENT"              # Azure Container Registry名（英数小文字のみ）

# データベース接続情報
export MONGODB_HOST="mongodb.$ENVIRONMENT.local"
export MONGODB_PORT="27017"
export MONGODB_USER="admin"
export MONGODB_PASSWORD="secure-password"  # 本番環境では適切に保護された方法で管理してください
```

### 🔐 2. 資格情報の確認

```bash
# Azureにログイン
az login

# サブスクリプションの設定
az account set --subscription "$AZURE_SUBSCRIPTION"

# サブスクリプション情報の確認
az account show
```

## 🚀 展開手順

### 📝 1. 実行スクリプトの準備

Day1実行スクリプト（`day1_execution.sh`）が最新であることを確認してください。必要に応じて環境に合わせた調整を行います。

```bash
# スクリプトの実行権限を確認
chmod +x day1_execution.sh

# スクリプト内容の確認
cat day1_execution.sh
```

### ▶️ 2. スクリプトの実行

環境変数が正しく設定された状態で、実行スクリプトを実行します。

```bash
./day1_execution.sh
```

スクリプトは以下の主要なタスクを実行します:
- 🏗️ リソースグループの作成
- 🌐 AKSクラスタの作成
- 🗄️ ACRの作成とAKSとの連携
- 🔖 名前空間の設定
- 📊 監視ツール（PrometheusとGrafana）のデプロイ
- 💾 バックアップ設定
- 🚨 アラートルールの設定

### 🔎 3. デプロイ結果の確認

デプロイが完了したら、以下のコマンドで結果を確認します。

```bash
# AKSクラスタの状態確認
az aks show --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME

# Kubernetesリソースの確認
kubectl get pods,svc,deploy -n production
kubectl get pods,svc -n monitoring

# Grafanaへのアクセス方法
kubectl get secret --namespace monitoring grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo
kubectl port-forward -n monitoring svc/grafana 3000:80
# ブラウザで http://localhost:3000 にアクセス (ユーザー名: admin)
```

## 🛠️ トラブルシューティング

### ⚠️ 一般的な問題と解決策

1. Azure CLIログインエラー
   - 🔄 認証情報が期限切れの場合は `az login` を再実行
   - 🔍 サブスクリプションアクセス権を確認

2. AKSクラスタ作成エラー
   - 📊 クォータ制限を確認
   - 🔍 リソースプロバイダーが登録されているか確認
   - 💻 コマンド: `az provider register --namespace Microsoft.ContainerService`

3. Helmインストールエラー
   - 🔄 リポジトリを更新: `helm repo update`
   - 🔒 TLSエラーの場合: `helm repo add --insecure-skip-tls-verify [repo-name] [url]`

4. バックアップ設定エラー
   - 🔍 Secret存在確認: `kubectl get secret mongodb-credentials -n production`
   - 💾 PVC確認: `kubectl get pvc -n production`

## ⏭️ 次のステップ

Day1の実行が完了した後、以下のタスクを実施します：

1. 📅 Day2の準備
   - 🏗️ コンテナイメージのビルドとプッシュ
   - 📝 デプロイメント設定の準備

2. 📊 監視ダッシュボードの設定
   - 📈 Grafanaダッシュボードのインポート
   - 🔔 アラート通知の設定

3. 👥 運用チームへの引き継ぎ準備
   - 🔑 アクセス権限の設定
   - 📚 運用マニュアルの最終確認

## 📚 参考資料

- [🔗 Azure Kubernetes Service (AKS) ドキュメント](https://docs.microsoft.com/ja-jp/azure/aks/)
- [🔗 Prometheus オペレータガイド](https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/user-guides/getting-started.md)
- [🔗 Grafana ドキュメント](https://grafana.com/docs/grafana/latest/)
- [🔗 IT運用システム実装仕様書](../03_実装/it-ops-system/README.md)