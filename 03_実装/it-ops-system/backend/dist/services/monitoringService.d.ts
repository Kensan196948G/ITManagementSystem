export declare class MonitoringService {
    private static instance;
    private metricsInterval;
    private readonly collectionInterval;
    private static readonly CPU_THRESHOLD;
    private static readonly MEMORY_THRESHOLD;
    private static readonly DISK_THRESHOLD;
    private constructor();
    static getInstance(): MonitoringService;
    startMetricsCollection(): void;
    stopMetricsCollection(): void;
    private collectSystemMetrics;
    private getCpuTemperature;
    private parseDiskInfo;
    private getNetworkStats;
    private getActiveConnections;
    private processMetrics;
    private createAndSendAlert;
    private checkAlerts;
}
//# sourceMappingURL=monitoringService.d.ts.map