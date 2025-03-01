export interface Alert {
    id: string;
    type: string;
    source: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    acknowledged: boolean;
    metadata?: Record<string, any>;
}
export interface SystemMetrics {
    cpu: {
        usage: number;
        temperature?: number;
        cores?: Array<{
            id: number;
            usage: number;
            temperature?: number;
        }>;
    };
    memory: {
        total: number;
        used: number;
        free: number;
        swapTotal?: number;
        swapUsed?: number;
    };
    disk: {
        total: number;
        used: number;
        free: number;
        readBytes?: number;
        writeBytes?: number;
        iops?: number;
    };
    network: {
        bytesIn: number;
        bytesOut: number;
        packetsIn: number;
        packetsOut: number;
        connections: number;
        activeConnections?: number;
        errorRate?: number;
    };
    process?: {
        count: number;
        threads: number;
        activeWorkers: number;
    };
}
//# sourceMappingURL=monitoring.d.ts.map