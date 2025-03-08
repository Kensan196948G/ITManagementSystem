"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const events_1 = require("events");
const prom_client_1 = require("prom-client");
const loggingService_1 = __importDefault(require("./loggingService"));
// Redis Mock実装
class RedisMock extends events_1.EventEmitter {
    constructor() {
        super();
        this.mockData = new Map();
        this.status = 'ready';
        setTimeout(() => {
            this.emit('connect');
            this.emit('ready');
        }, 0);
    }
    async ping() {
        return 'PONG';
    }
    async quit() {
        this.status = 'end';
        this.emit('end');
        return 'OK';
    }
    async info(section) {
        if (section === 'memory') {
            return 'used_memory:1024\nused_memory_human:1M\n';
        }
        return '';
    }
    async set(key, value, ...args) {
        let expiry = undefined;
        if (args.length >= 2 && args[0] === 'EX') {
            expiry = Date.now() + args[1] * 1000;
        }
        this.mockData.set(key, { value, expiry });
        return 'OK';
    }
    async get(key) {
        const data = this.mockData.get(key);
        if (!data)
            return null;
        if (data.expiry && data.expiry < Date.now()) {
            this.mockData.delete(key);
            return null;
        }
        return data.value;
    }
    async del(key) {
        const keys = Array.isArray(key) ? key : [key];
        let count = 0;
        for (const k of keys) {
            if (this.mockData.has(k)) {
                this.mockData.delete(k);
                count++;
            }
        }
        return count;
    }
}
const logger = loggingService_1.default.getInstance();
class RedisService {
    constructor() {
        this.hits = 0;
        this.totalRequests = 0;
        this.isUsingMock = false;
        this.mockData = new Map();
        // メトリクス用Gaugeを初期化
        this.connectionStatusGauge = new prom_client_1.Gauge({
            name: 'redis_connection_status',
            help: 'Redis connection status (1 = connected, 0 = disconnected)'
        });
        this.memoryUsageGauge = new prom_client_1.Gauge({
            name: 'redis_memory_usage_bytes',
            help: 'Redis memory usage in bytes'
        });
        this.retryAttemptsGauge = new prom_client_1.Gauge({
            name: 'redis_retry_attempts',
            help: 'Number of Redis connection retry attempts'
        });
        this.cacheHitRatioGauge = new prom_client_1.Gauge({
            name: 'redis_cache_hit_ratio',
            help: 'Redis cache hit ratio'
        });
        // 常にRedisのモック実装を使用する
        this.setupMockRedis();
        logger.logInfo('Using Redis mock implementation');
    }
    // モックRedisクライアントのセットアップ
    setupMockRedis() {
        this.isUsingMock = true;
        // イベントエミッタを利用したモッククライアント
        const mockClient = new events_1.EventEmitter();
        // 基本的なメソッドをモック
        mockClient.status = 'ready';
        mockClient.ping = async () => 'PONG';
        mockClient.quit = async () => {
            mockClient.status = 'end';
            mockClient.emit('end');
            return 'OK';
        };
        // info メソッドの型を修正
        mockClient.info = async (...args) => {
            // 引数が1つで文字列の場合はセクション指定
            if (args.length === 1 && typeof args[0] === 'string') {
                const section = args[0];
                if (section === 'memory') {
                    return 'used_memory:1024\nused_memory_human:1M\n';
                }
                return '';
            }
            // コールバックがある場合
            if (args.length > 0 && typeof args[args.length - 1] === 'function') {
                const callback = args[args.length - 1];
                callback(null, 'used_memory:1024\nused_memory_human:1M\n');
            }
            return '';
        };
        mockClient.set = async (key, value, ...args) => {
            let expiry = undefined;
            if (args.length >= 2 && args[0] === 'EX') {
                expiry = Date.now() + args[1] * 1000;
            }
            this.mockData.set(key, { value, expiry });
            return 'OK';
        };
        mockClient.get = async (key) => {
            const data = this.mockData.get(key);
            if (!data)
                return null;
            if (data.expiry && data.expiry < Date.now()) {
                this.mockData.delete(key);
                return null;
            }
            return data.value;
        };
        // del メソッドの型を修正
        mockClient.del = async (...args) => {
            let keys = [];
            // 引数が1つの配列の場合
            if (args.length === 1 && Array.isArray(args[0])) {
                keys = args[0];
            }
            // 引数が複数の場合
            else {
                // 最後の引数がコールバックの場合は除外
                const lastArg = args[args.length - 1];
                const hasCallback = typeof lastArg === 'function';
                keys = hasCallback
                    ? args.slice(0, args.length - 1)
                    : args;
            }
            let count = 0;
            for (const k of keys) {
                if (this.mockData.has(k)) {
                    this.mockData.delete(k);
                    count++;
                }
            }
            return count;
        };
        this.client = mockClient;
        // 接続が成功したとみなしてイベントをエミット
        setTimeout(() => {
            this.client.emit('connect');
            this.client.emit('ready');
            this.connectionStatusGauge.set(1);
        }, 100);
    }
    setupMonitoring() {
        // Redis接続監視
        this.client.on('connect', () => {
            this.connectionStatusGauge.set(1);
            logger.logAccess({
                userId: 'system',
                action: 'redis_connect',
                resource: 'redis',
                ip: '',
                userAgent: '',
                result: 'success'
            });
            this.updateMemoryMetrics();
        });
        this.client.on('error', (error) => {
            this.connectionStatusGauge.set(0);
            logger.logError(error, {
                context: 'RedisService',
                message: 'Redis connection error'
            });
        });
        this.client.on('end', () => {
            this.connectionStatusGauge.set(0);
            logger.logSecurity({
                userId: 'system',
                event: 'redis_disconnect',
                severity: 'medium',
                details: { message: 'Redis connection closed' }
            });
        });
    }
    static getInstance() {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }
    getClient() {
        return this.client;
    }
    // shutdown メソッドを追加（disconnect メソッドのエイリアス）
    async shutdown() {
        return this.disconnect();
    }
    isUsingMockImplementation() {
        return this.isUsingMock;
    }
    async healthCheck() {
        try {
            const pong = await this.client.ping();
            const isHealthy = pong === 'PONG';
            this.connectionStatusGauge.set(isHealthy ? 1 : 0);
            return isHealthy;
        }
        catch (error) {
            this.connectionStatusGauge.set(0);
            logger.logError(error, {
                context: 'RedisService',
                message: 'Redis health check failed'
            });
            return false;
        }
    }
    async disconnect() {
        try {
            await this.client.quit();
            this.connectionStatusGauge.set(0);
            logger.logAccess({
                userId: 'system',
                action: 'redis_disconnect',
                resource: 'redis',
                ip: '',
                userAgent: '',
                result: 'success'
            });
        }
        catch (error) {
            logger.logError(error, {
                context: 'RedisService',
                message: 'Error disconnecting from Redis'
            });
        }
    }
    updateCacheMetrics(hit) {
        this.totalRequests++;
        if (hit)
            this.hits++;
        const ratio = this.totalRequests === 0 ? 0 : (this.hits / this.totalRequests) * 100;
        this.cacheHitRatioGauge.set(ratio);
    }
    async updateMemoryMetrics() {
        try {
            const info = await this.client.info('memory');
            const match = info.match(/used_memory:(\d+)/);
            if (match) {
                this.memoryUsageGauge.set(parseInt(match[1], 10));
            }
        }
        catch (error) {
            logger.logError(error, {
                context: 'RedisService',
                message: 'Error updating memory metrics'
            });
        }
    }
    async set(key, value, expirationSeconds) {
        try {
            if (expirationSeconds) {
                await this.client.set(key, value, 'EX', expirationSeconds);
            }
            else {
                await this.client.set(key, value);
            }
            this.updateCacheMetrics(true);
            return true;
        }
        catch (error) {
            this.updateCacheMetrics(false);
            logger.logError(error, {
                context: 'RedisService',
                message: 'Error setting Redis key',
                details: { key }
            });
            return false;
        }
    }
    async get(key) {
        try {
            const value = await this.client.get(key);
            this.updateCacheMetrics(value !== null);
            return value;
        }
        catch (error) {
            this.updateCacheMetrics(false);
            logger.logError(error, {
                context: 'RedisService',
                message: 'Error getting Redis key',
                details: { key }
            });
            return null;
        }
    }
    async del(key) {
        try {
            const result = await this.client.del(key);
            return result > 0;
        }
        catch (error) {
            logger.logError(error, {
                context: 'RedisService',
                message: 'Error deleting Redis key',
                details: { key }
            });
            return false;
        }
    }
    // delete メソッドを追加（del メソッドのエイリアス）
    async delete(key) {
        return this.del(key);
    }
    // deletePattern メソッドを追加（パターンマッチングによる削除）
    async deletePattern(pattern) {
        try {
            // モック実装ではパターンマッチングをシミュレート
            if (this.isUsingMock) {
                const keysToDelete = [];
                // パターンを正規表現に変換（* をワイルドカードとして扱う）
                const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                // マッチするキーを検索
                for (const key of this.mockData.keys()) {
                    if (regexPattern.test(key)) {
                        keysToDelete.push(key);
                    }
                }
                // マッチしたキーを削除
                for (const key of keysToDelete) {
                    this.mockData.delete(key);
                }
                return keysToDelete.length > 0;
            }
            else {
                // 実際の Redis では SCAN コマンドを使用してパターンマッチングを行う
                // ここでは簡易的な実装
                const result = await this.client.del(pattern);
                return result > 0;
            }
        }
        catch (error) {
            logger.logError(error, {
                context: 'RedisService',
                message: 'Error deleting Redis keys by pattern',
                details: { pattern }
            });
            return false;
        }
    }
    async isConnected() {
        return this.client.status === 'ready';
    }
    async getCacheHitRatio() {
        return this.totalRequests === 0 ? 0 : (this.hits / this.totalRequests) * 100;
    }
    async getRetryAttempts() {
        const retryAttempts = await this.retryAttemptsGauge.get();
        return retryAttempts.values[0]?.value ?? 0;
    }
    async getMetrics() {
        let memoryUsageBytes = 0;
        try {
            const info = await this.client.info('memory');
            const match = info.match(/used_memory:(\d+)/);
            if (match) {
                memoryUsageBytes = parseInt(match[1], 10);
            }
        }
        catch (error) {
            logger.logError(error, {
                context: 'RedisService',
                message: 'Error getting memory metrics'
            });
        }
        return {
            connectionStatus: (await this.isConnected()) ? 1 : 0,
            memoryUsageBytes,
            cacheHitRatio: await this.getCacheHitRatio(),
            retryAttempts: await this.getRetryAttempts()
        };
    }
}
exports.RedisService = RedisService;
//# sourceMappingURL=redisService.js.map