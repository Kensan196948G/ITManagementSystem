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
    getRecentAccessAttempts(userId: string, minutes?: number): Promise<AccessAttempt[]>;
    startPermissionCheck(resource: string, action: string): () => void;
}
export {};
//# sourceMappingURL=securityAuditService.d.ts.map