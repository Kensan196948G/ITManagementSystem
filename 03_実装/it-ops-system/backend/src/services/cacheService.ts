import NodeCache from 'node-cache';
import LoggingService from './loggingService';

const logger = LoggingService.getInstance();

/**
 * キャッシュサービス
 * 頻繁にアクセスされるデータのキャッシュ機構を提供
 */
export class CacheService {
  private static instance: CacheService;
  private cache: NodeCache;
  private hitCount: Record<string, number> = {};
  private missCount: Record<string, number> = {};
  private statsInterval: NodeJS.Timeout | null = null;

  private constructor(ttlSeconds: number = 300) {
    this.cache = new NodeCache({
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
  public static getInstance(ttlSeconds?: number): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(ttlSeconds);
    }
    return CacheService.instance;
  }

  /**
   * キャッシュからデータを取得
   * @param key キャッシュキー
   */
  public get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    
    // ヒット率の統計を更新
    if (value !== undefined) {
      this.hitCount[key] = (this.hitCount[key] || 0) + 1;
    } else {
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
  public set<T>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(key, value, ttl);
  }

  /**
   * キャッシュからデータを削除
   * @param key キャッシュキー
   */
  public del(key: string): number {
    return this.cache.del(key);
  }

  /**
   * キャッシュをクリア
   */
  public flush(): void {
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
  public getStats(): {
    keys: number;
    hits: number;
    misses: number;
    hitRate: number;
    ksize: number;
    vsize: number;
  } {
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
  private logStats(): void {
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
  public has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * キャッシュから取得、なければ生成して設定
   * @param key キャッシュキー
   * @param producer データ生成関数
   * @param ttl 有効期限（秒）
   */
  public async getOrSet<T>(
    key: string,
    producer: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // キャッシュから取得
    const cachedValue = this.get<T>(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    try {
      // データを生成
      const value = await producer();
      
      // キャッシュに設定
      this.set(key, value, ttl);
      
      return value;
    } catch (error) {
      logger.logError(error as Error, {
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
  public mget<T>(keys: string[]): Record<string, T> {
    return this.cache.mget<T>(keys);
  }

  /**
   * 複数のキャッシュを一括設定
   * @param keyValuePairs キーと値のペアのオブジェクト
   * @param ttl 有効期限（秒）
   */
  public mset<T>(keyValuePairs: Record<string, T>, ttl?: number): boolean {
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
  public ttl(key: string, ttl: number): boolean {
    return this.cache.ttl(key, ttl);
  }

  /**
   * 特定のパターンに一致するキーを取得
   * @param pattern 正規表現パターン
   */
  public getKeysByPattern(pattern: RegExp): string[] {
    return this.cache.keys().filter(key => pattern.test(key));
  }

  /**
   * 特定のパターンに一致するキーを削除
   * @param pattern 正規表現パターン
   */
  public delByPattern(pattern: RegExp): number {
    const keys = this.getKeysByPattern(pattern);
    return this.cache.del(keys);
  }

  /**
   * リソース解放
   */
  public close(): void {
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

export default CacheService;