import { Database } from 'sqlite3';
import LoggingService from './loggingService';

const logger = LoggingService.getInstance();
const metrics = {
  cacheHits: {
    inc: (tags: { cache: string; result: string }) => {
      logger.logMetric({
        metric: 'cache_hits',
        value: 1,
        unit: 'count',
        tags
      });
    }
  }
};

interface PermissionCacheConfig {
  maxSize: number;
  defaultTTL: number;
}

export class PermissionCache {
  private static instance: PermissionCache;
  private db: Database;
  private config: PermissionCacheConfig = {
    maxSize: 10000,
    defaultTTL: 3600 // 1 hour
  };

  private constructor() {
    this.db = new Database('database.sqlite');
    this.initializeDatabase().catch(error => {
      logger.logError(error as Error, {
        context: 'PermissionCache',
        message: 'Failed to initialize cache database'
      });
    });
    this.startCleanupInterval();
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS permission_cache (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_permission_cache_expiry 
        ON permission_cache(expires_at);
      `, (err) => {
        if (err) {
          logger.logError(err, {
            context: 'PermissionCache',
            message: 'Error initializing cache database'
          });
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public static getInstance(): PermissionCache {
    if (!PermissionCache.instance) {
      PermissionCache.instance = new PermissionCache();
    }
    return PermissionCache.instance;
  }

  private startCleanupInterval(): void {
    setInterval(async () => {
      try {
        await this.cleanupExpiredEntries();
      } catch (error) {
        logger.logError(error as Error, {
          context: 'PermissionCache',
          message: 'Failed to clean up expired entries'
        });
      }
    }, 60000); // Clean up every 1 minute
  }

  private async cleanupExpiredEntries(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const now = Date.now();
      this.db.run(
        'DELETE FROM permission_cache WHERE expires_at < ?',
        [now],
        (err) => {
          if (err) {
            logger.logError(err, {
              context: 'PermissionCache',
              message: 'Error deleting expired entries'
            });
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  public async get(key: string): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      const now = Date.now();
      this.db.get(
        'SELECT value FROM permission_cache WHERE key = ? AND expires_at > ?',
        [key, now],
        (err, row: { value: string } | undefined) => {
          if (err) {
            logger.logError(err, {
              context: 'PermissionCache',
              message: 'Error fetching from cache',
              key
            });
            resolve(null);
            return;
          }

          metrics.cacheHits.inc({
            cache: 'permission',
            result: row ? 'hit' : 'miss'
          });

          resolve(row?.value || null);
        }
      );
    });
  }

  public async set(key: string, value: string, ttl: number = this.config.defaultTTL): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const expiresAt = Date.now() + ttl * 1000;

      this.db.get(
        'SELECT COUNT(*) as count FROM permission_cache',
        async (err, result: { count: number }) => {
          if (err) {
            logger.logError(err, {
              context: 'PermissionCache',
              message: 'Error counting cache entries',
              key
            });
            reject(err);
            return;
          }

          try {
            if ((result?.count ?? 0) >= this.config.maxSize) {
              await this.evictOldEntries();
            }

            this.db.run(
              `INSERT OR REPLACE INTO permission_cache (key, value, expires_at)
               VALUES (?, ?, ?)`,
              [key, value, expiresAt],
              (err) => {
                if (err) {
                  logger.logError(err, {
                    context: 'PermissionCache',
                    message: 'Error setting cache',
                    key
                  });
                  reject(err);
                } else {
                  resolve();
                }
              }
            );
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  private async evictOldEntries(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const deleteCount = Math.floor(this.config.maxSize * 0.1);
      this.db.run(
        `DELETE FROM permission_cache 
         WHERE key IN (
           SELECT key FROM permission_cache 
           ORDER BY expires_at ASC 
           LIMIT ?
         )`,
        [deleteCount],
        (err) => {
          if (err) {
            logger.logError(err, {
              context: 'PermissionCache',
              message: 'Error evicting old entries'
            });
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  public async invalidate(key: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.run(
        'DELETE FROM permission_cache WHERE key = ?',
        [key],
        (err) => {
          if (err) {
            logger.logError(err, {
              context: 'PermissionCache',
              message: 'Error invalidating cache key',
              key
            });
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  public async clear(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.run('DELETE FROM permission_cache', (err) => {
        if (err) {
          logger.logError(err, {
            context: 'PermissionCache',
            message: 'Error clearing cache'
          });
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}