interface CpuInfo {
    usage: number;
    temperature: number;
}
interface MemoryInfo {
    total: number;
    used: number;
    free: number;
}
interface NetworkInfo {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
}
export declare function cpuUsage(): Promise<CpuInfo>;
export declare function memoryUsage(): Promise<MemoryInfo>;
export declare function networkStats(): Promise<NetworkInfo>;
export {};
//# sourceMappingURL=systemMetrics.d.ts.map