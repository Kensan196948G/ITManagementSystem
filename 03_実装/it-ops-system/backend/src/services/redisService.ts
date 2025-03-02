import { EventEmitter } from 'events';
import { Gauge } from 'prom-client';
import Redis from 'ioredis';
import LoggingService from './loggingService';

// インターフェースを定義
interface IRedisClient {
  status: string;
  on(event: string, listener: (...args: any[]) => void): this;
  ping(): Promise<string>;
  quit(): Promise<'OK'>;
  info(section: string): Promise<string>;
  set(key: string, value: string, ...args: any[]): Promise<any>;
  get(key: string): Promise<string | null>;
  del(key: string | string[]): Promise<number>;
}

// Redis Mock実装
class RedisMock extends EventEmitter implements IRedisClient {
  private mockData: Map<string, { value: string; expiry?: number }> = new Map();
  public status: string = 'ready';

  constructor() {
    super();
    setTimeout(() => {
      this.emit('connect');
      this.emit('ready');
    }, 0);
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async quit(): Promise<'OK'> {
    this.status = 'end';
    this.emit('end');
    return 'OK';
  }

  async info(section: string): Promise<string> {
    if (section === 'memory') {
      return 'used_memory:1024\nused_memory_human:1M\n';
    }
    return '';
  }

  async set(key: string, value: string, ...args: any[]): Promise<'OK'> {
    let expiry: number | undefined = undefined;
    if (args.length >= 2 && args[0] === 'EX') {
      expiry = Date.now() + args[1] * 1000;
    }
    this.mockData.set(key, { value, expiry });
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    const data = this.mockData.get(key);
    if (!data) return null;
    if (data.expiry && data.expiry < Date.now()) {
      this.mockData.delete(key);
      return null;
    }
    return data.value;
  }

  async del(key: string | string[]): Promise<number> {
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

const logger = LoggingService.getInstance();

export class RedisService {
  private static instance: RedisService;
  private client!: Redis;
  private connectionStatusGauge: Gauge;
  private memoryUsageGauge: Gauge;
  private retryAttemptsGauge: Gauge;
  private hits: number = 0;
  private totalRequests: number = 0;
  private cacheHitRatioGauge: Gauge;
  private isUsingMock: boolean = false;
  private mockData: Map<string, { value: string; expiry?: number }> = new Map();

  private constructor() {
    // メトリクス用Gaugeを初期化
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

    // Redis接続が必要かどうかチェック（開発環境では必須でない）
    const useRedisMock = process.env.NODE_ENV === 'development' || process.env.DISABLE_REDIS === 'true';
    
    if (useRedisMock) {
      // Redisのモック実装（開発環境用）
      this.setupMockRedis();
      logger.logInfo({
        message: 'Using Redis mock implementation for development',
        context: 'RedisService'
      });
    } else {
      try {
        this.client = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD,
          connectTimeout: 10000,
          commandTimeout: 5000,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            this.retryAttemptsGauge.set(times);
            return delay;
          },
          maxRetriesPerRequest: 5,
          enableReadyCheck: true,
          showFriendlyErrorStack: process.env.NODE_ENV !== 'production'
        });
        
        this.setupMonitoring();
      } catch (error) {
        // Redis接続に失敗した場合はモックに切り替え
        logger.logError(error as Error, {
          context: 'RedisService',
          message: 'Failed to initialize Redis, falling back to mock implementation'
        });
        this.setupMockRedis();
      }
    }
  }

  // モックRedisクライアントのセットアップ
  private setupMockRedis(): void {
    this.isUsingMock = true;
    
    // イベントエミッタを利用したモッククライアント
    const mockClient = new EventEmitter() as unknown as Redis;
    
    // 基本的なメソッドをモック
    mockClient.status = 'ready';
    
    mockClient.ping = async () => 'PONG';
    
    mockClient.quit = async () => {
      mockClient.status = 'end';
      mockClient.emit('end');
      return 'OK';
    };
    
    mockClient.info = async (section: string) => {
      if (section === 'memory') {
        return 'used_memory:1024\nused_memory_human:1M\n';
      }
      return '';
    };
    
    mockClient.set = async (key: string, value: string, ...args: any[]) => {
      let expiry: number | undefined = undefined;
      if (args.length >= 2 && args[0] === 'EX') {
        expiry = Date.now() + args[1] * 1000;
      }
      this.mockData.set(key, { value, expiry });
      return 'OK';
    };
    
    mockClient.get = async (key: string) => {
      const data = this.mockData.get(key);
      if (!data) return null;
      if (data.expiry && data.expiry < Date.now()) {
        this.mockData.delete(key);
        return null;
      }
      return data.value;
    };
    
    mockClient.del = async (key: string | string[]) => {
      const keys = Array.isArray(key) ? key : [key];
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

  private setupMonitoring(): void {
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

  public getClient(): IRedisClient {
    return this.client;
  }

  public isUsingMockImplementation(): boolean {
    return this.isUsingMock;
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
    let memoryUsageBytes = 0;
    
    try {
      const info = await this.client.info('memory');
      const match = info.match(/used_memory:(\d+)/);
      if (match) {
        memoryUsageBytes = parseInt(match[1], 10);
      }
    } catch (error) {
      logger.logError(error as Error, {
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
