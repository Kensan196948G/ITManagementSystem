/**
 * システムステータス情報の型定義
 */
export interface SystemStatus {
    status: 'healthy' | 'degraded' | 'critical';
    components: {
        database: {
            status: 'healthy' | 'degraded' | 'critical';
            message?: string;
        };
        api: {
            status: 'healthy' | 'degraded' | 'critical';
            message?: string;
        };
        filesystem: {
            status: 'healthy' | 'degraded' | 'critical';
            message?: string;
        };
        memory: {
            status: 'healthy' | 'degraded' | 'critical';
            message?: string;
            usage: number;
        };
    };
    lastChecked: string;
}
/**
 * セキュリティアラート情報の型定義
 */
export interface SecurityAlert {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    message: string;
    source: string;
    timestamp: string;
    status: 'active' | 'acknowledged' | 'resolved';
    details?: any;
}
/**
 * システムステータスサービス
 * システムの状態、リソース使用状況、セキュリティアラートなどの情報を提供
 */
export declare class SystemStatusService {
    private sqliteService;
    constructor();
    /**
     * システムステータス情報を取得
     */
    getSystemStatus(): Promise<SystemStatus>;
    /**
     * セキュリティアラート情報を取得
     */
    getSecurityAlerts(): Promise<SecurityAlert[]>;
}
//# sourceMappingURL=systemStatusService.d.ts.map