"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoubleAuthorization = void 0;
const authService_1 = require("../services/authService");
const loggingService_1 = __importDefault(require("../services/loggingService"));
const logger = loggingService_1.default.getInstance();
const authService = authService_1.AuthService.getInstance();
/**
 * 二重権限チェックミドルウェア
 * フロントエンドとバックエンドの両方で権限チェックを行う
 */
class DoubleAuthorization {
    /**
     * グローバル管理者権限を要求
     * フロントエンドでのチェックに加えて、バックエンドでも再検証
     */
    static requireGlobalAdmin(req, res, next) {
        try {
            // トークンが検証済みであることを確認
            if (!req.user || !req.user.email) {
                return res.status(401).json({
                    status: 'error',
                    message: '認証が必要です',
                    code: 'UNAUTHORIZED'
                });
            }
            // グローバル管理者権限を確認
            authService.isGlobalAdmin(req.user.email)
                .then(isAdmin => {
                if (!isAdmin) {
                    logger.logSecurity({
                        context: 'Authorization',
                        message: 'グローバル管理者権限が必要な操作へのアクセス拒否',
                        userEmail: req.user?.email,
                        path: req.path,
                        method: req.method,
                        ip: req.ip
                    });
                    return res.status(403).json({
                        status: 'error',
                        message: 'この操作にはグローバル管理者権限が必要です',
                        code: 'FORBIDDEN'
                    });
                }
                // 権限チェック通過
                logger.logSecurity({
                    context: 'Authorization',
                    message: 'グローバル管理者権限チェック通過',
                    userEmail: req.user?.email,
                    path: req.path,
                    method: req.method,
                    ip: req.ip
                });
                next();
            })
                .catch(error => {
                logger.logError(error, {
                    context: 'Authorization',
                    message: 'グローバル管理者権限チェック中にエラーが発生',
                    userEmail: req.user?.email,
                    path: req.path,
                    method: req.method
                });
                res.status(500).json({
                    status: 'error',
                    message: '権限チェック中にエラーが発生しました',
                    code: 'INTERNAL_ERROR'
                });
            });
        }
        catch (error) {
            logger.logError(error, {
                context: 'Authorization',
                message: 'グローバル管理者権限チェック中に例外が発生',
                path: req.path,
                method: req.method
            });
            res.status(500).json({
                status: 'error',
                message: '権限チェック中にエラーが発生しました',
                code: 'INTERNAL_ERROR'
            });
        }
    }
    /**
     * リソースに対する特定の権限を要求
     * @param resource リソース名
     * @param action アクション名
     */
    static requirePermission(resource, action) {
        return async (req, res, next) => {
            try {
                // トークンが検証済みであることを確認
                if (!req.user || !req.user.email) {
                    return res.status(401).json({
                        status: 'error',
                        message: '認証が必要です',
                        code: 'UNAUTHORIZED'
                    });
                }
                // 権限チェック
                const hasPermission = await authService.checkPermission({
                    userEmail: req.user.email,
                    resource,
                    action
                });
                if (!hasPermission) {
                    logger.logSecurity({
                        context: 'Authorization',
                        message: '権限が必要な操作へのアクセス拒否',
                        userEmail: req.user?.email,
                        resource,
                        action,
                        path: req.path,
                        method: req.method,
                        ip: req.ip
                    });
                    return res.status(403).json({
                        status: 'error',
                        message: `この操作には ${resource}:${action} 権限が必要です`,
                        code: 'FORBIDDEN'
                    });
                }
                // 権限チェック通過
                logger.logSecurity({
                    context: 'Authorization',
                    message: '権限チェック通過',
                    userEmail: req.user?.email,
                    resource,
                    action,
                    path: req.path,
                    method: req.method,
                    ip: req.ip
                });
                next();
            }
            catch (error) {
                logger.logError(error, {
                    context: 'Authorization',
                    message: '権限チェック中にエラーが発生',
                    userEmail: req.user?.email,
                    resource,
                    action,
                    path: req.path,
                    method: req.method
                });
                res.status(500).json({
                    status: 'error',
                    message: '権限チェック中にエラーが発生しました',
                    code: 'INTERNAL_ERROR'
                });
            }
        };
    }
    /**
     * 自分自身のリソースへのアクセスか、グローバル管理者であることを要求
     * @param userIdParam リクエストパラメータ内のユーザーID名
     */
    static requireSelfOrAdmin(userIdParam = 'userEmail') {
        return async (req, res, next) => {
            try {
                // トークンが検証済みであることを確認
                if (!req.user || !req.user.email) {
                    return res.status(401).json({
                        status: 'error',
                        message: '認証が必要です',
                        code: 'UNAUTHORIZED'
                    });
                }
                const requestedUserId = req.params[userIdParam];
                const currentUserEmail = req.user.email;
                // 自分自身のリソースへのアクセスかチェック
                if (requestedUserId && requestedUserId.toLowerCase() === currentUserEmail.toLowerCase()) {
                    return next();
                }
                // グローバル管理者権限をチェック
                const isAdmin = await authService.isGlobalAdmin(currentUserEmail);
                if (isAdmin) {
                    return next();
                }
                // どちらの条件も満たさない場合はアクセス拒否
                logger.logSecurity({
                    context: 'Authorization',
                    message: '他のユーザーリソースへのアクセス拒否',
                    userEmail: currentUserEmail,
                    requestedUserId,
                    path: req.path,
                    method: req.method,
                    ip: req.ip
                });
                res.status(403).json({
                    status: 'error',
                    message: '自分自身のリソースか、グローバル管理者権限が必要です',
                    code: 'FORBIDDEN'
                });
            }
            catch (error) {
                logger.logError(error, {
                    context: 'Authorization',
                    message: '権限チェック中にエラーが発生',
                    userEmail: req.user?.email,
                    path: req.path,
                    method: req.method
                });
                res.status(500).json({
                    status: 'error',
                    message: '権限チェック中にエラーが発生しました',
                    code: 'INTERNAL_ERROR'
                });
            }
        };
    }
    /**
     * クライアントIPアドレスの制限
     * @param allowedIps 許可されたIPアドレスの配列
     */
    static restrictIpAccess(allowedIps) {
        return (req, res, next) => {
            const clientIp = req.ip;
            if (!allowedIps.includes(clientIp)) {
                logger.logSecurity({
                    context: 'Authorization',
                    message: '許可されていないIPアドレスからのアクセス拒否',
                    ip: clientIp,
                    path: req.path,
                    method: req.method
                });
                return res.status(403).json({
                    status: 'error',
                    message: 'このIPアドレスからのアクセスは許可されていません',
                    code: 'IP_RESTRICTED'
                });
            }
            next();
        };
    }
    /**
     * リクエスト元の検証（Referer, Origin）
     * @param allowedOrigins 許可されたオリジンの配列
     */
    static validateOrigin(allowedOrigins) {
        return (req, res, next) => {
            const origin = req.headers.origin;
            const referer = req.headers.referer;
            // オリジンまたはリファラーが存在し、許可リストに含まれているか確認
            const isValidOrigin = origin && allowedOrigins.some(allowed => origin.startsWith(allowed));
            const isValidReferer = referer && allowedOrigins.some(allowed => referer.startsWith(allowed));
            if (!isValidOrigin && !isValidReferer) {
                logger.logSecurity({
                    context: 'Authorization',
                    message: '許可されていないオリジンからのアクセス拒否',
                    origin,
                    referer,
                    path: req.path,
                    method: req.method,
                    ip: req.ip
                });
                return res.status(403).json({
                    status: 'error',
                    message: 'このオリジンからのアクセスは許可されていません',
                    code: 'ORIGIN_RESTRICTED'
                });
            }
            next();
        };
    }
}
exports.DoubleAuthorization = DoubleAuthorization;
exports.default = DoubleAuthorization;
//# sourceMappingURL=doubleAuthorization.js.map