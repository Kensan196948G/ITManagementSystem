export declare class AuditMetricsService {
    private static instance;
    private sqlite;
    private constructor();
    static getInstance(): AuditMetricsService;
    private initializeMetricsTable;
    recordMetric(name: string, value: number, labels?: Record<string, string>): Promise<void>;
    getMetrics(name: string, startTime?: Date, endTime?: Date): Promise<Array<{
        timestamp: Date;
        value: number;
        labels?: Record<string, string>;
    }>>;
    getAggregatedMetrics(name: string, aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count', interval: 'hour' | 'day' | 'week' | 'month', startTime?: Date, endTime?: Date): Promise<Array<{
        timestamp: Date;
        value: number;
    }>>;
}
//# sourceMappingURL=auditMetricsService.d.ts.map