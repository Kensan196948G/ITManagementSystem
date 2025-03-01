export declare class PermissionCache {
    private static instance;
    private db;
    private config;
    private constructor();
    private initializeDatabase;
    static getInstance(): PermissionCache;
    private startCleanupInterval;
    private cleanupExpiredEntries;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl?: number): Promise<void>;
    private evictOldEntries;
    invalidate(key: string): Promise<void>;
    clear(): Promise<void>;
}
//# sourceMappingURL=permissionCache.d.ts.map