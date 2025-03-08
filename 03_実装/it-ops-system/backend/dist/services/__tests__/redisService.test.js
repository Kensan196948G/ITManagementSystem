"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redisService_1 = require("../redisService");
const ioredis_1 = __importDefault(require("ioredis"));
const loggingService_1 = require("../loggingService");
jest.mock('ioredis');
jest.mock('../loggingService');
describe('RedisService', () => {
    let redisService;
    let mockRedisClient;
    let mockLoggingService;
    beforeEach(() => {
        mockRedisClient = {
            set: jest.fn().mockResolvedValue('OK'),
            get: jest.fn().mockResolvedValue('test-value'),
            del: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(1),
            quit: jest.fn().mockResolvedValue('OK'),
            status: 'ready'
        };
        ioredis_1.default.mockImplementation(() => mockRedisClient);
        mockLoggingService = {
            logError: jest.fn(),
            logInfo: jest.fn(),
            getInstance: jest.fn().mockReturnThis()
        };
        loggingService_1.LoggingService.getInstance = jest.fn().mockReturnValue(mockLoggingService);
        redisService = redisService_1.RedisService.getInstance();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('getInstance', () => {
        it('シングルトンインスタンスを返すこと', () => {
            const instance1 = redisService_1.RedisService.getInstance();
            const instance2 = redisService_1.RedisService.getInstance();
            expect(instance1).toBe(instance2);
        });
    });
    describe('set', () => {
        it('キーと値を保存できること', async () => {
            await expect(redisService.set('test-key', 'test-value')).resolves.toBe(true);
            expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', 'test-value');
        });
        it('TTLを指定して保存できること', async () => {
            await expect(redisService.set('test-key', 'test-value', 3600)).resolves.toBe(true);
            expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', 'test-value');
            expect(mockRedisClient.expire).toHaveBeenCalledWith('test-key', 3600);
        });
        it('エラーを適切に処理すること', async () => {
            mockRedisClient.set.mockRejectedValueOnce(new Error('Redis error'));
            await expect(redisService.set('test-key', 'test-value')).resolves.toBe(false);
            expect(mockLoggingService.logError).toHaveBeenCalled();
        });
    });
    describe('get', () => {
        it('保存された値を取得できること', async () => {
            const value = await redisService.get('test-key');
            expect(value).toBe('test-value');
            expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
        });
        it('存在しないキーの場合nullを返すこと', async () => {
            mockRedisClient.get.mockResolvedValueOnce(null);
            const value = await redisService.get('non-existent-key');
            expect(value).toBeNull();
        });
        it('エラーを適切に処理すること', async () => {
            mockRedisClient.get.mockRejectedValueOnce(new Error('Redis error'));
            const value = await redisService.get('test-key');
            expect(value).toBeNull();
            expect(mockLoggingService.logError).toHaveBeenCalled();
        });
    });
    describe('delete', () => {
        it('キーを削除できること', async () => {
            await expect(redisService.delete('test-key')).resolves.toBe(true);
            expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
        });
        it('存在しないキーの削除を処理できること', async () => {
            mockRedisClient.del.mockResolvedValueOnce(0);
            await expect(redisService.delete('non-existent-key')).resolves.toBe(true);
        });
        it('エラーを適切に処理すること', async () => {
            mockRedisClient.del.mockRejectedValueOnce(new Error('Redis error'));
            await expect(redisService.delete('test-key')).resolves.toBe(false);
            expect(mockLoggingService.logError).toHaveBeenCalled();
        });
    });
    describe('healthCheck', () => {
        it('Redisサーバーが正常な場合trueを返すこと', async () => {
            const isHealthy = await redisService.healthCheck();
            expect(isHealthy).toBe(true);
        });
        it('Redisサーバーが異常な場合falseを返すこと', () => {
            mockRedisClient.status = 'end';
            const isHealthy = redisService.healthCheck();
            expect(isHealthy).resolves.toBe(false);
        });
    });
    describe('shutdown', () => {
        it('Redisクライアントを正常にシャットダウンできること', async () => {
            await expect(redisService.shutdown()).resolves.not.toThrow();
            expect(mockRedisClient.quit).toHaveBeenCalled();
        });
        it('シャットダウン時のエラーを処理できること', async () => {
            mockRedisClient.quit.mockRejectedValueOnce(new Error('Shutdown error'));
            await expect(redisService.shutdown()).resolves.not.toThrow();
            expect(mockLoggingService.logError).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=redisService.test.js.map