export declare class AuditAutoRecoveryService {
    private static instance;
    private sqlite;
    private auditService;
    private metricsService;
    private notificationService;
    private isRecovering;
    private constructor();
    static getInstance(): AuditAutoRecoveryService;
    /**
     * 監視の開始
     */
    private startMonitoring;
    /**
     * メトリクスのチェック
     */
    private checkMetrics;
    /**
     * データベース健全性チェック
     */
    private checkDatabaseHealth;
    /**
     * インデックス最適化のチェック
     */
    private checkIndexOptimization;
    /**
     * インデックス再構築の必要性判断
     */
    private needsIndexRebuild;
    /**
     * インデックスの再構築
     */
    private rebuildIndexes;
    /**
     * 遅いレスポンスへの対応
     */
    private handleSlowResponses;
    /**
     * 高エラー率への対応
     */
    private handleHighErrorRate;
    /**
     * メモリ使用量過多への対応
     */
    private handleHighMemoryUsage;
    /**
     * データベースエラーへの対応
     */
    private handleDatabaseError;
    /**
     * キャッシュのクリア
     */
    private clearCache;
    /**
     * クエリプランの最適化
     */
    private optimizeQueryPlans;
    /**
     * データベース接続のリセット
     */
    private resetDatabaseConnections;
    /**
     * エラーログの分析と対応
     */
    private analyzeAndRespondToErrors;
    /**
     * 最近のエラーログの取得
     */
    private getRecentErrorLogs;
    /**
     * エラーパターンの分析
     */
    private analyzeErrorPatterns;
    /**
     * エラー回復戦略の実行
     */
    private executeErrorRecoveryStrategy;
    /**
     * サービスの健全性チェック
     */
    private performHealthCheck;
    /**
     * データベースの健全性チェック
     */
    private isDatabaseHealthy;
    /**
     * バックアップからの復元
     */
    private restoreFromBackup;
    /**
     * 最新のバックアップファイルの検索
     */
    private findLatestBackup;
    /**
     * サービスの再起動
     */
    private restartService;
}
//# sourceMappingURL=auditAutoRecoveryService.d.ts.map