"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
const tokenUtils_1 = require("@/utils/tokenUtils");
const permissionService_1 = require("@/services/permissionService");
const errors_1 = require("@/types/errors");
const loggingService_1 = __importDefault(require("@/services/loggingService"));
const logger = loggingService_1.default.getInstance();
const permissionService = permissionService_1.PermissionService.getInstance();
async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw (0, errors_1.createError)(errors_1.ErrorCode.AUTH_TOKEN_MISSING, 'トークンが見つかりません', 401);
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            throw (0, errors_1.createError)(errors_1.ErrorCode.AUTH_TOKEN_MISSING, 'トークンが見つかりません', 401);
        }
        let decoded;
        try {
            decoded = (0, tokenUtils_1.validateToken)(token);
        }
        catch (tokenError) {
            throw (0, errors_1.createError)(errors_1.ErrorCode.AUTH_TOKEN_INVALID, '無効なトークンです', 401);
        }
        if (!decoded.valid || !decoded.userId) {
            throw (0, errors_1.createError)(errors_1.ErrorCode.AUTH_TOKEN_INVALID, '無効なトークンです', 401);
        }
        // トークンからユーザー情報を取得
        const userInfo = await permissionService.getUserInfo(decoded.userId);
        if (!userInfo) {
            throw (0, errors_1.createError)(errors_1.ErrorCode.AD_USER_NOT_FOUND, 'ユーザーが見つかりません', 401);
        }
        // ユーザー情報をリクエストに設定
        req.user = {
            id: decoded.userId,
            email: userInfo.email,
            username: userInfo.username,
            roles: userInfo.roles
        };
        // 必要なグループのバリデーション
        const isValid = await permissionService.validateRequiredGroups(userInfo.email);
        if (!isValid) {
            throw (0, errors_1.createError)(errors_1.ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS, '必要な権限がありません', 403);
        }
        next();
    }
    catch (error) {
        const statusCode = error.statusCode || 401;
        logger.logError(error, {
            context: 'Auth',
            message: '認証エラー'
        });
        res.status(statusCode).json({
            status: 'error',
            message: error.message
        });
    }
}
//# sourceMappingURL=session.js.map