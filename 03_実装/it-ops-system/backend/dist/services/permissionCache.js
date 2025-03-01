"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionCache = void 0;
const sqlite3_1 = require("sqlite3");
const loggingService_1 = __importDefault(require("./loggingService"));
const logger = loggingService_1.default.getInstance();
const metrics = {
    cacheHits: {
        inc: (tags) => {
            logger.logMetric({
                metric: 'cache_hits',
                value: 1,
                unit: 'count',
                tags
            });
        }
    }
};
class PermissionCache {
    constructor() {
        this.config = {
            maxSize: 10000,
            defaultTTL: 3600 // 1 hour
        };
        this.db = new sqlite3_1.Database('database.sqlite');
        this.initializeDatabase().catch(error => {
            logger.logError(error, {
                context: 'PermissionCache',
                message: 'Failed to initialize cache database'
            });
        });
        this.startCleanupInterval();
    }
    async initializeDatabase() {
        return new Promise((resolve, reject) => {
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
                }
                else {
                    resolve();
                }
            });
        });
    }
    static getInstance() {
        if (!PermissionCache.instance) {
            PermissionCache.instance = new PermissionCache();
        }
        return PermissionCache.instance;
    }
    startCleanupInterval() {
        setInterval(async () => {
            try {
                await this.cleanupExpiredEntries();
            }
            catch (error) {
                logger.logError(error, {
                    context: 'PermissionCache',
                    message: 'Failed to clean up expired entries'
                });
            }
        }, 60000); // Clean up every 1 minute
    }
    async cleanupExpiredEntries() {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            this.db.run('DELETE FROM permission_cache WHERE expires_at < ?', [now], (err) => {
                if (err) {
                    logger.logError(err, {
                        context: 'PermissionCache',
                        message: 'Error deleting expired entries'
                    });
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    async get(key) {
        return new Promise((resolve) => {
            const now = Date.now();
            this.db.get('SELECT value FROM permission_cache WHERE key = ? AND expires_at > ?', [key, now], (err, row) => {
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
            });
        });
    }
    async set(key, value, ttl = this.config.defaultTTL) {
        return new Promise((resolve, reject) => {
            const expiresAt = Date.now() + ttl * 1000;
            this.db.get('SELECT COUNT(*) as count FROM permission_cache', async (err, result) => {
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
                    this.db.run(`INSERT OR REPLACE INTO permission_cache (key, value, expires_at)
               VALUES (?, ?, ?)`, [key, value, expiresAt], (err) => {
                        if (err) {
                            logger.logError(err, {
                                context: 'PermissionCache',
                                message: 'Error setting cache',
                                key
                            });
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
    async evictOldEntries() {
        return new Promise((resolve, reject) => {
            const deleteCount = Math.floor(this.config.maxSize * 0.1);
            this.db.run(`DELETE FROM permission_cache 
         WHERE key IN (
           SELECT key FROM permission_cache 
           ORDER BY expires_at ASC 
           LIMIT ?
         )`, [deleteCount], (err) => {
                if (err) {
                    logger.logError(err, {
                        context: 'PermissionCache',
                        message: 'Error evicting old entries'
                    });
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    async invalidate(key) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM permission_cache WHERE key = ?', [key], (err) => {
                if (err) {
                    logger.logError(err, {
                        context: 'PermissionCache',
                        message: 'Error invalidating cache key',
                        key
                    });
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    async clear() {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM permission_cache', (err) => {
                if (err) {
                    logger.logError(err, {
                        context: 'PermissionCache',
                        message: 'Error clearing cache'
                    });
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
}
exports.PermissionCache = PermissionCache;
//# sourceMappingURL=permissionCache.js.map