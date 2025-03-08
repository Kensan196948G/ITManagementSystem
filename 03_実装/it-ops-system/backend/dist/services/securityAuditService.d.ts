interface AuditLogEntry {
    userId: string;
    action: string;
    resource: string;
    timestamp: number;
    success: boolean;
    details?: Record<string, any>;
}
interface AccessAttempt {
    userId: string;
    resource: string;
    timestamp: number;
    success: boolean;
    ipAddress: string;
}
export declare class SecurityAuditService {
    private static instance;
    private sqlite;
    private metrics;
    private permissionCheckDuration;
    private constructor();
    private initializeDatabase;
    private initializeMetrics;
    static getInstance(): SecurityAuditService;
    logAuditEvent(entry: AuditLogEntry): Promise<void>;
    logAccessAttempt(attempt: AccessAttempt): Promise<void>;
    getRecentAuditLogs(userId: string, minutes?: number): Promise<AuditLogEntry[]>;
    /**
     * 監査イベントを取得
     * @param filter フィルター条件
     */
    getAuditEvents(filter: {
        userId?: string;
        action?: string;
        resource?: string;
        success?: boolean;
        startTime?: Date;
        endTime?: Date;
    }): Promise<AuditLogEntry[]>;
    getRecentAccessAttempts(userId: string, minutes?: number): Promise<AccessAttempt[]>;
    /**
     * アクセス試行履歴を取得
     * @param filter フィルター条件
     */
    getAccessAttempts(filter: {
        userId?: string;
        ipAddress?: string;
        resource?: string;
        success?: boolean;
        startTime?: Date;
        endTime?: Date;
    }): Promise<AccessAttempt[]>;
    startPermissionCheck(resource: string, action: string): () => void;
    /**
     * セキュリティメトリクスを取得
     * @param filter フィルター条件
     */
    getSecurityMetrics(filter?: {
        startTime?: Date;
        endTime?: Date;
    }): Promise<{
        totalEvents: number;
        failedAttempts: number;
        successRate: number;
        recentFailures?: {
            timestamp: number;
            resource: string;
        }[];
    }>;
}
export {};
//# sourceMappingURL=securityAuditService.d.ts.map