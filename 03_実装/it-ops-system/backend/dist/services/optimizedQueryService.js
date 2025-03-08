"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizedQueryService = void 0;
const sqliteService_1 = require("./sqliteService");
const loggingService_1 = __importDefault(require("./loggingService"));
const cacheService_1 = __importDefault(require("./cacheService"));
const logger = loggingService_1.default.getInstance();
const cache = cacheService_1.default.getInstance();
/**
 * 最適化されたクエリサービス
 * データベースクエリのパフォーマンス最適化を提供
 */
class OptimizedQueryService {
    constructor() {
        this.queryStats = {};
        this.sqliteService = sqliteService_1.SQLiteService.getInstance();
    }
    /**
     * シングルトンインスタンスを取得
     */
    static getInstance() {
        if (!OptimizedQueryService.instance) {
            OptimizedQueryService.instance = new OptimizedQueryService();
        }
        return OptimizedQueryService.instance;
    }
    /**
     * 最適化されたクエリを実行（キャッシュ対応）
     * @param query SQLクエリ
     * @param params クエリパラメータ
     * @param cacheKey キャッシュキー（指定しない場合はキャッシュを使用しない）
     * @param ttl キャッシュの有効期限（秒）
     */
    async query(query, params = [], cacheKey, ttl = 300) {
        // クエリの実行時間を計測
        const startTime = process.hrtime();
        try {
            // キャッシュキーが指定されている場合はキャッシュから取得
            if (cacheKey) {
                return await cache.getOrSet(cacheKey, async () => {
                    // キャッシュにない場合はクエリを実行
                    const result = await this.sqliteService.all(query, params);
                    return result;
                }, ttl);
            }
            else {
                // キャッシュを使用しない場合は直接クエリを実行
                return await this.sqliteService.all(query, params);
            }
        }
        catch (error) {
            logger.logError(error, {
                context: 'OptimizedQueryService',
                message: 'クエリ実行エラー',
                query,
                params
            });
            throw error;
        }
        finally {
            // クエリの実行時間を記録
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const executionTime = seconds * 1000 + nanoseconds / 1000000; // ミリ秒に変換
            // クエリの統計情報を更新
            this.updateQueryStats(query, executionTime);
        }
    }
    /**
     * 最適化された単一行クエリを実行（キャッシュ対応）
     * @param query SQLクエリ
     * @param params クエリパラメータ
     * @param cacheKey キャッシュキー（指定しない場合はキャッシュを使用しない）
     * @param ttl キャッシュの有効期限（秒）
     */
    async queryOne(query, params = [], cacheKey, ttl = 300) {
        // クエリの実行時間を計測
        const startTime = process.hrtime();
        try {
            // キャッシュキーが指定されている場合はキャッシュから取得
            if (cacheKey) {
                return await cache.getOrSet(cacheKey, async () => {
                    // キャッシュにない場合はクエリを実行
                    const result = await this.sqliteService.get(query, params);
                    return result || null;
                }, ttl);
            }
            else {
                // キャッシュを使用しない場合は直接クエリを実行
                const result = await this.sqliteService.get(query, params);
                return result || null;
            }
        }
        catch (error) {
            logger.logError(error, {
                context: 'OptimizedQueryService',
                message: '単一行クエリ実行エラー',
                query,
                params
            });
            throw error;
        }
        finally {
            // クエリの実行時間を記録
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const executionTime = seconds * 1000 + nanoseconds / 1000000; // ミリ秒に変換
            // クエリの統計情報を更新
            this.updateQueryStats(query, executionTime);
        }
    }
    /**
     * 最適化された更新クエリを実行
     * @param query SQLクエリ
     * @param params クエリパラメータ
     * @param invalidateCache キャッシュを無効化するパターン（正規表現）
     */
    async execute(query, params = [], invalidateCache) {
        // クエリの実行時間を計測
        const startTime = process.hrtime();
        try {
            // クエリを実行
            await this.sqliteService.run(query, params);
            // キャッシュを無効化
            if (invalidateCache) {
                const deletedCount = cache.delByPattern(invalidateCache);
                if (deletedCount > 0) {
                    logger.logInfo({
                        context: 'OptimizedQueryService',
                        message: `キャッシュを無効化しました (${deletedCount}件)`,
                        pattern: invalidateCache.toString()
                    });
                }
            }
        }
        catch (error) {
            logger.logError(error, {
                context: 'OptimizedQueryService',
                message: '更新クエリ実行エラー',
                query,
                params
            });
            throw error;
        }
        finally {
            // クエリの実行時間を記録
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const executionTime = seconds * 1000 + nanoseconds / 1000000; // ミリ秒に変換
            // クエリの統計情報を更新
            this.updateQueryStats(query, executionTime);
        }
    }
    /**
     * トランザクションを実行
     * @param callback トランザクション内で実行するコールバック関数
     * @param invalidateCache キャッシュを無効化するパターン（正規表現）
     */
    async transaction(callback, invalidateCache) {
        // トランザクションの実行時間を計測
        const startTime = process.hrtime();
        try {
            // トランザクションを開始
            await this.sqliteService.run('BEGIN TRANSACTION');
            // コールバックを実行
            const result = await callback();
            // トランザクションをコミット
            await this.sqliteService.run('COMMIT');
            // キャッシュを無効化
            if (invalidateCache) {
                const deletedCount = cache.delByPattern(invalidateCache);
                if (deletedCount > 0) {
                    logger.logInfo({
                        context: 'OptimizedQueryService',
                        message: `トランザクション後にキャッシュを無効化しました (${deletedCount}件)`,
                        pattern: invalidateCache.toString()
                    });
                }
            }
            return result;
        }
        catch (error) {
            // エラーが発生した場合はロールバック
            await this.sqliteService.run('ROLLBACK');
            logger.logError(error, {
                context: 'OptimizedQueryService',
                message: 'トランザクション実行エラー'
            });
            throw error;
        }
        finally {
            // トランザクションの実行時間を記録
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const executionTime = seconds * 1000 + nanoseconds / 1000000; // ミリ秒に変換
            logger.logInfo({
                context: 'OptimizedQueryService',
                message: 'トランザクション実行時間',
                executionTime: `${executionTime.toFixed(2)}ms`
            });
        }
    }
    /**
     * クエリの統計情報を更新
     * @param query SQLクエリ
     * @param executionTime 実行時間（ミリ秒）
     */
    updateQueryStats(query, executionTime) {
        // クエリの正規化（パラメータを除去）
        const normalizedQuery = query.replace(/\s+/g, ' ').trim();
        // 統計情報を更新
        if (!this.queryStats[normalizedQuery]) {
            this.queryStats[normalizedQuery] = {
                count: 0,
                totalTime: 0,
                avgTime: 0,
                lastExecuted: new Date()
            };
        }
        const stats = this.queryStats[normalizedQuery];
        stats.count++;
        stats.totalTime += executionTime;
        stats.avgTime = stats.totalTime / stats.count;
        stats.lastExecuted = new Date();
        // 実行時間が長いクエリをログに記録
        if (executionTime > 100) { // 100ms以上かかるクエリ
            logger.logWarning({
                context: 'OptimizedQueryService',
                message: '実行時間の長いクエリを検出',
                query: normalizedQuery,
                executionTime: `${executionTime.toFixed(2)}ms`,
                avgTime: `${stats.avgTime.toFixed(2)}ms`,
                count: stats.count
            });
        }
    }
    /**
     * クエリの統計情報を取得
     */
    getQueryStats() {
        return { ...this.queryStats };
    }
    /**
     * 実行時間の長いクエリを取得
     * @param threshold 閾値（ミリ秒）
     * @param limit 取得件数
     */
    getSlowQueries(threshold = 100, limit = 10) {
        return Object.entries(this.queryStats)
            .filter(([_, stats]) => stats.avgTime > threshold)
            .sort((a, b) => b[1].avgTime - a[1].avgTime)
            .slice(0, limit)
            .map(([query, stats]) => ({
            query,
            count: stats.count,
            avgTime: stats.avgTime,
            lastExecuted: stats.lastExecuted
        }));
    }
    /**
     * 頻繁に実行されるクエリを取得
     * @param limit 取得件数
     */
    getFrequentQueries(limit = 10) {
        return Object.entries(this.queryStats)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, limit)
            .map(([query, stats]) => ({
            query,
            count: stats.count,
            avgTime: stats.avgTime,
            lastExecuted: stats.lastExecuted
        }));
    }
    /**
     * クエリの統計情報をリセット
     */
    resetQueryStats() {
        this.queryStats = {};
        logger.logInfo({
            context: 'OptimizedQueryService',
            message: 'クエリ統計情報をリセットしました'
        });
    }
    /**
     * ページネーション付きクエリを実行
     * @param baseQuery ベースクエリ（WHERE句まで）
     * @param countQuery カウントクエリ
     * @param params クエリパラメータ
     * @param pagination ページネーション設定
     * @param cacheKey キャッシュキー（指定しない場合はキャッシュを使用しない）
     * @param ttl キャッシュの有効期限（秒）
     */
    async queryWithPagination(baseQuery, countQuery, params = [], pagination, cacheKey, ttl = 300) {
        // ページネーションパラメータの検証
        const limit = Math.max(1, Math.min(100, pagination.limit || 20));
        const offset = Math.max(0, pagination.offset || 0);
        const page = Math.floor(offset / limit) + 1;
        try {
            // 合計件数を取得
            const totalCountCacheKey = cacheKey ? `${cacheKey}:count` : undefined;
            const totalResult = await this.queryOne(countQuery, params, totalCountCacheKey, ttl);
            const total = totalResult?.total || 0;
            // ページ数を計算
            const pageCount = Math.ceil(total / limit);
            // データを取得
            const paginatedQuery = `${baseQuery} LIMIT ? OFFSET ?`;
            const paginatedParams = [...params, limit, offset];
            const dataCacheKey = cacheKey ? `${cacheKey}:data:${limit}:${offset}` : undefined;
            const data = await this.query(paginatedQuery, paginatedParams, dataCacheKey, ttl);
            return {
                data,
                total,
                page,
                pageSize: limit,
                pageCount
            };
        }
        catch (error) {
            logger.logError(error, {
                context: 'OptimizedQueryService',
                message: 'ページネーション付きクエリ実行エラー',
                baseQuery,
                countQuery,
                params,
                pagination
            });
            throw error;
        }
    }
}
exports.OptimizedQueryService = OptimizedQueryService;
exports.default = OptimizedQueryService;
//# sourceMappingURL=optimizedQueryService.js.map