export declare const AuditErrorMessages: {
    readonly INVALID_DATE_RANGE: "無効な日付範囲です";
    readonly INVALID_ACTION_TYPE: "無効なアクションタイプです";
    readonly INVALID_EMAIL_FORMAT: "無効なメールアドレス形式です";
    readonly INVALID_RECORD_ID: "無効な記録IDです";
    readonly INVALID_COMMENTS_LENGTH: "コメントは1文字以上1000文字以下で入力してください";
    readonly RECORD_NOT_FOUND: "指定された監査記録が見つかりません";
    readonly PERMISSION_DENIED: "権限がありません";
    readonly FETCH_FAILED: "権限変更履歴の取得に失敗しました";
    readonly REVIEW_SAVE_FAILED: "レビューの保存に失敗しました";
    readonly STATS_FETCH_FAILED: "統計情報の取得に失敗しました";
    readonly DB_INIT_FAILED: "データベースの初期化に失敗しました";
};
export declare const AuditLogMessages: {
    readonly PERMISSION_CHANGE_RECORDED: "権限変更を記録しました";
    readonly REVIEW_RECORDED: "権限変更レビューを記録しました";
    readonly NOTIFICATION_SENT: "通知を送信しました";
    readonly SERVICE_INITIALIZED: "PermissionAuditServiceが初期化されました";
    readonly DB_INITIALIZED: "監査テーブルが初期化されました";
};
export declare const AuditActions: {
    readonly ADD: "add";
    readonly REMOVE: "remove";
    readonly MODIFY: "modify";
};
export declare const NotificationTypes: {
    readonly SECURITY: "security";
};
export declare const NotificationPriorities: {
    readonly HIGH: "high";
    readonly MEDIUM: "medium";
    readonly LOW: "low";
};
//# sourceMappingURL=auditMessages.d.ts.map