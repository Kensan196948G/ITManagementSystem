#!/bin/bash
# day1_execution.sh - IT運用システム展開フェーズDay1実行スクリプト

set -e  # エラー時に停止
set -u  # 未定義変数使用時に停止

# ログ出力機能
log() {
  local level="$1"
  local message="$2"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message"
}

log "INFO" "IT運用システム展開フェーズ Day1実行を開始します"

# 環境変数チェック
required_vars=("ENVIRONMENT" "AZURE_SUBSCRIPTION" "RESOURCE_GROUP" "CLUSTER_NAME" "ACR_NAME")
for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    log "ERROR" "$var が設定されていません"
    exit 1
  fi
done

log "INFO" "環境: $ENVIRONMENT"

# Azureログイン確認
if ! az account show &> /dev/null; then
  log "INFO" "Azureへのログインが必要です"
  az login
fi

log "INFO" "サブスクリプション $AZURE_SUBSCRIPTION を選択"
az account set --subscription "$AZURE_SUBSCRIPTION"

# リソースグループが存在するか確認
if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
  log "INFO" "リソースグループ $RESOURCE_GROUP を作成"
  az group create --name "$RESOURCE_GROUP" --location "japaneast"
else
  log "INFO" "リソースグループ $RESOURCE_GROUP は既に存在"
fi

# AKSクラスタ作成
if ! az aks show --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME" &> /dev/null; then
  log "INFO" "AKSクラスタ $CLUSTER_NAME を作成"
  az aks create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CLUSTER_NAME" \
    --node-count 3 \
    --enable-addons monitoring \
    --generate-ssh-keys
else
  log "INFO" "AKSクラスタ $CLUSTER_NAME は既に存在"
fi

# クラスタ認証情報取得
log "INFO" "AKSクラスタの認証情報を取得"
az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME" --overwrite-existing

# ACR作成
if ! az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
  log "INFO" "ACR $ACR_NAME を作成"
  az acr create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ACR_NAME" \
    --sku Standard
else
  log "INFO" "ACR $ACR_NAME は既に存在"
fi

# AKSとACRの統合
log "INFO" "AKSとACRの統合を設定"
az aks update \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --attach-acr "$ACR_NAME"

# 名前空間作成
log "INFO" "Kubernetes名前空間を作成"
kubectl create namespace production --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

# Helmの設定
log "INFO" "Helmリポジトリを追加"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Prometheusのインストール
log "INFO" "Prometheusをインストール"
helm upgrade --install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --set server.persistentVolume.enabled=true \
  --set server.persistentVolume.size=10Gi

# Grafanaのインストール
log "INFO" "Grafanaをインストール"
helm upgrade --install grafana grafana/grafana \
  --namespace monitoring \
  --set persistence.enabled=true \
  --set persistence.size=5Gi \
  --set adminPassword="$(openssl rand -base64 12)"

# バックアップ設定のためのSecretを作成
log "INFO" "バックアップ用Secretを作成"
kubectl create secret generic backup-credentials \
  --namespace production \
  --from-literal=BACKUP_USER="backup-user" \
  --from-literal=BACKUP_PASSWORD="$(openssl rand -base64 16)" \
  --dry-run=client -o yaml | kubectl apply -f -

# バックアップ用CronJobを作成
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
  namespace: production
spec:
  schedule: "0 1 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: mongo:latest
            command:
            - /bin/sh
            - -c
            - |
              mongodump --uri=\${MONGODB_URI} --out=/backup/\$(date +%Y%m%d)
              gzip /backup/\$(date +%Y%m%d)
              echo "Backup completed: \$(date)"
            env:
            - name: MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: mongodb-credentials
                  key: uri
            volumeMounts:
            - name: backup-volume
              mountPath: /backup
          volumes:
          - name: backup-volume
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
EOF

# バックアップ用のPVCを作成
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: backup-pvc
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
EOF

# アラートルールの設定
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: it-ops-alerts
  namespace: monitoring
spec:
  groups:
  - name: system
    rules:
    - alert: HighCPUUsage
      expr: sum(rate(container_cpu_usage_seconds_total{namespace="production"}[5m])) by (pod) > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "高CPU使用率検知: {{ $labels.pod }}"
        description: "Pod {{ $labels.pod }} の CPU 使用率が 80% を超えています"
    - alert: HighMemoryUsage
      expr: sum(container_memory_usage_bytes{namespace="production"}) by (pod) / sum(container_spec_memory_limit_bytes{namespace="production"}) by (pod) > 0.85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "高メモリ使用率検知: {{ $labels.pod }}"
        description: "Pod {{ $labels.pod }} のメモリ使用率が 85% を超えています"
    - alert: PodCrashLooping
      expr: increase(kube_pod_container_status_restarts_total{namespace="production"}[1h]) > 5
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "Podクラッシュ検知: {{ $labels.pod }}"
        description: "Pod {{ $labels.pod }} が過去1時間に5回以上再起動しています"
EOF

log "SUCCESS" "IT運用システム展開フェーズ Day1実行が完了しました"
log "INFO" "Grafanaへのアクセス方法を取得します:"
kubectl get secret --namespace monitoring grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo
echo "kubectl port-forward -n monitoring svc/grafana 3000:80 を実行してGrafanaにアクセスできます"

exit 0