import Redis from 'ioredis';
import { Gauge } from 'prom-client';
import LoggingService from './loggingService';

declare module 'ioredis' {
  type RedisStatus = 'wait' | 'reconnecting' | 'connecting' | 'connect' | 'ready' | 'close' | 'end';
  
  interface Redis {
    status: RedisStatus;
    ping(): Promise<string>;
    quit(): Promise<'OK'>;
    info(section: string): Promise<string>;
  }
}

const logger = LoggingService.getInstance();

export class RedisService {
  private static instance: RedisService;
  private client: Redis;
  private connectionStatusGauge: Gauge;
  private memoryUsageGauge: Gauge;
  private retryAttemptsGauge: Gauge;
  private hits: number = 0;
  private totalRequests: number = 0;
  private cacheHitRatioGauge: Gauge;

  private constructor() {
    this.connectionStatusGauge = new Gauge({
      name: 'redis_connection_status',
      help: 'Redis connection status (1 = connected, 0 = disconnected)'
    });

    this.memoryUsageGauge = new Gauge({
      name: 'redis_memory_usage_bytes',
      help: 'Redis memory usage in bytes'
    });

    this.retryAttemptsGauge = new Gauge({
      name: 'redis_retry_attempts',
      help: 'Number of Redis connection retry attempts'
    });

    this.cacheHitRatioGauge = new Gauge({
      name: 'redis_cache_hit_ratio',
      help: 'Redis cache hit ratio'
    });

    this.client = new Redis({
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

  private setupMonitoring(): void {
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
      logger.logError(error as Error, {
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

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public getClient(): Redis {
    return this.client;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      const isHealthy = pong === 'PONG';
      this.connectionStatusGauge.set(isHealthy ? 1 : 0);
      return isHealthy;
    } catch (error) {
      this.connectionStatusGauge.set(0);
      logger.logError(error as Error, {
        context: 'RedisService',
        message: 'Redis health check failed'
      });
      return false;
    }
  }

  public async disconnect(): Promise<void> {
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
    } catch (error) {
      logger.logError(error as Error, {
        context: 'RedisService',
        message: 'Error disconnecting from Redis'
      });
    }
  }

  public updateCacheMetrics(hit: boolean): void {
    this.totalRequests++;
    if (hit) this.hits++;
    const ratio = this.totalRequests === 0 ? 0 : (this.hits / this.totalRequests) * 100;
    this.cacheHitRatioGauge.set(ratio);
  }

  private async updateMemoryMetrics(): Promise<void> {
    try {
      const info = await this.client.info('memory');
      const match = info.match(/used_memory:(\d+)/);
      if (match) {
        this.memoryUsageGauge.set(parseInt(match[1], 10));
      }
    } catch (error) {
      logger.logError(error as Error, {
        context: 'RedisService',
        message: 'Error updating memory metrics'
      });
    }
  }

  public async set(key: string, value: string, expirationSeconds?: number): Promise<boolean> {
    try {
      if (expirationSeconds) {
        await this.client.set(key, value, 'EX', expirationSeconds);
      } else {
        await this.client.set(key, value);
      }
      this.updateCacheMetrics(true);
      return true;
    } catch (error) {
      this.updateCacheMetrics(false);
      logger.logError(error as Error, {
        context: 'RedisService',
        message: 'Error setting Redis key',
        details: { key }
      });
      return false;
    }
  }

  public async get(key: string): Promise<string | null> {
    try {
      const value = await this.client.get(key);
      this.updateCacheMetrics(value !== null);
      return value;
    } catch (error) {
      this.updateCacheMetrics(false);
      logger.logError(error as Error, {
        context: 'RedisService',
        message: 'Error getting Redis key',
        details: { key }
      });
      return null;
    }
  }

  public async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.logError(error as Error, {
        context: 'RedisService',
        message: 'Error deleting Redis key',
        details: { key }
      });
      return false;
    }
  }

  public async isConnected(): Promise<boolean> {
    return this.client.status === 'ready';
  }

  public async getCacheHitRatio(): Promise<number> {
    return this.totalRequests === 0 ? 0 : (this.hits / this.totalRequests) * 100;
  }

  public async getRetryAttempts(): Promise<number> {
    const retryAttempts = await this.retryAttemptsGauge.get();
    return retryAttempts.values[0]?.value ?? 0;
  }

  public async getMetrics(): Promise<{
    connectionStatus: number;
    memoryUsageBytes: number;
    cacheHitRatio: number;
    retryAttempts: number;
  }> {
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