import Redis from 'ioredis';
declare module 'ioredis' {
    type RedisStatus = 'wait' | 'reconnecting' | 'connecting' | 'connect' | 'ready' | 'close' | 'end';
    interface Redis {
        status: RedisStatus;
        ping(): Promise<string>;
        quit(): Promise<'OK'>;
        info(section: string): Promise<string>;
    }
}
export declare class RedisService {
    private static instance;
    private client;
    private connectionStatusGauge;
    private memoryUsageGauge;
    private retryAttemptsGauge;
    private hits;
    private totalRequests;
    private cacheHitRatioGauge;
    private constructor();
    private setupMonitoring;
    static getInstance(): RedisService;
    getClient(): Redis;
    healthCheck(): Promise<boolean>;
    disconnect(): Promise<void>;
    updateCacheMetrics(hit: boolean): void;
    private updateMemoryMetrics;
    set(key: string, value: string, expirationSeconds?: number): Promise<boolean>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<boolean>;
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