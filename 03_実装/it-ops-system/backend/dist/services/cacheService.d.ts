/**
 * キャッシュサービス
 * 頻繁にアクセスされるデータのキャッシュ機構を提供
 */
export declare class CacheService {
    private static instance;
    private cache;
    private hitCount;
    private missCount;
    private statsInterval;
    private constructor();
    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(ttlSeconds?: number): CacheService;
    /**
     * キャッシュからデータを取得
     * @param key キャッシュキー
     */
    get<T>(key: string): T | undefined;
    /**
     * キャッシュにデータを設定
     * @param key キャッシュキー
     * @param value キャッシュ値
     * @param ttl 有効期限（秒）
     */
    set<T>(key: string, value: T, ttl?: number): boolean;
    /**
     * キャッシュからデータを削除
     * @param key キャッシュキー
     */
    del(key: string): number;
    /**
     * キャッシュをクリア
     */
    flush(): void;
    /**
     * キャッシュの統計情報を取得
     */
    getStats(): {
        keys: number;
        hits: number;
        misses: number;
        hitRate: number;
        ksize: number;
        vsize: number;
    };
    /**
     * キャッシュの統計情報をログに出力
     */
    private logStats;
    /**
     * キャッシュが存在するか確認
     * @param key キャッシュキー
     */
    has(key: string): boolean;
    /**
     * キャッシュから取得、なければ生成して設定
     * @param key キャッシュキー
     * @param producer データ生成関数
     * @param ttl 有効期限（秒）
     */
    getOrSet<T>(key: string, producer: () => Promise<T>, ttl?: number): Promise<T>;
    /**
     * 複数のキャッシュを一括取得
     * @param keys キャッシュキーの配列
     */
    mget<T>(keys: string[]): Record<string, T>;
    /**
     * 複数のキャッシュを一括設定
     * @param keyValuePairs キーと値のペアのオブジェクト
     * @param ttl 有効期限（秒）
     */
    mset<T>(keyValuePairs: Record<string, T>, ttl?: number): boolean;
    /**
     * キャッシュキーのTTLを更新
     * @param key キャッシュキー
     * @param ttl 新しい有効期限（秒）
     */
    ttl(key: string, ttl: number): boolean;
    /**
     * 特定のパターンに一致するキーを取得
     * @param pattern 正規表現パターン
     */
    getKeysByPattern(pattern: RegExp): string[];
    /**
     * 特定のパターンに一致するキーを削除
     * @param pattern 正規表現パターン
     */
    delByPattern(pattern: RegExp): number;
    /**
     * リソース解放
     */
    close(): void;
}
export default CacheService;
//# sourceMappingURL=cacheService.d.ts.map