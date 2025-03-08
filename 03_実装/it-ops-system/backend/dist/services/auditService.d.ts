export interface AuditEntry {
    id?: number;
    userId: string;
    userEmail: string;
    targetUserId?: string;
    targetUserEmail?: string;
    actionType: string;
    resource: string;
    action?: string;
    details: any;
    timestamp: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
}
export declare class AuditService {
    private static instance;
    private sqlite;
    private notificationService;
    private constructor();
    static getInstance(): AuditService;
    /**
     * 権限変更を記録する
     * @param entry 監査エントリ
     * @returns 成功時は監査エントリID、失敗時はnull
     */
    logPermissionChange(entry: AuditEntry): Promise<number | null>;
    /**
     * 重要な権限変更かどうかを判定
     * @param entry 監査エントリ
     * @returns 重要な変更かどうか
     */
    private isImportantPermissionChange;
    /**
     * 権限変更の通知を送信
     * @param entry 監査エントリ
     */
    private sendPermissionChangeNotifications;
    /**
     * システム管理者のメールアドレスを取得
     * @returns 管理者メールアドレスの配列
     */
    private getSystemAdminEmails;
    /**
     * 監査ログを取得する
     * @param filters フィルター条件（オプション）
     * @param limit 取得する最大数
     * @param offset オフセット（ページネーション用）
     * @returns 監査ログエントリの配列
     */
    getAuditLogs(filters?: {
        userEmail?: string;
        targetUserEmail?: string;
        actionType?: string;
        resource?: string;
        startDate?: string;
        endDate?: string;
    }, limit?: number, offset?: number): Promise<AuditEntry[]>;
    /**
     * 監査ログのカウントを取得（ページネーション用）
     * @param filters フィルター条件
     * @returns 監査ログの総数
     */
    countAuditLogs(filters?: {
        userEmail?: string;
        targetUserEmail?: string;
        actionType?: string;
        resource?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<number>;
    /**
     * 特定のユーザーの権限変更履歴を取得
     * @param userEmail ユーザーのメールアドレス
     * @param limit 取得する最大数
     * @returns 権限変更履歴
     */
    getUserPermissionHistory(userEmail: string, limit?: number): Promise<AuditEntry[]>;
    /**
     * 定期的な権限レビューの対象となるユーザーを取得
     * @param daysThreshold レビュー期間のしきい値（日数）
     * @returns レビュー対象ユーザーのリスト
     */
    getUsersForPermissionReview(daysThreshold?: number): Promise<{
        email: string;
        lastReview: string | null;
    }[]>;
    /**
     * 権限レビュー完了を記録
     * @param userEmail ユーザーのメールアドレス
     * @param reviewedBy レビューを実施した管理者のメールアドレス
     * @param notes レビュー時のメモ（オプション）
     * @returns 成功したかどうか
     */
    markPermissionReviewComplete(userEmail: string, reviewedBy: string, notes?: string): Promise<boolean>;
}
//# sourceMappingURL=auditService.d.ts.map