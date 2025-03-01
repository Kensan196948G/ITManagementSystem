import { LogEntry } from '../types/system';
import 'winston-daily-rotate-file';
declare class LoggingService {
    private static instance;
    private logger;
    private constructor();
    private initializeLogger;
    static getInstance(): LoggingService;
    logAccess(data: {
        userId: string;
        action: string;
        resource: string;
        ip: string;
        userAgent: string;
        result: 'success' | 'failure';
        details?: any;
    }): void;
    logSecurity(data: {
        userId: string;
        event: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        details: any;
    }): void;
    logError(error: Error, context?: any): void;
    logMetric(data: {
        metric: string;
        value: number;
        unit: string;
        tags?: Record<string, string>;
    }): void;
    queryLogs(_options?: {
        startDate: Date;
        endDate: Date;
        type?: string;
        level?: string;
        limit?: number;
        skip?: number;
    }): Promise<LogEntry[]>;
}
export default LoggingService;
//# sourceMappingURL=loggingService.d.ts.map