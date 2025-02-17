export interface SystemError extends Error {
    code?: string;
    details?: any;
}
export interface ADUser {
    id: string;
    samAccountName: string;
    displayName: string;
    email: string;
    department?: string;
    title?: string;
    manager?: string;
    enabled: boolean;
    lastLogon?: Date;
    passwordLastSet?: Date;
    groups: string[];
}
export interface ADGroup {
    id: string;
    name: string;
    description: string;
    members: string[];
    type: 'security' | 'distribution';
    scope: 'domainLocal' | 'global' | 'universal';
}
export interface M365License {
    id: string;
    name: string;
    totalQuantity: number;
    consumedQuantity: number;
    skuId: string;
    services: M365Service[];
}
export interface M365Service {
    id: string;
    name: string;
    status: 'enabled' | 'disabled' | 'pending';
}
export interface M365User {
    id: string;
    displayName: string;
    email: string;
    licenses: string[];
    assignedServices: M365Service[];
    accountEnabled: boolean;
    lastSignIn?: Date;
}
export interface SystemMetrics {
    cpu: {
        usage: number;
        temperature: number;
    };
    memory: {
        total: number;
        used: number;
        free: number;
    };
    disk: {
        total: number;
        used: number;
        free: number;
    };
    network: {
        bytesIn: number;
        bytesOut: number;
        packetsIn: number;
        packetsOut: number;
    };
    timestamp: Date;
}
export interface ApiResponse<T = any> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
    errors?: string[];
}
export interface AuthUser {
    id: string;
    username: string;
    displayName: string;
    email: string;
    roles: string[];
    permissions: string[];
}
export interface UserPayload {
    id: string;
    username: string;
    roles: string[];
    iat?: number;
    exp?: number;
}
export interface LoginCredentials {
    username: string;
    password: string;
}
export interface AuthToken {
    token: string;
    expiresIn: number;
}
export interface JwtPayload extends UserPayload {
    iat: number;
    exp: number;
}
export interface SystemStatus {
    healthy: boolean;
    services: {
        name: string;
        status: 'up' | 'down' | 'degraded';
        lastCheck: Date;
        details?: any;
    }[];
}
export interface SystemConfig {
    ad: {
        domain: string;
        server: string;
        searchBase: string;
        useTLS: boolean;
    };
    m365: {
        tenantId: string;
        clientId: string;
        defaultLicenses: string[];
    };
    monitoring: {
        checkInterval: number;
        retentionDays: number;
        alertThresholds: {
            cpu: number;
            memory: number;
            disk: number;
        };
    };
}
//# sourceMappingURL=custom.d.ts.map