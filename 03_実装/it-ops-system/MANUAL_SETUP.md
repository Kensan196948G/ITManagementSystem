# セキュリティ実装の手動設定マニュアル

## 1. 環境変数の設定

### Active Directory設定
```env
AD_URL=ldap://your-ad-server:389
AD_BASE_DN=DC=your,DC=domain,DC=com
AD_USERNAME=your-service-account@your-domain.com
AD_PASSWORD=your-service-account-password
```

### Microsoft 365設定
```env
MS_CLIENT_ID=your-azure-app-client-id
MS_CLIENT_SECRET=your-azure-app-client-secret
MS_TENANT_ID=your-azure-tenant-id
```

### Azure AD設定（最小権限）
```env
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

### Redis設定
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### SMTP設定（Exchange Online）
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=notification@mirai-const.co.jp
SMTP_PASS=your-exchange-online-password
ALERT_EMAIL_RECIPIENTS=admin@mirai-const.co.jp
```

## 2. Azure ADでのアプリケーション登録

1. Azure Portalで新しいアプリケーションを登録
2. 必要な権限を付与:
   - User.Read.All
   - GroupMember.Read.All
   - Mail.Send

3. アプリケーション（クライアント）IDの取得
4. クライアントシークレットの生成
5. APIのアクセス許可を承認

## 3. セキュリティグループの設定

HENGEONEで以下のセキュリティグループを作成:

```plaintext
IT-Ops-Alert-Readers
IT-Ops-Alert-Managers
IT-Ops-Metrics-Viewers
IT-Ops-Metrics-Managers
IT-Ops-Security-Viewers
IT-Ops-Security-Managers
IT-Ops-User-Readers
IT-Ops-User-Managers
```

各グループの権限マッピング:
- Readers: 読み取り専用アクセス
- Managers: 読み取り/書き込みアクセス

## 4. Redisサーバーのセットアップ

1. Redisサーバーのインストール
2. セキュリティ設定:
   ```conf
   requirepass your-redis-password
   maxmemory 2gb
   maxmemory-policy allkeys-lru
   ```

3. パフォーマンス設定:
   ```conf
   maxclients 10000
   timeout 300
   tcp-keepalive 60
   ```

## 5. モニタリング設定

### Prometheusの設定
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'it-ops-system'
    static_configs:
      - targets: ['localhost:3000']
```

### アラート閾値の設定
```env
SECURITY_ALERT_THRESHOLD_FAILED_ATTEMPTS=5
SECURITY_ALERT_THRESHOLD_RAPID_ACCESS=10
SECURITY_ALERT_TIME_WINDOW=300
```

## 6. セキュリティ設定の確認項目

1. CORS設定の確認:
   ```env
   CORS_ORIGIN=http://localhost:3001
   ```

2. レート制限の設定:
   ```env
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX=100
   ```

3. JWTの設定:
   ```env
   JWT_SECRET=your-strong-secret-key
   JWT_EXPIRES_IN=24h
   ```

## 7. バックアップ設定

1. バックアップディレクトリの作成:
   ```bash
   mkdir -p backups/
   chmod 700 backups/
   ```

2. バックアップスケジュールの設定:
   ```env
   BACKUP_ENABLED=true
   BACKUP_INTERVAL=86400000
   BACKUP_PATH=backups/
   ```

## 8. ログ設定

1. ログディレクトリの作成:
   ```bash
   mkdir -p logs/
   chmod 755 logs/
   ```

2. ログローテーションの設定:
   ```env
   LOG_LEVEL=debug
   LOG_FILE_PATH=logs/app.log
   LOG_MAX_SIZE=10m
   LOG_MAX_FILES=7
   ```

## 9. 定期的なメンテナンス作業

1. トークンの定期的なクリーンアップ
2. 監査ログの定期的なアーカイブ
3. パフォーマンスメトリクスの確認
4. セキュリティアラートの確認

## 10. 運用時の注意事項

1. 権限変更時の監査ログの確認
2. セキュリティアラートの監視
3. パフォーマンスメトリクスの監視
4. アクセスパターンの分析
5. エラー率の監視

## 11. トラブルシューティング

1. 権限エラー発生時:
   - セキュリティグループの所属確認
   - トークンの有効性確認
   - キャッシュの確認

2. パフォーマンス問題発生時:
   - Redisのメモリ使用状況確認
   - キャッシュヒット率の確認
   - メトリクスの確認

3. 監視アラート発生時:
   - ログファイルの確認
   - メトリクスの確認
   - セキュリティ監査ログの確認

# セキュリティ実装の手動設定マニュアル（続き）

## 12. HENGEONEでの追加設定

### SAML認証設定
1. IdPメタデータの設定
2. SPメタデータの設定
3. 属性マッピングの設定:
   - NameID: メールアドレス
   - Groups: セキュリティグループ
   - Role: ロール情報

### シングルサインオン設定
1. リダイレクトURIの設定
2. ログアウトURLの設定
3. セッションタイムアウトの設定

## 13. アプリケーション権限の詳細設定

### Microsoft Graph API権限の最小化
- User.Read.All:
  - ユーザー情報の読み取り
  - プロファイル情報のアクセス

- GroupMember.Read.All:
  - グループメンバーシップの読み取り
  - セキュリティグループの確認

- Mail.Send:
  - アラート通知メールの送信
  - システム通知の送信

## 14. セキュリティ監視の詳細設定

### アラート通知の設定
1. メール通知テンプレートのカスタマイズ
2. アラート重要度の定義:
   ```json
   {
     "critical": {
       "responseTime": "immediate",
       "notificationChannels": ["email", "sms"]
     },
     "high": {
       "responseTime": "30min",
       "notificationChannels": ["email"]
     },
     "medium": {
       "responseTime": "2hours",
       "notificationChannels": ["email"]
     },
     "low": {
       "responseTime": "24hours",
       "notificationChannels": ["email"]
     }
   }
   ```

### 監視メトリクスのカスタマイズ
1. カスタムメトリクスの追加
2. アラートルールの設定
3. 閾値の調整

## 15. パフォーマンスチューニング

### Redis設定の最適化
```conf
# メモリ管理
maxmemory-samples 10
maxmemory-policy volatile-lru

# パフォーマンス
io-threads 4
io-threads-do-reads yes

# 永続化
save 900 1
save 300 10
save 60 10000
```

### アプリケーションキャッシュの設定
```env
CACHE_TTL=300
CACHE_MAX_SIZE=10000
CACHE_CHECK_PERIOD=60
```

## 16. 監査ログの詳細設定

### ログフォーマット
```json
{
  "timestamp": "ISO8601形式",
  "level": "INFO|WARN|ERROR",
  "action": "アクション名",
  "user": "実行ユーザー",
  "resource": "対象リソース",
  "result": "結果",
  "metadata": {
    "ip": "クライアントIP",
    "userAgent": "ユーザーエージェント",
    "sessionId": "セッションID"
  }
}
```

### ログローテーション詳細設定
```conf
rotate 7
daily
missingok
notifempty
compress
delaycompress
```

## 17. CI/CD環境での注意点

1. 環境変数の管理:
   - 本番環境の秘密情報は必ず暗号化
   - 環境ごとに適切な値を設定

2. デプロイメントチェック:
   - セキュリティグループの存在確認
   - 権限設定の検証
   - メトリクス収集の確認

3. 監視設定の確認:
   - アラートルールの適用
   - 通知設定の確認
   - ログ収集の確認

# セキュリティ実装の手動設定マニュアル（最終追加項目）

## 18. 権限の段階的実装手順

### Phase 1: 基本認証の実装
1. Active Directory連携の確認
2. 基本的なユーザー認証の確認
3. トークン管理の動作確認

### Phase 2: 権限制御の実装
1. セキュリティグループの設定
2. 権限マッピングの確認
3. アクセス制御の検証

### Phase 3: モニタリングの実装
1. メトリクス収集の開始
2. アラート通知の設定
3. ログ収集の確認

## 19. 定期メンテナンス計画

### 日次チェック項目
- セキュリティアラートの確認
- エラーログの確認
- パフォーマンスメトリクスの確認

### 週次チェック項目
- アクセス統計の分析
- 権限変更の監査
- キャッシュヒット率の確認

### 月次チェック項目
- セキュリティパッチの適用
- バックアップの検証
- パフォーマンス最適化

## 20. トラブルシューティングガイド

### 権限関連の問題
```
症状: アクセス拒否エラー
確認項目:
1. セキュリティグループのメンバーシップ
2. トークンの有効性
3. キャッシュの状態
```

### パフォーマンス関連の問題
```
症状: レスポンス遅延
確認項目:
1. Redisのメモリ使用状況
2. キャッシュヒット率
3. アクティブセッション数
```

### 監視関連の問題
```
症状: アラート未通知
確認項目:
1. メール送信設定
2. アラート閾値の設定
3. メトリクス収集状態
```

## 21. セキュリティ運用チェックリスト

### 日次確認
- [ ] セキュリティアラートの確認
- [ ] 異常アクセスの確認
- [ ] エラーログの確認
- [ ] バックアップの確認

### 週次確認
- [ ] アクセスパターンの分析
- [ ] パフォーマンスメトリクスの確認
- [ ] キャッシュ効率の確認
- [ ] 権限変更の監査

### 月次確認
- [ ] セキュリティポリシーの見直し
- [ ] アクセス権限の棚卸し
- [ ] パフォーマンス最適化
- [ ] バックアップの検証

## 22. 緊急時対応手順

### セキュリティインシデント発生時
1. 影響範囲の特定
2. 一時的なアクセス制限
3. ログの保全
4. 原因調査
5. 対策実施

### システム障害発生時
1. 影響サービスの特定
2. バックアップの確認
3. 復旧手順の実行
4. 影響範囲の報告
5. 再発防止策の策定

## 23. パフォーマンスチューニングガイド

### Redisの最適化
```conf
# コネクション設定
tcp-keepalive 60
timeout 300
maxclients 10000

# メモリ設定
maxmemory 2gb
maxmemory-policy allkeys-lru
maxmemory-samples 10

# 永続化設定
save 900 1
save 300 10
appendonly yes
appendfsync everysec
```

### アプリケーションの最適化
```env
# キャッシュ設定
CACHE_TTL=300
CACHE_MAX_SIZE=10000
CACHE_CHECK_PERIOD=60

# パフォーマンス設定
NODE_HEAP_SIZE_MB=4096
CLUSTER_MODE=true
WORKER_PROCESSES=auto
```

## 24. 監視メトリクスのカスタマイズ

### カスタムメトリクスの追加
```typescript
// メトリクス定義例
const customMetrics = {
  accessPatterns: new prometheus.Counter({
    name: 'access_patterns_total',
    help: 'アクセスパターンの分析結果',
    labelNames: ['pattern_type', 'user_group']
  }),
  
  permissionChanges: new prometheus.Counter({
    name: 'permission_changes_total',
    help: '権限変更の追跡',
    labelNames: ['change_type', 'user_group']
  }),

  securityEvents: new prometheus.Counter({
    name: 'security_events_total',
    help: 'セキュリティイベントの追跡',
    labelNames: ['event_type', 'severity']
  })
}