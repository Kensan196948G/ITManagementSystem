"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors_1 = require("../types/errors");
const loggingService_1 = __importDefault(require("../services/loggingService"));
const logger = loggingService_1.default.getInstance();
const errorHandler = (error, req, res, next) => {
    logger.logError(error, {
        context: 'ErrorHandler',
        path: req.path,
        method: req.method
    });
    if (error instanceof errors_1.PermissionError) {
        return res.status(403).json({
            error: 'PermissionError',
            message: error.message,
            code: error.code
        });
    }
    if (error instanceof errors_1.AuthenticationError) {
        return res.status(401).json({
            error: 'AuthenticationError',
            message: error.message,
            code: error.code
        });
    }
    // Microsoft Graph APIのエラーハンドリング
    if (error.message.includes('Graph API')) {
        return res.status(502).json({
            error: 'ExternalServiceError',
            message: 'Microsoft Graph APIとの通信中にエラーが発生しました',
            code: 'GRAPH_API_ERROR'
        });
    }
    // 一般的なエラー
    return res.status(500).json({
        error: 'InternalServerError',
        message: '内部サーバーエラーが発生しました',
        code: 'INTERNAL_SERVER_ERROR'
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map