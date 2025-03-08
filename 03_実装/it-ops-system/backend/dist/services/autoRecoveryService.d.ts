export declare class AutoRecoveryService {
    private static instance;
    private sqlite;
    private logger;
    private notificationService;
    private metricsService;
    private isRecovering;
    private constructor();
    static getInstance(): AutoRecoveryService;
    private startHealthCheck;
    private checkDatabaseHealth;
    private checkPerformanceMetrics;
    private handleCorruptedIndexes;
    private handleLargeDatabase;
    private handleSlowQueries;
    private handleDatabaseError;
    private fileExists;
    private notifyRecoveryAction;
}
//# sourceMappingURL=autoRecoveryService.d.ts.map