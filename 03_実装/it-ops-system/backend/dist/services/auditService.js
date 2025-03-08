"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const sqliteService_1 = require("./sqliteService");
const loggingService_1 = __importDefault(require("./loggingService"));
const notificationService_1 = require("./notificationService");
const dotenv_1 = require("dotenv");
// 環境変数を読み込み
(0, dotenv_1.config)();
const logger = loggingService_1.default.getInstance();
class AuditService {
    constructor() {
        this.sqlite = sqliteService_1.SQLiteService.getInstance();
        this.notificationService = notificationService_1.NotificationService.getInstance();
    }
    static getInstance() {
        if (!AuditService.instance) {
            AuditService.instance = new AuditService();
        }
        return AuditService.instance;
    }
    /**
     * 権限変更を記録する
     * @param entry 監査エントリ
     * @returns 成功時は監査エントリID、失敗時はnull
     */
    async logPermissionChange(entry) {
        try {
            // タイムスタンプがない場合は現在時刻を設定
            if (!entry.timestamp) {
                entry.timestamp = new Date().toISOString();
            }
            // 監査ログをDBに保存
            const result = await this.sqlite.run(`INSERT INTO permission_audit_log
         (user_id, user_email, target_user_id, target_user_email, action_type, resource, action, details, timestamp, ip_address, user_agent, success)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                entry.userId,
                entry.userEmail,
                entry.targetUserId || null,
                entry.targetUserEmail || null,
                entry.actionType,
                entry.resource,
                entry.action || null,
                JSON.stringify(entry.details),
                entry.timestamp,
                entry.ipAddress || null,
                entry.userAgent || null,
                entry.success ? 1 : 0
            ]);
            // 重要な権限変更の場合は通知を送信
            if (entry.success && this.isImportantPermissionChange(entry)) {
                await this.sendPermissionChangeNotifications(entry);
            }
            logger.logInfo({
                message: '権限変更を監査ログに記録しました',
                details: {
                    actionType: entry.actionType,
                    resource: entry.resource,
                    userEmail: entry.userEmail,
                    targetUserEmail: entry.targetUserEmail,
                    success: entry.success
                }
            });
            return result.lastID;
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditService',
                message: '権限変更の記録に失敗しました',
                details: {
                    actionType: entry.actionType,
                    resource: entry.resource,
                    userEmail: entry.userEmail
                }
            });
            return null;
        }
    }
    /**
     * 重要な権限変更かどうかを判定
     * @param entry 監査エントリ
     * @returns 重要な変更かどうか
     */
    isImportantPermissionChange(entry) {
        // 管理者権限の付与/削除は重要
        if (entry.actionType === 'ADMIN_ESCALATION' ||
            entry.actionType === 'ADMIN_REVOCATION' ||
            entry.actionType === 'ROLE_ASSIGN' ||
            entry.actionType === 'ROLE_REMOVE') {
            return true;
        }
        // セキュリティ関連のリソースは重要
        if (entry.resource.includes('security')) {
            return true;
        }
        // admin権限に関する変更は重要
        if (entry.action?.includes('admin')) {
            return true;
        }
        return false;
    }
    /**
     * 権限変更の通知を送信
     * @param entry 監査エントリ
     */
    async sendPermissionChangeNotifications(entry) {
        try {
            // システム管理者への通知
            const adminEmails = await this.getSystemAdminEmails();
            // 通知メッセージの作成
            let message = `権限変更: ${entry.actionType}`;
            if (entry.targetUserEmail) {
                message += ` - 対象: ${entry.targetUserEmail}`;
            }
            if (entry.resource) {
                message += ` - リソース: ${entry.resource}`;
            }
            if (entry.action) {
                message += ` - アクション: ${entry.action}`;
            }
            // システム管理者に通知
            for (const adminEmail of adminEmails) {
                await this.notificationService.sendSystemNotification(adminEmail, message, 'PERMISSION_CHANGE', {
                    auditEntryId: entry.id,
                    actionType: entry.actionType,
                    targetUserEmail: entry.targetUserEmail,
                    userEmail: entry.userEmail,
                    timestamp: entry.timestamp
                });
            }
            // メール通知が有効な場合はメールも送信
            if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true') {
                // システム管理者にメール送信
                for (const adminEmail of adminEmails) {
                    await this.notificationService.sendEmail(adminEmail, `[IT運用システム] 権限変更通知 - ${entry.actionType}`, `以下の権限変更が行われました：
            
変更タイプ: ${entry.actionType}
実行者: ${entry.userEmail}
対象ユーザー: ${entry.targetUserEmail || 'なし'}
リソース: ${entry.resource}
アクション: ${entry.action || 'なし'}
日時: ${new Date(entry.timestamp).toLocaleString('ja-JP')}

詳細は管理画面の「権限監査ログ」から確認してください。`);
                }
            }
            logger.logInfo({
                message: '権限変更の通知を送信しました',
                details: {
                    actionType: entry.actionType,
                    adminCount: adminEmails.length
                }
            });
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditService',
                message: '権限変更通知の送信に失敗しました',
                details: {
                    actionType: entry.actionType,
                    resource: entry.resource
                }
            });
        }
    }
    /**
     * システム管理者のメールアドレスを取得
     * @returns 管理者メールアドレスの配列
     */
    async getSystemAdminEmails() {
        try {
            // システム管理者のメールアドレスをDBから取得
            const admins = await this.sqlite.all(`SELECT email FROM users
         WHERE is_admin = 1 AND receive_notifications = 1`);
            return admins.map(admin => admin.email);
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditService',
                message: 'システム管理者のメールアドレス取得に失敗しました'
            });
            // エラー時はバックアップ用のメールアドレスを返す
            return [process.env.ADMIN_EMAIL || 'admin@example.com'];
        }
    }
    /**
     * 監査ログを取得する
     * @param filters フィルター条件（オプション）
     * @param limit 取得する最大数
     * @param offset オフセット（ページネーション用）
     * @returns 監査ログエントリの配列
     */
    async getAuditLogs(filters = {}, limit = 100, offset = 0) {
        try {
            // SQL条件の構築
            let conditions = [];
            const params = [];
            if (filters.userEmail) {
                conditions.push('user_email = ?');
                params.push(filters.userEmail);
            }
            if (filters.targetUserEmail) {
                conditions.push('target_user_email = ?');
                params.push(filters.targetUserEmail);
            }
            if (filters.actionType) {
                conditions.push('action_type = ?');
                params.push(filters.actionType);
            }
            if (filters.resource) {
                conditions.push('resource = ?');
                params.push(filters.resource);
            }
            if (filters.startDate) {
                conditions.push('timestamp >= ?');
                params.push(filters.startDate);
            }
            if (filters.endDate) {
                conditions.push('timestamp <= ?');
                params.push(filters.endDate);
            }
            // WHERE句の構築
            const whereClause = conditions.length > 0
                ? `WHERE ${conditions.join(' AND ')}`
                : '';
            // クエリの実行
            const logs = await this.sqlite.all(`SELECT * FROM permission_audit_log
         ${whereClause}
         ORDER BY timestamp DESC
         LIMIT ? OFFSET ?`, [...params, limit, offset]);
            // 結果の変換
            return logs.map(log => ({
                id: log.id,
                userId: log.user_id,
                userEmail: log.user_email,
                targetUserId: log.target_user_id,
                targetUserEmail: log.target_user_email,
                actionType: log.action_type,
                resource: log.resource,
                action: log.action,
                details: JSON.parse(log.details),
                timestamp: log.timestamp,
                ipAddress: log.ip_address,
                userAgent: log.user_agent,
                success: log.success === 1
            }));
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditService',
                message: '監査ログの取得に失敗しました',
                details: {
                    filters,
                    limit,
                    offset
                }
            });
            return [];
        }
    }
    /**
     * 監査ログのカウントを取得（ページネーション用）
     * @param filters フィルター条件
     * @returns 監査ログの総数
     */
    async countAuditLogs(filters = {}) {
        try {
            // SQL条件の構築
            let conditions = [];
            const params = [];
            if (filters.userEmail) {
                conditions.push('user_email = ?');
                params.push(filters.userEmail);
            }
            if (filters.targetUserEmail) {
                conditions.push('target_user_email = ?');
                params.push(filters.targetUserEmail);
            }
            if (filters.actionType) {
                conditions.push('action_type = ?');
                params.push(filters.actionType);
            }
            if (filters.resource) {
                conditions.push('resource = ?');
                params.push(filters.resource);
            }
            if (filters.startDate) {
                conditions.push('timestamp >= ?');
                params.push(filters.startDate);
            }
            if (filters.endDate) {
                conditions.push('timestamp <= ?');
                params.push(filters.endDate);
            }
            // WHERE句の構築
            const whereClause = conditions.length > 0
                ? `WHERE ${conditions.join(' AND ')}`
                : '';
            // クエリの実行
            const result = await this.sqlite.get(`SELECT COUNT(*) as count FROM permission_audit_log ${whereClause}`, params);
            return result?.count || 0;
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditService',
                message: '監査ログのカウントに失敗しました',
                details: {
                    filters
                }
            });
            return 0;
        }
    }
    /**
     * 特定のユーザーの権限変更履歴を取得
     * @param userEmail ユーザーのメールアドレス
     * @param limit 取得する最大数
     * @returns 権限変更履歴
     */
    async getUserPermissionHistory(userEmail, limit = 50) {
        try {
            // ユーザーに関連する権限変更を取得（対象ユーザーまたは変更実行者として）
            const logs = await this.sqlite.all(`SELECT * FROM permission_audit_log
         WHERE user_email = ? OR target_user_email = ?
         ORDER BY timestamp DESC
         LIMIT ?`, [userEmail, userEmail, limit]);
            // 結果の変換
            return logs.map(log => ({
                id: log.id,
                userId: log.user_id,
                userEmail: log.user_email,
                targetUserId: log.target_user_id,
                targetUserEmail: log.target_user_email,
                actionType: log.action_type,
                resource: log.resource,
                action: log.action,
                details: JSON.parse(log.details),
                timestamp: log.timestamp,
                ipAddress: log.ip_address,
                userAgent: log.user_agent,
                success: log.success === 1
            }));
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditService',
                message: 'ユーザー権限履歴の取得に失敗しました',
                userEmail
            });
            return [];
        }
    }
    /**
     * 定期的な権限レビューの対象となるユーザーを取得
     * @param daysThreshold レビュー期間のしきい値（日数）
     * @returns レビュー対象ユーザーのリスト
     */
    async getUsersForPermissionReview(daysThreshold = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
            const users = await this.sqlite.all(`SELECT u.email, u.last_permission_review
         FROM users u
         WHERE u.last_permission_review IS NULL
            OR u.last_permission_review < ?
         ORDER BY u.last_permission_review ASC NULLS FIRST`, [cutoffDate.toISOString()]);
            return users.map(user => ({
                email: user.email,
                lastReview: user.last_permission_review
            }));
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditService',
                message: '権限レビュー対象ユーザーの取得に失敗しました',
                daysThreshold
            });
            return [];
        }
    }
    /**
     * 権限レビュー完了を記録
     * @param userEmail ユーザーのメールアドレス
     * @param reviewedBy レビューを実施した管理者のメールアドレス
     * @param notes レビュー時のメモ（オプション）
     * @returns 成功したかどうか
     */
    async markPermissionReviewComplete(userEmail, reviewedBy, notes) {
        try {
            // ユーザーの権限レビュー日時を更新
            await this.sqlite.run(`UPDATE users 
         SET last_permission_review = ?, 
             last_reviewed_by = ?
         WHERE email = ?`, [new Date().toISOString(), reviewedBy, userEmail]);
            // 監査ログに記録
            await this.logPermissionChange({
                userId: reviewedBy,
                userEmail: reviewedBy,
                targetUserEmail: userEmail,
                actionType: 'PERMISSION_REVIEW',
                resource: 'user_permissions',
                details: {
                    notes: notes || 'No notes provided'
                },
                timestamp: new Date().toISOString(),
                success: true
            });
            return true;
        }
        catch (error) {
            logger.logError(error, {
                context: 'AuditService',
                message: '権限レビュー完了の記録に失敗しました',
                userEmail,
                reviewedBy
            });
            return false;
        }
    }
}
exports.AuditService = AuditService;
//# sourceMappingURL=auditService.js.map