/**
 * 最適化されたクエリサービス
 * データベースクエリのパフォーマンス最適化を提供
 */
export declare class OptimizedQueryService {
    private static instance;
    private sqliteService;
    private queryStats;
    private constructor();
    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(): OptimizedQueryService;
    /**
     * 最適化されたクエリを実行（キャッシュ対応）
     * @param query SQLクエリ
     * @param params クエリパラメータ
     * @param cacheKey キャッシュキー（指定しない場合はキャッシュを使用しない）
     * @param ttl キャッシュの有効期限（秒）
     */
    query<T>(query: string, params?: any[], cacheKey?: string, ttl?: number): Promise<T[]>;
    /**
     * 最適化された単一行クエリを実行（キャッシュ対応）
     * @param query SQLクエリ
     * @param params クエリパラメータ
     * @param cacheKey キャッシュキー（指定しない場合はキャッシュを使用しない）
     * @param ttl キャッシュの有効期限（秒）
     */
    queryOne<T>(query: string, params?: any[], cacheKey?: string, ttl?: number): Promise<T | null>;
    /**
     * 最適化された更新クエリを実行
     * @param query SQLクエリ
     * @param params クエリパラメータ
     * @param invalidateCache キャッシュを無効化するパターン（正規表現）
     */
    execute(query: string, params?: any[], invalidateCache?: RegExp): Promise<void>;
    /**
     * トランザクションを実行
     * @param callback トランザクション内で実行するコールバック関数
     * @param invalidateCache キャッシュを無効化するパターン（正規表現）
     */
    transaction<T>(callback: () => Promise<T>, invalidateCache?: RegExp): Promise<T>;
    /**
     * クエリの統計情報を更新
     * @param query SQLクエリ
     * @param executionTime 実行時間（ミリ秒）
     */
    private updateQueryStats;
    /**
     * クエリの統計情報を取得
     */
    getQueryStats(): Record<string, {
        count: number;
        totalTime: number;
        avgTime: number;
        lastExecuted: Date;
    }>;
    /**
     * 実行時間の長いクエリを取得
     * @param threshold 閾値（ミリ秒）
     * @param limit 取得件数
     */
    getSlowQueries(threshold?: number, limit?: number): {
        query: string;
        count: number;
        avgTime: number;
        lastExecuted: Date;
    }[];
    /**
     * 頻繁に実行されるクエリを取得
     * @param limit 取得件数
     */
    getFrequentQueries(limit?: number): {
        query: string;
        count: number;
        avgTime: number;
        lastExecuted: Date;
    }[];
    /**
     * クエリの統計情報をリセット
     */
    resetQueryStats(): void;
    /**
     * ページネーション付きクエリを実行
     * @param baseQuery ベースクエリ（WHERE句まで）
     * @param countQuery カウントクエリ
     * @param params クエリパラメータ
     * @param pagination ページネーション設定
     * @param cacheKey キャッシュキー（指定しない場合はキャッシュを使用しない）
     * @param ttl キャッシュの有効期限（秒）
     */
    queryWithPagination<T>(baseQuery: string, countQuery: string, params: any[] | undefined, pagination: {
        limit: number;
        offset: number;
    }, cacheKey?: string, ttl?: number): Promise<{
        data: T[];
        total: number;
        page: number;
        pageSize: number;
        pageCount: number;
    }>;
}
export default OptimizedQueryService;
//# sourceMappingURL=optimizedQueryService.d.ts.map