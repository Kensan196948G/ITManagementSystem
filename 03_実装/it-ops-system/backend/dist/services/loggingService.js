"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importStar(require("winston"));
require("winston-daily-rotate-file");
class LoggingService {
    constructor() {
        this.initializeLogger();
    }
    initializeLogger() {
        const logFormat = winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.metadata(), winston_1.format.json());
        this.logger = winston_1.default.createLogger({
            format: logFormat,
            transports: [
                // 通常のログ（INFO以上）
                new winston_1.default.transports.DailyRotateFile({
                    filename: 'logs/app-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    maxSize: '10m',
                    maxFiles: '7d',
                    level: 'info'
                }),
                // エラーログ
                new winston_1.default.transports.DailyRotateFile({
                    filename: 'logs/error-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    maxSize: '10m',
                    maxFiles: '14d',
                    level: 'error'
                }),
                // セキュリティログ
                new winston_1.default.transports.DailyRotateFile({
                    filename: 'logs/security-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    maxSize: '10m',
                    maxFiles: '30d',
                    level: 'warn'
                }),
                // 開発環境用のコンソール出力
                new winston_1.default.transports.Console({
                    format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.simple()),
                    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
                })
            ]
        });
    }
    static getInstance() {
        if (!LoggingService.instance) {
            LoggingService.instance = new LoggingService();
        }
        return LoggingService.instance;
    }
    logAccess(data) {
        this.logger.info('Access Log', {
            type: 'access',
            ...data,
            timestamp: new Date()
        });
    }
    logSecurity(data) {
        this.logger.warn('Security Event', {
            type: 'security',
            ...data,
            timestamp: new Date()
        });
    }
    logError(error, context) {
        this.logger.error('Error', {
            type: 'error',
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context,
            timestamp: new Date()
        });
    }
    logMetric(data) {
        this.logger.info('Metric', {
            type: 'metric',
            ...data,
            timestamp: new Date()
        });
    }
    async queryLogs(
    // 将来の実装のための型定義
    _options) {
        // TODO: 将来的な実装のためのスタブメソッド
        return [];
    }
}
exports.default = LoggingService;
//# sourceMappingURL=loggingService.js.map