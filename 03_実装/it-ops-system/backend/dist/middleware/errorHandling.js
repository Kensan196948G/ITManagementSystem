"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.errorLogger = exports.requestLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const errors_1 = require("../types/errors");
// Winstonロガーの設定
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.File({
            filename: process.env.LOG_FILE_PATH || 'logs/error.log',
            level: 'error',
            maxsize: parseInt(process.env.LOG_MAX_SIZE || '10485760'), // 10MB
            maxFiles: parseInt(process.env.LOG_MAX_FILES || '7')
        }),
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ]
});
// リクエストログミドルウェア
const requestLogger = (req, res, next) => {
    const start = Date.now();
    // レスポンス送信後のログ記録
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            type: 'request',
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            userId: req.user?.id
        });
    });
    next();
};
exports.requestLogger = requestLogger;
// エラーログミドルウェア
const errorLogger = (err, req, res, next) => {
    const error = err instanceof errors_1.ApplicationError ? err : new errors_1.ApplicationError(errors_1.ErrorCode.UNEXPECTED_ERROR, err.message, 500, { originalError: err });
    logger.error({
        type: 'error',
        code: error.code,
        message: error.message,
        stack: error.stack,
        details: error.details,
        path: req.path,
        method: req.method,
        userId: req.user?.id
    });
    next(error);
};
exports.errorLogger = errorLogger;
// エラーハンドラーミドルウェア
const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    const error = err instanceof errors_1.ApplicationError ? err : new errors_1.ApplicationError(errors_1.ErrorCode.UNEXPECTED_ERROR, err.message);
    // 本番環境ではスタックトレースを含めない
    const response = {
        ...error.toJSON(),
        ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
    };
    res.status(error.statusCode).json(response);
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandling.js.map