# デプロイメントガイド

## 前提条件

### 必要なツール
- Docker v24.x以上
- Kubernetes v1.28.x以上
- Node.js v20.x以上
- MongoDB v6.x以上
- Redis v7.x以上

### クラウドサービス
- Azure Kubernetes Service (AKS)
- MongoDB Atlas
- Azure Container Registry (ACR)

## コンテナ化

### Dockerfileの設定

#### フロントエンド
```dockerfile
# frontend/Dockerfile
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### バックエンド
```dockerfile
# backend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

### Docker Compose設定
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## Kubernetes設定

### フロントエンド
```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: ${ACR_NAME}.azurecr.io/frontend:latest
        ports:
        - containerPort: 80
```

### バックエンド
```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: ${ACR_NAME}.azurecr.io/backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: mongodb-uri
```

### サービス設定
```yaml
# k8s/services.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
spec:
  type: LoadBalancer
  ports:
  - port: 80
  selector:
    app: frontend
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  type: ClusterIP
  ports:
  - port: 3000
  selector:
    app: backend
```

## CI/CD設定

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to AKS

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2

    - name: Azure Login
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - name: Build and Push Images
      run: |
        az acr build -t frontend:${{ github.sha }} -r ${{ secrets.ACR_NAME }} ./frontend
        az acr build -t backend:${{ github.sha }} -r ${{ secrets.ACR_NAME }} ./backend

    - name: Deploy to AKS
      uses: azure/aks-set-context@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}
        cluster-name: ${{ secrets.AKS_CLUSTER_NAME }}
        resource-group: ${{ secrets.AKS_RESOURCE_GROUP }}
```

## デプロイ手順

### 1. 環境変数の設定
```bash
# .env.production作成
cp .env.example .env.production
# 必要な環境変数を設定
```

### 2. シークレットの設定
```bash
# Kubernetesシークレットの作成
kubectl create secret generic app-secrets \
  --from-literal=mongodb-uri=$MONGODB_URI \
  --from-literal=redis-url=$REDIS_URL
```

### 3. デプロイ実行
```bash
# アプリケーションのデプロイ
kubectl apply -f k8s/

# デプロイ状況の確認
kubectl get pods
kubectl get services
```

### 4. ヘルスチェック
```bash
# フロントエンドの確認
curl http://<FRONTEND_IP>

# バックエンドの確認
curl http://<BACKEND_IP>/health
```

## スケーリング設定

### 水平スケーリング
```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## モニタリング設定

### Prometheus & Grafana
```yaml
# k8s/monitoring.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: backend-monitor
spec:
  selector:
    matchLabels:
      app: backend
  endpoints:
  - port: metrics
```

## バックアップ・リストア

### データベースバックアップ
```bash
# MongoDBバックアップ
mongodump --uri $MONGODB_URI --out /backup/$(date +%Y%m%d)

# バックアップの自動化
kubectl create cronjob mongo-backup --schedule="0 1 * * *" \
  --image=mongo \
  --command='mongodump --uri=$MONGODB_URI'
```

## トラブルシューティング

### ログの確認
```bash
# Podのログ確認
kubectl logs <pod-name>

# 特定のコンテナのログ
kubectl logs <pod-name> -c <container-name>
```

### デバッグ
```bash
# Podへの接続
kubectl exec -it <pod-name> -- /bin/sh

# ネットワーク接続確認
kubectl run -it --rm debug --image=busybox -- wget -O- http://backend-service:3000