"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const loggingService_1 = require("../loggingService");
const winston_1 = __importDefault(require("winston"));
jest.mock('winston', () => ({
    createLogger: jest.fn(),
    format: {
        combine: jest.fn(),
        timestamp: jest.fn(),
        json: jest.fn(),
        printf: jest.fn()
    },
    transports: {
        Console: jest.fn(),
        File: jest.fn()
    }
}));
describe('LoggingService', () => {
    let loggingService;
    let mockLogger;
    beforeEach(() => {
        mockLogger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn()
        };
        winston_1.default.createLogger.mockReturnValue(mockLogger);
        loggingService = loggingService_1.LoggingService.getInstance();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('getInstance', () => {
        it('シングルトンインスタンスを返すこと', () => {
            const instance1 = loggingService_1.LoggingService.getInstance();
            const instance2 = loggingService_1.LoggingService.getInstance();
            expect(instance1).toBe(instance2);
        });
    });
    describe('logError', () => {
        it('エラーオブジェクトをログ出力できること', () => {
            const error = new Error('Test error');
            const context = { userId: 'user123', action: 'test' };
            loggingService.logError(error, context);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Test error',
                stack: error.stack,
                context
            }));
        });
        it('エラーメッセージを文字列で受け取れること', () => {
            loggingService.logError('Something went wrong', { service: 'test' });
            expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Something went wrong',
                context: { service: 'test' }
            }));
        });
        it('コンテキストなしでログ出力できること', () => {
            const error = new Error('Test error');
            loggingService.logError(error);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Test error',
                stack: error.stack
            }));
        });
    });
    describe('logWarn', () => {
        it('警告メッセージをログ出力できること', () => {
            const context = { operation: 'test', status: 'warning' };
            loggingService.logWarn('Warning message', context);
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Warning message',
                context
            }));
        });
        it('コンテキストなしで警告を出力できること', () => {
            loggingService.logWarn('Simple warning');
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Simple warning'
            }));
        });
    });
    describe('logInfo', () => {
        it('情報メッセージをログ出力できること', () => {
            const context = { event: 'test', result: 'success' };
            loggingService.logInfo('Info message', context);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Info message',
                context
            }));
        });
        it('オブジェクトを直接ログ出力できること', () => {
            const logData = {
                message: 'Test completed',
                duration: 100,
                status: 'ok'
            };
            loggingService.logInfo(logData);
            expect(mockLogger.info).toHaveBeenCalledWith(logData);
        });
    });
    describe('logDebug', () => {
        it('デバッグメッセージをログ出力できること', () => {
            const context = { debug: true, data: 'test' };
            loggingService.logDebug('Debug message', context);
            expect(mockLogger.debug).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Debug message',
                context
            }));
        });
        it('開発環境でのみデバッグログを出力すること', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            loggingService.logDebug('Debug in production');
            expect(mockLogger.debug).not.toHaveBeenCalled();
            process.env.NODE_ENV = 'development';
            loggingService.logDebug('Debug in development');
            expect(mockLogger.debug).toHaveBeenCalled();
            process.env.NODE_ENV = originalEnv;
        });
    });
    describe('getLogStream', () => {
        it('ログストリームを取得できること', () => {
            const stream = loggingService.getLogStream('test');
            expect(stream).toBeDefined();
            expect(stream.write).toBeDefined();
        });
        it('ストリームに書き込んだデータがログ出力されること', () => {
            const stream = loggingService.getLogStream('test');
            stream.write('Test log entry\n');
            expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Test log entry',
                source: 'test'
            }));
        });
    });
});
//# sourceMappingURL=loggingService.test.js.map