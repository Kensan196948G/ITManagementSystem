import Redis from 'ioredis';
import { Prometheus } from '../metrics/prometheus';

export class RedisService {
  private static instance: RedisService;
  private client: Redis;
  private readonly metrics = Prometheus;

  private constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      showFriendlyErrorStack: process.env.NODE_ENV !== 'production'
    });

    this.setupMonitoring();
  }

  private setupMonitoring() {
    // Redisの接続状態を監視
    this.metrics.register.gauge({
      name: 'redis_connection_status',
      help: 'Redis connection status (1 = connected, 0 = disconnected)'
    });

    // キャッシュヒット率の監視
    this.metrics.register.gauge({
      name: 'redis_cache_hit_ratio',
      help: 'Redis cache hit ratio'
    });

    this.client.on('connect', () => {
      this.metrics.metrics.caching.set({ cache_type: 'redis' }, 1);
    });

    this.client.on('error', () => {
      this.metrics.metrics.caching.set({ cache_type: 'redis' }, 0);
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
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}