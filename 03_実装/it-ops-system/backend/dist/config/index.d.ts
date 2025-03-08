/**
 * 設定オブジェクト
 */
export declare const config: {
    server: {
        port: number;
        env: string;
        logLevel: string;
        corsOrigin: string;
    };
    database: {
        path: string;
        poolSize: number;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    graphApi: {
        tenantId: string;
        clientId: string;
        clientSecret: string;
    };
    logging: {
        dir: string;
        maxSize: string;
        maxFiles: number;
        securityLogEnabled: boolean;
    };
    monitoring: {
        resourceCheckInterval: number;
        cpuThreshold: number;
        memoryThreshold: number;
        diskThreshold: number;
    };
    autoRecovery: {
        enabled: boolean;
        maxRetries: number;
        retryInterval: number;
    };
    autoBackup: {
        enabled: boolean;
        interval: number;
        maxBackups: number;
        path: string;
    };
    autoOptimize: {
        enabled: boolean;
        interval: number;
        vacuumThreshold: number;
    };
    security: {
        maxLoginAttempts: number;
        lockoutDuration: number;
        passwordMinLength: number;
        passwordRequireUppercase: boolean;
        passwordRequireNumbers: boolean;
        passwordRequireSymbols: boolean;
        sessionTimeout: number;
    };
    notification: {
        enabled: boolean;
        wsPort: number;
    };
};
export default config;
//# sourceMappingURL=index.d.ts.map