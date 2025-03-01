"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const prom_client_1 = require("prom-client");
const loggingService_1 = __importDefault(require("./loggingService"));
const logger = loggingService_1.default.getInstance();
class RedisService {
    constructor() {
        this.hits = 0;
        this.totalRequests = 0;
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
        this.client = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD,
            connectTimeout: 10000,
            commandTimeout: 5000,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                this.retryAttemptsGauge.set(times);
                return delay;
            },
            maxRetriesPerRequest: 5,
            enableReadyCheck: true,
            showFriendlyErrorStack: process.env.NODE_ENV !== 'production'
        });
        this.setupMonitoring();
    }
    setupMonitoring() {
        // Redis connection monitoring
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
        const info = await this.client.info('memory');
        const match = info.match(/used_memory:(\d+)/);
        return {
            connectionStatus: await this.isConnected() ? 1 : 0,
            memoryUsageBytes: match ? parseInt(match[1], 10) : 0,
            cacheHitRatio: await this.getCacheHitRatio(),
            retryAttempts: await this.getRetryAttempts()
        };
    }
}
exports.RedisService = RedisService;
//# sourceMappingURL=redisService.js.map