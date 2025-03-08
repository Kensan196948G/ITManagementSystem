export class AuditError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'AuditError';
  }
}

export class AuditValidationError extends AuditError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'AuditValidationError';
  }
}

export class AuditPermissionError extends AuditError {
  constructor(message: string) {
    super(message, 'PERMISSION_DENIED', 403);
    this.name = 'AuditPermissionError';
  }
}

export class AuditNotFoundError extends AuditError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'AuditNotFoundError';
  }
}

export class AuditDatabaseError extends AuditError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', 500, details);
    this.name = 'AuditDatabaseError';
  }
}