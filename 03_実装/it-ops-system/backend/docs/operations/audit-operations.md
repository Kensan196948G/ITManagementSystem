# 権限変更監査システム運用手順書

## 1. 日次運用手順

### 1.1 システム状態確認
- [ ] サービスの稼働状態確認
- [ ] エラーログの確認（/logs/error.log）
- [ ] メトリクスダッシュボードの確認

### 1.2 アラート確認
```sql
-- 異常な権限変更パターンの検出
SELECT actor_email, COUNT(*) as changes
FROM permission_audit 
WHERE timestamp >= datetime('now', '-24 hours')
GROUP BY actor_email 
HAVING COUNT(*) > 10;
```

### 1.3 バックアップ確認
- [ ] 日次バックアップの成功確認
- [ ] バックアップファイルの整合性チェック

## 2. 週次運用手順

### 2.1 パフォーマンス分析
```bash
# パフォーマンステストの実行
npm run test:performance

# 結果の確認とレポート生成
npm run generate-performance-report
```

### 2.2 データベースメンテナンス
```sql
-- インデックスの再構築
REINDEX TABLE permission_audit;
REINDEX TABLE permission_audit_reviews;
REINDEX TABLE audit_metrics;

-- 断片化率の確認
ANALYZE;
```

### 2.3 セキュリティチェック
- [ ] アクセスログの監査
- [ ] 異常なログインパターンの確認
- [ ] 権限設定の見直し

## 3. 月次運用手順

### 3.1 月次レポート生成
1. 統計情報の出力
   ```bash
   npm run generate-monthly-report
   ```

2. レポート内容の確認項目
   - 権限変更の総数と傾向
   - レビュー完了率
   - 異常検知の件数
   - パフォーマンス指標

### 3.2 データアーカイブ
1. 古いデータのアーカイブ
   ```sql
   -- 1年以上前のデータをアーカイブ
   INSERT INTO permission_audit_archive
   SELECT * FROM permission_audit
   WHERE timestamp < datetime('now', '-1 year');
   ```

2. アーカイブの確認
   - データの整合性チェック
   - アーカイブログの保存

### 3.3 システムメンテナンス
- [ ] セキュリティパッチの適用
- [ ] 依存パッケージの更新
- [ ] 設定ファイルの見直し

## 4. インシデント対応手順

### 4.1 異常検知時の対応
1. 初期対応
   - インシデントの切り分け
   - 影響範囲の特定
   - 一時的な対策の実施

2. エスカレーション基準
   - サービス停止の可能性がある場合
   - データ漏洩の可能性がある場合
   - 不正アクセスの痕跡がある場合

### 4.2 復旧手順
1. サービス復旧
   ```bash
   # プロセスの再起動
   npm run restart-service

   # データベースの復旧（必要な場合）
   npm run restore-db backup/latest.bak
   ```

2. 影響調査
   - 監査ログの分析
   - セキュリティログの確認
   - ユーザーへの影響確認

### 4.3 報告と再発防止
- インシデントレポートの作成
- 再発防止策の立案と実施
- 手順書の更新

## 5. バックアップとリストア

### 5.1 バックアップ手順
1. 日次バックアップ
   ```bash
   # データベースのバックアップ
   npm run backup-db

   # 設定ファイルのバックアップ
   npm run backup-config
   ```

2. バックアップの検証
   ```bash
   # バックアップの整合性チェック
   npm run verify-backup
   ```

### 5.2 リストア手順
1. サービスの停止
   ```bash
   npm run stop-service
   ```

2. データの復元
   ```bash
   # データベースの復元
   npm run restore-db backup/target.bak

   # 設定の復元
   npm run restore-config backup/config.tar.gz
   ```

3. 動作確認
   ```bash
   # サービスの起動と健全性チェック
   npm run start-service
   npm run health-check
   ```

## 6. パフォーマンスチューニング

### 6.1 定期的な最適化
1. インデックスの最適化
   ```sql
   -- インデックスの使用状況確認
   SELECT * FROM sqlite_stat1;

   -- 必要に応じてインデックスを再構築
   REINDEX TABLE permission_audit;
   ```

2. クエリパフォーマンスの分析
   ```bash
   # スロークエリの分析
   npm run analyze-slow-queries
   ```

### 6.2 負荷対策
1. 接続プール設定の調整
   ```javascript
   // config/database.js
   {
     maxConnections: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000
   }
   ```

2. キャッシュ設定の調整
   ```javascript
   // config/cache.js
   {
     ttl: 3600,
     maxSize: 1000,
     updateAgeOnGet: true
   }
   ```

## 7. セキュリティ運用

### 7.1 アクセス管理
1. 定期的な権限レビュー
   ```sql
   -- 未使用アカウントの検出
   SELECT user_id, last_access
   FROM user_access_log
   WHERE last_access < datetime('now', '-90 days');
   ```

2. 特権アカウントの監視
   ```sql
   -- 特権操作の監査
   SELECT * FROM permission_audit
   WHERE action = 'modify'
   AND resource_type = 'admin_role'
   ORDER BY timestamp DESC;
   ```

### 7.2 脆弱性対応
1. 定期的なスキャン
   ```bash
   # 依存パッケージのセキュリティチェック
   npm audit

   # ソースコードの静的解析
   npm run security-scan
   ```

2. パッチ適用手順
   ```bash
   # パッケージの更新
   npm update

   # テストの実行
   npm run test
   npm run test:security
   ```

## 8. コンプライアンス対応

### 8.1 監査ログの保管
1. ログローテーション
   ```bash
   # 古いログのアーカイブ
   npm run archive-logs

   # アーカイブの暗号化
   npm run encrypt-archive
   ```

2. アクセスログの保管
   ```sql
   -- アクセスログのエクスポート
   .output access_log_archive.csv
   SELECT * FROM access_log
   WHERE timestamp < datetime('now', '-1 year');
   ```

### 8.2 定期レポート
1. コンプライアンスレポートの生成
   ```bash
   # 月次コンプライアンスレポート
   npm run generate-compliance-report
   ```

2. 監査証跡の確認
   ```sql
   -- 監査ログの完全性チェック
   SELECT COUNT(*) as gaps
   FROM permission_audit a
   LEFT JOIN audit_checksums c
   ON a.id = c.audit_id
   WHERE c.audit_id IS NULL;
   ```