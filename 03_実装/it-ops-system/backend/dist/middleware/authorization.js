"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachMicrosoftPermissions = exports.requireGlobalAdmin = exports.requirePermission = exports.requireAuthLevel = void 0;
const permissionService_1 = require("../services/permissionService");
const authService_1 = require("../services/authService");
const errors_1 = require("../types/errors");
const loggingService_1 = __importDefault(require("../services/loggingService"));
const authorization_1 = require("../types/authorization");
const logger = loggingService_1.default.getInstance();
// 循環参照を避けるために、遅延初期化を使用
let permissionService;
let authService;
function getPermissionService() {
    if (!permissionService) {
        permissionService = permissionService_1.PermissionService.getInstance();
    }
    return permissionService;
}
function getAuthService() {
    if (!authService) {
        authService = authService_1.AuthService.getInstance();
    }
    return authService;
}
/**
 * 特定の権限レベルを要求するミドルウェア
 * @param level 必要な権限レベル
 */
const requireAuthLevel = (level) => {
    return async (req, res, next) => {
        try {
            if (!req.user?.id) {
                return next((0, errors_1.createError)(errors_1.ErrorCode.AUTH_UNAUTHORIZED, '認証されていないユーザーです', 401));
            }
            const userInfo = await getPermissionService().getUserInfo(req.user.id);
            if (!userInfo) {
                return next((0, errors_1.createError)(errors_1.ErrorCode.AD_USER_NOT_FOUND, 'ユーザー情報が見つかりません', 404));
            }
            // ユーザーロールを取得
            const roles = await getAuthService().getUserRoles(userInfo.email);
            let authorized = false;
            switch (level) {
                case authorization_1.AuthorizationLevel.GLOBAL_ADMIN_ONLY:
                    // グローバル管理者のみ許可
                    authorized = roles.isGlobalAdmin;
                    break;
                case authorization_1.AuthorizationLevel.ADMIN_ROLE:
                    // 管理者権限があるか、グローバル管理者であれば許可
                    authorized = roles.isGlobalAdmin ||
                        roles.roles.some(role => role.includes(':admin') || role.includes(':write'));
                    break;
                case authorization_1.AuthorizationLevel.USER_ROLE:
                    // 何らかの権限（読み取りも含む）があれば許可
                    authorized = roles.isGlobalAdmin || roles.roles.length > 0;
                    break;
                case authorization_1.AuthorizationLevel.AUTHENTICATED:
                    // 認証されていれば許可（すでにverifyTokenを通過しているため）
                    authorized = true;
                    break;
                default:
                    authorized = false;
            }
            if (!authorized) {
                logger.logSecurity({
                    userId: req.user.id,
                    event: 'authorization',
                    severity: 'medium',
                    details: {
                        requiredLevel: level,
                        userRoles: roles,
                        path: req.path,
                        method: req.method
                    }
                });
                return next((0, errors_1.createError)(errors_1.ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS, '必要な権限がありません', 403));
            }
            next();
        }
        catch (error) {
            logger.logError(error, {
                context: 'Authorization',
                message: '権限チェック中にエラーが発生しました',
                details: {
                    path: req.path,
                    method: req.method,
                    userId: req.user?.id
                }
            });
            next((0, errors_1.createError)(errors_1.ErrorCode.INTERNAL_SERVER_ERROR, '権限の確認中にエラーが発生しました', 500));
        }
    };
};
exports.requireAuthLevel = requireAuthLevel;
/**
 * 特定のリソースへのアクセス権を確認するミドルウェア
 * @param resource リソース名
 * @param action アクション（read, write, adminなど）
 */
const requirePermission = (resource, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user?.id) {
                return next((0, errors_1.createError)(errors_1.ErrorCode.AUTH_UNAUTHORIZED, '認証されていないユーザーです', 401));
            }
            const userInfo = await getPermissionService().getUserInfo(req.user.id);
            if (!userInfo) {
                return next((0, errors_1.createError)(errors_1.ErrorCode.AD_USER_NOT_FOUND, 'ユーザー情報が見つかりません', 404));
            }
            // 権限チェック
            const hasPermission = await getPermissionService().checkPermission(userInfo.email, resource, action);
            if (!hasPermission) {
                logger.logSecurity({
                    userId: req.user.id,
                    event: 'permission_check',
                    severity: 'medium',
                    details: {
                        resource,
                        action,
                        path: req.path,
                        method: req.method
                    }
                });
                return next((0, errors_1.createError)(errors_1.ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS, `リソース ${resource} に対する ${action} 権限がありません`, 403));
            }
            next();
        }
        catch (error) {
            logger.logError(error, {
                context: 'Permission',
                message: '権限チェック中にエラーが発生しました',
                details: {
                    resource,
                    action,
                    path: req.path,
                    method: req.method,
                    userId: req.user?.id
                }
            });
            next((0, errors_1.createError)(errors_1.ErrorCode.INTERNAL_SERVER_ERROR, '権限の確認中にエラーが発生しました', 500));
        }
    };
};
exports.requirePermission = requirePermission;
/**
 * グローバル管理者専用の機能へのアクセスを制限するミドルウェア
 */
const requireGlobalAdmin = async (req, res, next) => {
    try {
        if (!req.user?.id) {
            return next((0, errors_1.createError)(errors_1.ErrorCode.AUTH_UNAUTHORIZED, '認証されていないユーザーです', 401));
        }
        const userInfo = await getPermissionService().getUserInfo(req.user.id);
        if (!userInfo) {
            return next((0, errors_1.createError)(errors_1.ErrorCode.AD_USER_NOT_FOUND, 'ユーザー情報が見つかりません', 404));
        }
        // グローバル管理者かどうかを確認
        const roles = await getAuthService().getUserRoles(userInfo.email);
        if (!roles.isGlobalAdmin) {
            logger.logSecurity({
                userId: req.user.id,
                event: 'global_admin_access',
                severity: 'high',
                details: {
                    path: req.path,
                    method: req.method
                }
            });
            return next((0, errors_1.createError)(errors_1.ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS, 'この機能にはグローバル管理者権限が必要です', 403));
        }
        next();
    }
    catch (error) {
        logger.logError(error, {
            context: 'GlobalAdmin',
            message: 'グローバル管理者チェック中にエラーが発生しました',
            details: {
                path: req.path,
                method: req.method,
                userId: req.user?.id
            }
        });
        next((0, errors_1.createError)(errors_1.ErrorCode.INTERNAL_SERVER_ERROR, '権限の確認中にエラーが発生しました', 500));
    }
};
exports.requireGlobalAdmin = requireGlobalAdmin;
/**
 * ユーザーのMicrosoft権限情報をリクエストに追加するミドルウェア
 * パフォーマンスを考慮して、必要な場合にのみ使用してください
 */
const attachMicrosoftPermissions = async (req, res, next) => {
    try {
        if (!req.user?.id) {
            return next((0, errors_1.createError)(errors_1.ErrorCode.AUTH_UNAUTHORIZED, '認証されていないユーザーです', 401));
        }
        const userInfo = await getPermissionService().getUserInfo(req.user.id);
        if (!userInfo) {
            return next((0, errors_1.createError)(errors_1.ErrorCode.AD_USER_NOT_FOUND, 'ユーザー情報が見つかりません', 404));
        }
        // Microsoft Graph API 権限情報を取得
        const msPermissions = await getAuthService().getMicrosoftPermissions(userInfo.email);
        // リクエストオブジェクトに権限情報を追加
        req.msPermissions = msPermissions;
        next();
    }
    catch (error) {
        logger.logError(error, {
            context: 'MSPermissions',
            message: 'Microsoft権限情報の取得中にエラーが発生しました',
            details: {
                path: req.path,
                method: req.method,
                userId: req.user?.id
            }
        });
        // エラーがあっても処理は続行（権限情報はオプショナル）
        next();
    }
};
exports.attachMicrosoftPermissions = attachMicrosoftPermissions;
//# sourceMappingURL=authorization.js.map