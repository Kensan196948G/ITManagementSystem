export declare const ErrorCode: {
    readonly AUTH_INVALID_CREDENTIALS: 1001;
    readonly AUTH_TOKEN_EXPIRED: 1002;
    readonly AUTH_TOKEN_INVALID: 1003;
    readonly AUTH_TOKEN_MISSING: 1004;
    readonly AUTH_SESSION_LIMIT: 1005;
    readonly AUTH_INSUFFICIENT_PERMISSIONS: 1006;
    readonly AD_CONNECTION_ERROR: 2001;
    readonly AD_USER_NOT_FOUND: 2002;
    readonly AD_GROUP_NOT_FOUND: 2003;
    readonly AD_OPERATION_FAILED: 2004;
    readonly M365_API_ERROR: 3001;
    readonly M365_LICENSE_NOT_AVAILABLE: 3002;
    readonly M365_USER_NOT_FOUND: 3003;
    readonly M365_OPERATION_FAILED: 3004;
    readonly DB_CONNECTION_ERROR: 4001;
    readonly DB_QUERY_FAILED: 4002;
    readonly DB_RECORD_NOT_FOUND: 4003;
    readonly DB_DUPLICATE_ENTRY: 4004;
    readonly VALIDATION_FAILED: 5001;
    readonly INVALID_PARAMETER: 5002;
    readonly MISSING_REQUIRED_FIELD: 5003;
    readonly INVALID_FORMAT: 5004;
    readonly MONITORING_SERVICE_ERROR: 6001;
    readonly METRICS_COLLECTION_ERROR: 6002;
    readonly ALERT_PROCESSING_ERROR: 6003;
    readonly LOG_PROCESSING_ERROR: 6004;
    readonly EXTERNAL_SERVICE_ERROR: 7001;
    readonly API_RATE_LIMIT_EXCEEDED: 7002;
    readonly NETWORK_ERROR: 7003;
    readonly TIMEOUT_ERROR: 7004;
    readonly INTERNAL_SERVER_ERROR: 9001;
    readonly UNEXPECTED_ERROR: 9999;
};
export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];
export interface AppError extends Error {
    code: ErrorCodeType;
    statusCode: number;
    details?: any;
    source?: string;
    timestamp: Date;
}
export declare class ApplicationError extends Error implements AppError {
    code: ErrorCodeType;
    statusCode: number;
    details?: any;
    source?: string;
    timestamp: Date;
    constructor(code: ErrorCodeType, message: string, statusCode?: number, details?: any);
    toJSON(): {
        status: string;
        code: ErrorCodeType;
        message: string;
        details: any;
        timestamp: Date;
    };
}
export declare class PermissionError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export declare class AuthenticationError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export declare const errorCodes: {
    readonly PERMISSION_DENIED: "PERMISSION_DENIED";
    readonly INVALID_TOKEN: "INVALID_TOKEN";
    readonly GROUP_NOT_FOUND: "GROUP_NOT_FOUND";
    readonly USER_NOT_FOUND: "USER_NOT_FOUND";
    readonly GRAPH_API_ERROR: "GRAPH_API_ERROR";
    readonly INVALID_SCOPE: "INVALID_SCOPE";
};
export type ErrorCode = typeof errorCodes[keyof typeof errorCodes];
export declare const createError: (code: ErrorCodeType, message?: string, statusCode?: number, details?: any) => ApplicationError;
//# sourceMappingURL=errors.d.ts.map