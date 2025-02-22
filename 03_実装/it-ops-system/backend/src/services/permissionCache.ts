import { PermissionService } from './permissionService';
import { RedisService } from './redisService';
import { Prometheus } from '../metrics/prometheus';
import LoggingService from './loggingService';

const logger = LoggingService.getInstance();
const redis = RedisService.getInstance().getClient();

interface PermissionCacheConfig {
  ttl: number;  // キャッシュの有効期間（秒）
  maxSize: number;  // 最大キャッシュサイズ
}

export class PermissionCache {
  private static instance: PermissionCache;
  private metrics = Prometheus;
  private readonly config: PermissionCacheConfig = {
    ttl: 300,  // 5分
    maxSize: 10000
  };

  private constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // キャッシュのパフォーマンスメトリクス
    this.metrics.register.gauge({
      name: 'permission_cache_size',
      help: '権限キャッシュのサイズ'
    });

    this.metrics.register.counter({
      name: 'permission_cache_hits_total',
      help: 'キャッシュヒットの総数'
    });

    this.metrics.register.counter({
      name: 'permission_cache_misses_total',
      help: 'キャッシュミスの総数'
    });
  }

  public static getInstance(): PermissionCache {
    if (!PermissionCache.instance) {
      PermissionCache.instance = new PermissionCache();
    }
    return PermissionCache.instance;
  }

  private generateCacheKey(userId: string, resource: string, action: string): string {
    return `perm:${userId}:${resource}:${action}`;
  }

  public async getPermission(userId: string, resource: string, action: string): Promise<boolean | null> {
    const startTime = process.hrtime();
    const cacheKey = this.generateCacheKey(userId, resource, action);

    try {
      const cachedValue = await redis.get(cacheKey);
      
      // メトリクスの更新
      if (cachedValue !== null) {
        this.metrics.metrics.caching.inc({ cache_type: 'permission_hit' });
        this.recordAccessLatency(startTime, 'cache_hit');
        return cachedValue === 'true';
      }

      this.metrics.metrics.caching.inc({ cache_type: 'permission_miss' });
      return null;
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionCache',
        message: 'キャッシュアクセスエラー',
        userId,
        resource,
        action
      });
      return null;
    }
  }

  public async setPermission(
    userId: string,
    resource: string,
    action: string,
    hasPermission: boolean
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(userId, resource, action);

    try {
      await redis.set(cacheKey, hasPermission.toString(), 'EX', this.config.ttl);
      
      // キャッシュサイズの監視
      const currentSize = await this.getCurrentCacheSize();
      this.metrics.metrics.caching.set({ cache_type: 'size' }, currentSize);

      // キャッシュが大きすぎる場合は古いエントリーを削除
      if (currentSize > this.config.maxSize) {
        await this.evictOldEntries();
      }
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionCache',
        message: 'キャッシュ設定エラー',
        userId,
        resource,
        action
      });
    }
  }

  public async invalidatePermission(userId: string, resource?: string, action?: string): Promise<void> {
    try {
      let pattern = `perm:${userId}`;
      if (resource) pattern += `:${resource}`;
      if (action) pattern += `:${action}`;
      pattern += '*';

      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      // メトリクスの更新
      this.metrics.metrics.caching.set(
        { cache_type: 'invalidations' },
        keys.length
      );
    } catch (error) {
      logger.logError(error as Error, {
        context: 'PermissionCache',
        message: 'キャッシュ無効化エラー',
        userId,
        resource,
        action
      });
    }
  }

  private async getCurrentCacheSize(): Promise<number> {
    const keys = await redis.keys('perm:*');
    return keys.length;
  }

  private async evictOldEntries(): Promise<void> {
    const keys = await redis.keys('perm:*');
    const ttls = await Promise.all(keys.map(key => redis.ttl(key)));
    
    // TTLが最も短いエントリーを削除
    const entriesToEvict = keys
      .map((key, index) => ({ key, ttl: ttls[index] }))
      .sort((a, b) => a.ttl - b.ttl)
      .slice(0, Math.floor(this.config.maxSize * 0.1)) // 10%のエントリーを削除
      .map(entry => entry.key);

    if (entriesToEvict.length > 0) {
      await redis.del(...entriesToEvict);
    }
  }

  private recordAccessLatency(startTime: [number, number], type: 'cache_hit' | 'cache_miss'): void {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;

    this.metrics.metrics.permissionCheck.observe({
      type: 'cache_access',
      result: type
    }, duration);
  }
}