"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("../types/errors");
const tokenManager_1 = require("../services/tokenManager");
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        next((0, errors_1.createError)(errors_1.ErrorCode.AUTH_TOKEN_MISSING, 'No token provided', 401));
        return;
    }
    try {
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
//# sourceMappingURL=auth.js.map