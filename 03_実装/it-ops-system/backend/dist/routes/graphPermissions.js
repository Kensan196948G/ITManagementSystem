"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authorization_1 = require("../middleware/authorization");
const auth_1 = require("../routes/auth");
const graphPermissionService_1 = __importDefault(require("../services/graphPermissionService"));
const loggingService_1 = __importDefault(require("../services/loggingService"));
const authService_1 = require("../services/authService");
const router = express_1.default.Router();
const logger = loggingService_1.default.getInstance();
// サービスインスタンスを非同期で初期化するため、同期版を使用
const graphPermissionService = graphPermissionService_1.default.getInstanceSync();
const authService = authService_1.AuthService.getInstance();
// 非同期初期化を開始（エラーはログに記録）
(async () => {
    try {
        await graphPermissionService.initialize();
        logger.logInfo({
            context: 'GraphPermissionsAPI',
            message: 'GraphPermissionService initialized successfully'
        });
    }
    catch (error) {
        logger.logError(error, {
            context: 'GraphPermissionsAPI',
            message: 'Failed to initialize GraphPermissionService'
        });
    }
})();
/**
 * 利用可能なGraph APIパーミッション一覧を取得
 * 一般ユーザーも閲覧可能
 */
router.get('/available', auth_1.verifyToken, async (_req, res) => {
    try {
        const permissions = await graphPermissionService.getAvailablePermissions();
        res.json({
            status: 'success',
            data: permissions
        });
    }
    catch (error) {
        logger.logError(error, {
            context: 'GraphPermissionsAPI',
            message: '利用可能なパーミッション取得エラー'
        });
        res.status(500).json({
            status: 'error',
            message: '利用可能なパーミッション取得中にエラーが発生しました',
            code: 'GRAPH_PERMISSION_ERROR'
        });
    }
});
/**
 * ユーザーのGraph APIパーミッション一覧を取得
 * 一般ユーザーも閲覧可能（自分自身のパーミッションのみ）
 */
router.get('/users/:userEmail', auth_1.verifyToken, async (req, res) => {
    try {
        const { userEmail } = req.params;
        const requestingUserEmail = req.user?.email || '';
        const isAdmin = await authService.isGlobalAdmin(requestingUserEmail);
        // 自分自身のパーミッションを閲覧する場合、または管理者の場合は許可
        if (!isAdmin && requestingUserEmail.toLowerCase() !== userEmail.toLowerCase()) {
            return res.status(403).json({
                status: 'error',
                message: '他のユーザーのパーミッション情報を閲覧する権限がありません',
                code: 'PERMISSION_DENIED'
            });
        }
        const permissions = await graphPermissionService.listPermissions(userEmail, requestingUserEmail);
        res.json({
            status: 'success',
            data: permissions
        });
    }
    catch (error) {
        logger.logError(error, {
            context: 'GraphPermissionsAPI',
            message: 'ユーザーパーミッション取得エラー',
            userEmail: req.params.userEmail
        });
        res.status(500).json({
            status: 'error',
            message: 'ユーザーパーミッション取得中にエラーが発生しました',
            code: 'GRAPH_PERMISSION_ERROR'
        });
    }
});
/**
 * ユーザーにGraph APIパーミッションを付与
 * グローバル管理者のみ実行可能
 */
router.post('/users/:userEmail/grant', auth_1.verifyToken, authorization_1.requireGlobalAdmin, async (req, res) => {
    try {
        const { userEmail } = req.params;
        const { permission, scope } = req.body;
        const operatorEmail = req.user?.email || 'system';
        // 入力検証
        if (!permission || !scope) {
            return res.status(400).json({
                status: 'error',
                message: 'パーミッションとスコープは必須です',
                code: 'INVALID_REQUEST'
            });
        }
        if (scope !== 'Delegated' && scope !== 'Application') {
            return res.status(400).json({
                status: 'error',
                message: 'スコープは "Delegated" または "Application" である必要があります',
                code: 'INVALID_SCOPE'
            });
        }
        const result = await graphPermissionService.grantPermission(userEmail, permission, scope, operatorEmail);
        if (result.success) {
            res.json({
                status: 'success',
                message: result.message
            });
        }
        else {
            res.status(500).json({
                status: 'error',
                message: result.message,
                code: 'GRANT_PERMISSION_ERROR'
            });
        }
    }
    catch (error) {
        logger.logError(error, {
            context: 'GraphPermissionsAPI',
            message: 'パーミッション付与エラー',
            userEmail: req.params.userEmail,
            permission: req.body.permission,
            scope: req.body.scope
        });
        res.status(500).json({
            status: 'error',
            message: 'パーミッション付与中にエラーが発生しました',
            code: 'GRAPH_PERMISSION_ERROR'
        });
    }
});
/**
 * ユーザーからGraph APIパーミッションを削除
 * グローバル管理者のみ実行可能
 */
router.post('/users/:userEmail/revoke', auth_1.verifyToken, authorization_1.requireGlobalAdmin, async (req, res) => {
    try {
        const { userEmail } = req.params;
        const { permission, scope } = req.body;
        const operatorEmail = req.user?.email || 'system';
        // 入力検証
        if (!permission || !scope) {
            return res.status(400).json({
                status: 'error',
                message: 'パーミッションとスコープは必須です',
                code: 'INVALID_REQUEST'
            });
        }
        if (scope !== 'Delegated' && scope !== 'Application') {
            return res.status(400).json({
                status: 'error',
                message: 'スコープは "Delegated" または "Application" である必要があります',
                code: 'INVALID_SCOPE'
            });
        }
        const result = await graphPermissionService.revokePermission(userEmail, permission, scope, operatorEmail);
        if (result.success) {
            res.json({
                status: 'success',
                message: result.message
            });
        }
        else {
            res.status(500).json({
                status: 'error',
                message: result.message,
                code: 'REVOKE_PERMISSION_ERROR'
            });
        }
    }
    catch (error) {
        logger.logError(error, {
            context: 'GraphPermissionsAPI',
            message: 'パーミッション削除エラー',
            userEmail: req.params.userEmail,
            permission: req.body.permission,
            scope: req.body.scope
        });
        res.status(500).json({
            status: 'error',
            message: 'パーミッション削除中にエラーが発生しました',
            code: 'GRAPH_PERMISSION_ERROR'
        });
    }
});
/**
 * パーミッション監査ログの取得
 * 一般ユーザーも閲覧可能（自分自身に関連するログのみ）
 */
router.get('/audit-logs', auth_1.verifyToken, async (req, res) => {
    try {
        const userEmail = req.query.userEmail;
        const limit = parseInt(req.query.limit || '100');
        const offset = parseInt(req.query.offset || '0');
        const requestingUserEmail = req.user?.email || '';
        const isAdmin = await authService.isGlobalAdmin(requestingUserEmail);
        // 一般ユーザーは自分自身に関連するログのみ閲覧可能
        if (!isAdmin && userEmail && userEmail.toLowerCase() !== requestingUserEmail.toLowerCase()) {
            return res.status(403).json({
                status: 'error',
                message: '他のユーザーの監査ログを閲覧する権限がありません',
                code: 'PERMISSION_DENIED'
            });
        }
        // 一般ユーザーが自分のログを見る場合は、userEmailを自分のメールアドレスに強制的に設定
        const effectiveUserEmail = !isAdmin ? requestingUserEmail : userEmail;
        const logs = await graphPermissionService.getPermissionAuditLogs(effectiveUserEmail, limit, offset);
        res.json({
            status: 'success',
            data: logs
        });
    }
    catch (error) {
        logger.logError(error, {
            context: 'GraphPermissionsAPI',
            message: '監査ログ取得エラー'
        });
        res.status(500).json({
            status: 'error',
            message: '監査ログ取得中にエラーが発生しました',
            code: 'AUDIT_LOG_ERROR'
        });
    }
});
/**
 * IT運用情報の概要を取得
 * 一般ユーザーも閲覧可能
 */
router.get('/operations-summary', auth_1.verifyToken, async (_req, res) => {
    try {
        // IT運用情報の概要を取得（例：パーミッション付与数、ユーザー数など）
        const availablePermissions = await graphPermissionService.getAvailablePermissions();
        // 簡易的な統計情報を生成
        const summary = {
            totalAvailablePermissions: availablePermissions.length,
            delegatedPermissions: availablePermissions.filter(p => p.type === 'Delegated').length,
            applicationPermissions: availablePermissions.filter(p => p.type === 'Application').length,
            commonPermissions: availablePermissions
                .filter(p => ['User.Read', 'Mail.Read', 'Calendars.Read'].includes(p.value))
                .map(p => ({
                name: p.value,
                description: p.description,
                type: p.type
            })),
            lastUpdated: new Date().toISOString()
        };
        res.json({
            status: 'success',
            data: summary
        });
    }
    catch (error) {
        logger.logError(error, {
            context: 'GraphPermissionsAPI',
            message: 'IT運用情報取得エラー'
        });
        res.status(500).json({
            status: 'error',
            message: 'IT運用情報取得中にエラーが発生しました',
            code: 'OPERATIONS_INFO_ERROR'
        });
    }
});
exports.default = router;
//# sourceMappingURL=graphPermissions.js.map