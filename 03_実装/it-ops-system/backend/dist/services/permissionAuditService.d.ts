/**
 * 権限変更監査のタイプ定義
 */
export interface PermissionAuditRecord {
    id?: number;
    timestamp: Date;
    actorId: string;
    actorEmail: string;
    targetId: string;
    targetEmail: string;
    action: 'add' | 'remove' | 'modify';
    resourceType: string;
    resourceName: string;
    permissionBefore?: string;
    permissionAfter?: string;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    applicationId?: string;
}
/**
 * 権限変更監査レポートのフィルター
 */
export interface AuditReportFilter {
    startDate?: Date;
    endDate?: Date;
    actorEmail?: string;
    targetEmail?: string;
    action?: string;
    resourceType?: string;
    limit?: number;
    offset?: number;
}
/**
 * 権限変更監査サービス
 * 権限変更の記録、検索、レポート生成を提供
 */
export declare class PermissionAuditService {
    private static instance;
    private sqlite;
    private authService;
    private notificationService;
    private metricsService;
    private constructor();
    static getInstance(): PermissionAuditService;
    /**
     * 監査テーブルの初期化
     */
    private initializeDatabase;
    /**
     * 権限変更の記録
     * @param record 監査レコード
     * @returns 挿入されたレコードのID
     */
    recordChange(record: PermissionAuditRecord): Promise<number>;
    /**
     * 権限変更の通知を送信
     * @param record 監査レコード
     */
    private notifyPermissionChange;
    /**
     * グローバル管理者のリストを取得
     */
    private getGlobalAdmins;
    /**
     * フィルター条件のバリデーション
     */
    private validateAuditFilter;
    /**
     * 監査レコードの検索
     * @param filter フィルター条件
     * @returns 監査レコードのリスト
     */
    searchAuditRecords(filter: AuditReportFilter): Promise<PermissionAuditRecord[]>;
    /**
     * 監査レコードを取得
     * @param id 監査レコードID
     * @returns 監査レコード
     */
    getAuditRecordById(id: number): Promise<PermissionAuditRecord | null>;
    /**
     * 権限変更統計の取得
     * @param filter フィルター条件
     * @returns 統計情報
     */
    getChangeStatistics(filter: AuditReportFilter): Promise<any>;
    /**
     * 権限変更レポートの生成
     * @param filter フィルター条件
     * @returns レポートデータ
     */
    generateReport(filter: AuditReportFilter): Promise<any>;
    /**
     * レビューデータのバリデーション
     */
    private validateReviewData;
    /**
     * 権限変更レビューの登録
     * @param auditId 監査レコードID
     * @param reviewerId レビュアーID
     * @param reviewerEmail レビュアーメールアドレス
     * @param approved 承認フラグ
     * @param comments コメント
     */
    recordReview(recordId: number, reviewerId: string, reviewerEmail: string, approved: boolean, comments: string): Promise<void>;
    /**
     * レビュー結果の通知
     */
    private notifyReviewResult;
    /**
     * ユーザー別の権限変更履歴の取得
     * @param userEmail ユーザーメールアドレス
     * @param limit 取得件数
     * @returns 権限変更履歴
     */
    getUserPermissionHistory(userEmail: string, limit?: number): Promise<PermissionAuditRecord[]>;
}
//# sourceMappingURL=permissionAuditService.d.ts.map