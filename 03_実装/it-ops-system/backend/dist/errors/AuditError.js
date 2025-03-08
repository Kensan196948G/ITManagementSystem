"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditDatabaseError = exports.AuditNotFoundError = exports.AuditPermissionError = exports.AuditValidationError = exports.AuditError = void 0;
class AuditError extends Error {
    constructor(message, code, statusCode = 400, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AuditError';
    }
}
exports.AuditError = AuditError;
class AuditValidationError extends AuditError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', 400, details);
        this.name = 'AuditValidationError';
    }
}
exports.AuditValidationError = AuditValidationError;
class AuditPermissionError extends AuditError {
    constructor(message) {
        super(message, 'PERMISSION_DENIED', 403);
        this.name = 'AuditPermissionError';
    }
}
exports.AuditPermissionError = AuditPermissionError;
class AuditNotFoundError extends AuditError {
    constructor(message) {
        super(message, 'NOT_FOUND', 404);
        this.name = 'AuditNotFoundError';
    }
}
exports.AuditNotFoundError = AuditNotFoundError;
class AuditDatabaseError extends AuditError {
    constructor(message, details) {
        super(message, 'DATABASE_ERROR', 500, details);
        this.name = 'AuditDatabaseError';
    }
}
exports.AuditDatabaseError = AuditDatabaseError;
//# sourceMappingURL=AuditError.js.map