import Redis from 'ioredis';
export declare class RedisService {
    private static instance;
    private client;
    private connectionStatusGauge;
    private memoryUsageGauge;
    private retryAttemptsGauge;
    private hits;
    private totalRequests;
    private cacheHitRatioGauge;
    private isUsingMock;
    private mockData;
    private constructor();
    private setupMockRedis;
    private setupMonitoring;
    static getInstance(): RedisService;
    getClient(): Redis;
    shutdown(): Promise<void>;
    isUsingMockImplementation(): boolean;
    healthCheck(): Promise<boolean>;
    disconnect(): Promise<void>;
    updateCacheMetrics(hit: boolean): void;
    private updateMemoryMetrics;
    set(key: string, value: string, expirationSeconds?: number): Promise<boolean>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    deletePattern(pattern: string): Promise<boolean>;
    isConnected(): Promise<boolean>;
    getCacheHitRatio(): Promise<number>;
    getRetryAttempts(): Promise<number>;
    getMetrics(): Promise<{
        connectionStatus: number;
        memoryUsageBytes: number;
        cacheHitRatio: number;
        retryAttempts: number;
    }>;
}
//# sourceMappingURL=redisService.d.ts.map