"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPriorities = exports.NotificationTypes = exports.AuditActions = exports.AuditLogMessages = exports.AuditErrorMessages = void 0;
exports.AuditErrorMessages = {
    INVALID_DATE_RANGE: '無効な日付範囲です',
    INVALID_ACTION_TYPE: '無効なアクションタイプです',
    INVALID_EMAIL_FORMAT: '無効なメールアドレス形式です',
    INVALID_RECORD_ID: '無効な記録IDです',
    INVALID_COMMENTS_LENGTH: 'コメントは1文字以上1000文字以下で入力してください',
    RECORD_NOT_FOUND: '指定された監査記録が見つかりません',
    PERMISSION_DENIED: '権限がありません',
    FETCH_FAILED: '権限変更履歴の取得に失敗しました',
    REVIEW_SAVE_FAILED: 'レビューの保存に失敗しました',
    STATS_FETCH_FAILED: '統計情報の取得に失敗しました',
    DB_INIT_FAILED: 'データベースの初期化に失敗しました'
};
exports.AuditLogMessages = {
    PERMISSION_CHANGE_RECORDED: '権限変更を記録しました',
    REVIEW_RECORDED: '権限変更レビューを記録しました',
    NOTIFICATION_SENT: '通知を送信しました',
    SERVICE_INITIALIZED: 'PermissionAuditServiceが初期化されました',
    DB_INITIALIZED: '監査テーブルが初期化されました'
};
exports.AuditActions = {
    ADD: 'add',
    REMOVE: 'remove',
    MODIFY: 'modify'
};
exports.NotificationTypes = {
    SECURITY: 'security'
};
exports.NotificationPriorities = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
};
//# sourceMappingURL=auditMessages.js.map