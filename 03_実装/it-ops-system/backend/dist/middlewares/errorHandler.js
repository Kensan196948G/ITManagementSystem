"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const AuditError_1 = require("../errors/AuditError");
const loggingService_1 = __importDefault(require("../services/loggingService"));
const logger = loggingService_1.default.getInstance();
const errorHandler = (error, req, res, next) => {
    // AuditError系の場合は、対応するステータスコードとエラーメッセージを返す
    if (error instanceof AuditError_1.AuditError) {
        logger.logError(error, {
            context: 'ErrorHandler',
            code: error.code,
            details: error.details
        });
        return res.status(error.statusCode).json({
            error: error.message,
            code: error.code,
            details: error.details
        });
    }
    // 予期せぬエラーの場合
    logger.logError(error, {
        context: 'ErrorHandler',
        path: req.path,
        method: req.method
    });
    return res.status(500).json({
        error: '予期せぬエラーが発生しました',
        code: 'INTERNAL_SERVER_ERROR'
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map