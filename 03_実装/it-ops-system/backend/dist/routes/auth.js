"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const activedirectory2_1 = __importDefault(require("activedirectory2"));
const dotenv_1 = require("dotenv");
const tokenManager_1 = require("../services/tokenManager");
const security_1 = require("../config/security");
const errors_1 = require("../types/errors");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const permissionService_1 = require("../services/permissionService");
const authService_1 = require("../services/authService");
const loggingService_1 = __importDefault(require("../services/loggingService"));
// 環境変数の読み込み
(0, dotenv_1.config)();
const router = express_1.default.Router();
const logger = loggingService_1.default.getInstance();
const permissionService = permissionService_1.PermissionService.getInstance();
const authService = authService_1.AuthService.getInstance();
// ADの設定
const adConfig = {
    url: process.env.AD_URL,
    baseDN: process.env.AD_BASE_DN,
    username: process.env.AD_USERNAME,
    password: process.env.AD_PASSWORD
};
const ad = new activedirectory2_1.default(adConfig);
// レート制限の適用
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: security_1.securityConfig.rateLimit.windowMs,
    max: security_1.securityConfig.rateLimit.max,
    message: {
        status: 'error',
        message: security_1.securityConfig.rateLimit.message
    }
});
// JWTトークン生成関数
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({
        id: user.id,
        username: user.username,
        roles: user.roles
    }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
};
// AD認証とJWTトークン生成
router.post('/login', loginLimiter, async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            throw (0, errors_1.createError)(errors_1.ErrorCode.MISSING_REQUIRED_FIELD, 'Username and password are required', 400);
        }
        // パスワードポリシーの検証
        if (!(0, security_1.validatePassword)(password)) {
            throw (0, errors_1.createError)(errors_1.ErrorCode.VALIDATION_FAILED, 'Password does not meet security requirements', 400, { requirements: security_1.passwordPolicy });
        }
        // AD認証
        return new Promise((resolve, reject) => {
            ad.authenticate(username, password, async (err, auth) => {
                if (err) {
                    reject((0, errors_1.createError)(errors_1.ErrorCode.AD_CONNECTION_ERROR, 'Authentication failed', 401, { originalError: err }));
                    return;
                }
                if (!auth) {
                    reject((0, errors_1.createError)(errors_1.ErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid credentials', 401));
                    return;
                }
                // ユーザー情報の取得
                ad.findUser(username, async (findErr, user) => {
                    if (findErr) {
                        reject((0, errors_1.createError)(errors_1.ErrorCode.AD_OPERATION_FAILED, 'Error retrieving user information', 500, { originalError: findErr }));
                        return;
                    }
                    if (!user) {
                        reject((0, errors_1.createError)(errors_1.ErrorCode.AD_USER_NOT_FOUND, 'User not found', 404));
                        return;
                    }
                    try {
                        // セッション数の確認
                        const activeSessions = await tokenManager_1.TokenManager.getUserActiveSessions(user.id);
                        if (activeSessions >= security_1.securityConfig.session.maxConcurrentSessions) {
                            reject((0, errors_1.createError)(errors_1.ErrorCode.AUTH_SESSION_LIMIT, 'Maximum number of concurrent sessions reached', 400));
                            return;
                        }
                        // JWTトークンの生成
                        const token = generateToken(user);
                        // セッションの追加
                        await tokenManager_1.TokenManager.addUserSession(user.id);
                        // レスポンス
                        res.json({
                            status: 'success',
                            data: {
                                token,
                                user: {
                                    username: user.sAMAccountName,
                                    displayName: user.displayName,
                                    email: user.mail,
                                    groups: user.memberOf
                                }
                            }
                        });
                        resolve();
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            });
        });
    }
    catch (error) {
        next(error);
    }
});
// トークン検証ミドルウェア
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        next((0, errors_1.createError)(errors_1.ErrorCode.AUTH_TOKEN_MISSING, 'No token provided', 401));
        return;
    }
    try {
        // トークンがブラックリストにあるか確認
        const isBlacklisted = await tokenManager_1.TokenManager.isTokenBlacklisted(token);
        if (isBlacklisted) {
            next((0, errors_1.createError)(errors_1.ErrorCode.AUTH_TOKEN_INVALID, 'Token has been invalidated', 401));
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next((0, errors_1.createError)(errors_1.ErrorCode.AUTH_TOKEN_EXPIRED, 'Token has expired', 401));
        }
        else {
            next((0, errors_1.createError)(errors_1.ErrorCode.AUTH_TOKEN_INVALID, 'Invalid token', 401));
        }
    }
};
exports.verifyToken = verifyToken;
// ユーザー情報取得
router.get('/me', exports.verifyToken, (req, res) => {
    res.json({
        status: 'success',
        data: {
            user: req.user
        }
    });
});
// ログアウト
router.post('/logout', exports.verifyToken, async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token && req.user) {
            // トークンをブラックリストに追加
            await tokenManager_1.TokenManager.blacklistToken({
                token,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間
                userId: req.user.id,
                reason: 'logout'
            });
            // セッション数を減らす
            await tokenManager_1.TokenManager.removeUserSession(req.user.id);
        }
        res.json({
            status: 'success',
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error during logout'
        });
    }
});
// パスワードリセット（強制ログアウト）
router.post('/force-logout', exports.verifyToken, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'User ID is required'
            });
        }
        // ユーザーの全セッションを無効化
        await tokenManager_1.TokenManager.invalidateAllUserSessions(userId);
        res.json({
            status: 'success',
            message: 'All sessions have been terminated'
        });
    }
    catch (error) {
        console.error('Force logout error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error during force logout'
        });
    }
});
router.post('/check-permission', async (req, res) => {
    try {
        const { userEmail, check } = req.body;
        const hasPermission = await permissionService.checkPermission(userEmail, check);
        res.json({ hasPermission });
    }
    catch (error) {
        logger.logError(error, {
            context: 'PermissionAPI',
            message: '権限チェックエラー'
        });
        res.status(500).json({ error: '権限チェック中にエラーが発生しました' });
    }
});
router.get('/user-roles/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const roles = await authService.getUserRoles(email);
        res.json(roles);
    }
    catch (error) {
        logger.logError(error, {
            context: 'PermissionAPI',
            message: 'ユーザーロール取得エラー'
        });
        res.status(500).json({ error: 'ユーザーロールの取得中にエラーが発生しました' });
    }
});
router.post('/validate-access', async (req, res) => {
    try {
        const { userEmail, permission } = req.body;
        const hasAccess = await authService.validateAccess(userEmail, permission);
        res.json({ hasAccess });
    }
    catch (error) {
        logger.logError(error, {
            context: 'PermissionAPI',
            message: 'アクセス検証エラー'
        });
        res.status(500).json({ error: 'アクセス検証中にエラーが発生しました' });
    }
});
// エラーハンドリングの適用
const errorHandling_1 = require("../middleware/errorHandling");
router.use(errorHandling_1.errorLogger);
router.use(errorHandling_1.errorHandler);
exports.default = router;
//# sourceMappingURL=auth.js.map