export declare class AuditError extends Error {
    code: string;
    statusCode: number;
    details?: any | undefined;
    constructor(message: string, code: string, statusCode?: number, details?: any | undefined);
}
export declare class AuditValidationError extends AuditError {
    constructor(message: string, details?: any);
}
export declare class AuditPermissionError extends AuditError {
    constructor(message: string);
}
export declare class AuditNotFoundError extends AuditError {
    constructor(message: string);
}
export declare class AuditDatabaseError extends AuditError {
    constructor(message: string, details?: any);
}
//# sourceMappingURL=AuditError.d.ts.map