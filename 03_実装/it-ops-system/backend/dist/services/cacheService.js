"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
const loggingService_1 = __importDefault(require("./loggingService"));
const logger = loggingService_1.default.getInstance();
/**
 * キャッシュサービス
 * 頻繁にアクセスされるデータのキャッシュ機構を提供
 */
class CacheService {
    constructor(ttlSeconds = 300) {
        this.hitCount = {};
        this.missCount = {};
        this.statsInterval = null;
        this.cache = new node_cache_1.default({
            stdTTL: ttlSeconds,
            checkperiod: ttlSeconds * 0.2,
            useClones: false
        });
        // キャッシュの有効期限イベントをリッスン
        this.cache.on('expired', (key, value) => {
            logger.logInfo({
                context: 'CacheService',
                message: `キャッシュキー "${key}" の有効期限が切れました`
            });
        });
        // 統計情報の定期的なログ出力
        this.statsInterval = setInterval(() => {
            this.logStats();
        }, 60 * 60 * 1000); // 1時間ごと
    }
    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(ttlSeconds) {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService(ttlSeconds);
        }
        return CacheService.instance;
    }
    /**
     * キャッシュからデータを取得
     * @param key キャッシュキー
     */
    get(key) {
        const value = this.cache.get(key);
        // ヒット率の統計を更新
        if (value !== undefined) {
            this.hitCount[key] = (this.hitCount[key] || 0) + 1;
        }
        else {
            this.missCount[key] = (this.missCount[key] || 0) + 1;
        }
        return value;
    }
    /**
     * キャッシュにデータを設定
     * @param key キャッシュキー
     * @param value キャッシュ値
     * @param ttl 有効期限（秒）
     */
    set(key, value, ttl) {
        return this.cache.set(key, value, ttl);
    }
    /**
     * キャッシュからデータを削除
     * @param key キャッシュキー
     */
    del(key) {
        return this.cache.del(key);
    }
    /**
     * キャッシュをクリア
     */
    flush() {
        this.cache.flushAll();
        this.hitCount = {};
        this.missCount = {};
        logger.logInfo({
            context: 'CacheService',
            message: 'キャッシュをクリアしました'
        });
    }
    /**
     * キャッシュの統計情報を取得
     */
    getStats() {
        const stats = this.cache.getStats();
        const totalHits = Object.values(this.hitCount).reduce((sum, count) => sum + count, 0);
        const totalMisses = Object.values(this.missCount).reduce((sum, count) => sum + count, 0);
        const hitRate = totalHits + totalMisses > 0
            ? totalHits / (totalHits + totalMisses)
            : 0;
        return {
            keys: this.cache.keys().length,
            hits: totalHits,
            misses: totalMisses,
            hitRate,
            ksize: stats.ksize,
            vsize: stats.vsize
        };
    }
    /**
     * キャッシュの統計情報をログに出力
     */
    logStats() {
        const stats = this.getStats();
        logger.logInfo({
            context: 'CacheService',
            message: 'キャッシュ統計情報',
            stats: {
                keys: stats.keys,
                hits: stats.hits,
                misses: stats.misses,
                hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
                memoryUsage: {
                    keys: `${(stats.ksize / 1024).toFixed(2)} KB`,
                    values: `${(stats.vsize / 1024).toFixed(2)} KB`,
                    total: `${((stats.ksize + stats.vsize) / 1024).toFixed(2)} KB`
                }
            }
        });
    }
    /**
     * キャッシュが存在するか確認
     * @param key キャッシュキー
     */
    has(key) {
        return this.cache.has(key);
    }
    /**
     * キャッシュから取得、なければ生成して設定
     * @param key キャッシュキー
     * @param producer データ生成関数
     * @param ttl 有効期限（秒）
     */
    async getOrSet(key, producer, ttl) {
        // キャッシュから取得
        const cachedValue = this.get(key);
        if (cachedValue !== undefined) {
            return cachedValue;
        }
        try {
            // データを生成
            const value = await producer();
            // キャッシュに設定
            this.set(key, value, ttl);
            return value;
        }
        catch (error) {
            logger.logError(error, {
                context: 'CacheService',
                message: `キャッシュキー "${key}" のデータ生成中にエラーが発生しました`
            });
            throw error;
        }
    }
    /**
     * 複数のキャッシュを一括取得
     * @param keys キャッシュキーの配列
     */
    mget(keys) {
        return this.cache.mget(keys);
    }
    /**
     * 複数のキャッシュを一括設定
     * @param keyValuePairs キーと値のペアのオブジェクト
     * @param ttl 有効期限（秒）
     */
    mset(keyValuePairs, ttl) {
        let success = true;
        // 複数のキーと値のペアを個別にsetメソッドで設定
        for (const [key, value] of Object.entries(keyValuePairs)) {
            const result = this.set(key, value, ttl);
            if (!result) {
                success = false;
            }
        }
        return success;
    }
    /**
     * キャッシュキーのTTLを更新
     * @param key キャッシュキー
     * @param ttl 新しい有効期限（秒）
     */
    ttl(key, ttl) {
        return this.cache.ttl(key, ttl);
    }
    /**
     * 特定のパターンに一致するキーを取得
     * @param pattern 正規表現パターン
     */
    getKeysByPattern(pattern) {
        return this.cache.keys().filter(key => pattern.test(key));
    }
    /**
     * 特定のパターンに一致するキーを削除
     * @param pattern 正規表現パターン
     */
    delByPattern(pattern) {
        const keys = this.getKeysByPattern(pattern);
        return this.cache.del(keys);
    }
    /**
     * リソース解放
     */
    close() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
        this.cache.close();
        logger.logInfo({
            context: 'CacheService',
            message: 'キャッシュサービスを終了しました'
        });
    }
}
exports.CacheService = CacheService;
exports.default = CacheService;
//# sourceMappingURL=cacheService.js.map