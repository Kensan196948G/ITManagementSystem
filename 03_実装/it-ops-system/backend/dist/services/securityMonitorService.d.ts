import { Alert } from '../types/system';
import { MetricAlert, AlertThresholds } from '../types/metrics';
export declare class SecurityMonitorService {
    private static instance;
    private sqlite;
    private notification;
    private isMonitoring;
    private monitoringInterval;
    private constructor();
    static getInstance(): SecurityMonitorService;
    startMonitoring(intervalMs?: number): Promise<void>;
    stopMonitoring(): void;
    private monitor;
    private checkForAnomalies;
    private isAnomalousCount;
    private getThresholdForSeverity;
    private processAlerts;
    getActiveAlerts(): Promise<Alert[]>;
    updateAlertThresholds(thresholds: AlertThresholds): Promise<void>;
    getRecentAttempts(): Promise<MetricAlert[]>;
}
//# sourceMappingURL=securityMonitorService.d.ts.map