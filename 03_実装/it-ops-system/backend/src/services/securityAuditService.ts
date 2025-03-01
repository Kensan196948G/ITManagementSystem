import { SQLiteService } from '../services/sqliteService';
import LoggingService from './loggingService';
import * as client from 'prom-client';
import { DatabaseRecord } from '../types/database';

const logger = LoggingService.getInstance();

interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  timestamp: number;
  success: boolean;
  details?: Record<string, any>;
}

interface AccessAttempt {
  userId: string;
  resource: string;
  timestamp: number;
  success: boolean;
  ipAddress: string;
}

interface AuditLogRow extends DatabaseRecord {
  user_id: string;
  action: string;
  resource: string;
  timestamp: number;
  success: number;
  details: string | null;
}

interface AccessAttemptRow extends DatabaseRecord {
  user_id: string;
  resource: string;
  timestamp: number;
  success: number;
  ip_address: string;
}

export class SecurityAuditService {
  private static instance: SecurityAuditService;
  private sqlite: SQLiteService;
  private metrics: typeof client;
  private permissionCheckDuration!: client.Histogram<string>;

  private constructor() {
    this.sqlite = SQLiteService.getInstance();
    this.metrics = client;
    this.initializeDatabase().catch(error => {
      logger.logError(error as Error, {
        context: 'SecurityAudit',
        message: 'Failed to initialize database'
      });
    });
    this.initializeMetrics();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await this.sqlite.exec(`
        BEGIN TRANSACTION;
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          resource TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          success INTEGER NOT NULL,
          details TEXT,
          CONSTRAINT idx_audit_user_time UNIQUE(user_id, timestamp)
        );
        CREATE TABLE IF NOT EXISTS access_attempts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          resource TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          success INTEGER NOT NULL,
          ip_address TEXT NOT NULL,
          CONSTRAINT idx_access_user_time UNIQUE(user_id, timestamp)
        );
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_access_timestamp ON access_attempts(timestamp);
        COMMIT;
      `);
    } catch (error) {
      await this.sqlite.exec('ROLLBACK;');
      logger.logError(error as Error, {
        context: 'SecurityAudit',
        message: 'Database initialization failed'
      });
      throw error;
    }
  }

  private initializeMetrics(): void {
    const { Histogram, register } = this.metrics;
    if (register.getSingleMetric('permission_check_duration_seconds')) {
      register.removeSingleMetric('permission_check_duration_seconds');
    }
    this.permissionCheckDuration = new Histogram({
      name: 'permission_check_duration_seconds',
      help: 'Duration of permission checks',
      labelNames: ['resource', 'action'],
      buckets: [0.1, 0.5, 1, 2, 5]
    });
  }

  public static getInstance(): SecurityAuditService {
    if (!SecurityAuditService.instance) {
      SecurityAuditService.instance = new SecurityAuditService();
    }
    return SecurityAuditService.instance;
  }

  public async logAuditEvent(entry: AuditLogEntry): Promise<void> {
    try {
      await this.sqlite.run(
        `INSERT INTO audit_logs (user_id, action, resource, timestamp, success, details)
         VALUES (?, ?, ?, ?, ?, ?)`,

        [
          entry.userId,
          entry.action,
          entry.resource,
          entry.timestamp,
          entry.success ? 1 : 0,
          entry.details ? JSON.stringify(entry.details) : null
        ]
      );
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SecurityAudit',
        message: 'Failed to log audit event',
        userId: entry.userId,
        action: entry.action,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  public async logAccessAttempt(attempt: AccessAttempt): Promise<void> {
    try {
      await this.sqlite.run(
        `INSERT INTO access_attempts (user_id, resource, timestamp, success, ip_address)
         VALUES (?, ?, ?, ?, ?)`,

        [
          attempt.userId,
          attempt.resource,
          attempt.timestamp,
          attempt.success ? 1 : 0,
          attempt.ipAddress
        ]
      );
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SecurityAudit',
        message: 'Failed to log access attempt',
        userId: attempt.userId,
        resource: attempt.resource,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  public async getRecentAuditLogs(userId: string, minutes: number = 60): Promise<AuditLogEntry[]> {
    try {
      const cutoffTime = Date.now() - minutes * 60 * 1000;
      const rows = await this.sqlite.all<AuditLogRow>(
        `SELECT * FROM audit_logs
         WHERE user_id = ? AND timestamp >= ?
         ORDER BY timestamp DESC
         LIMIT 1000`,
        [userId, cutoffTime]
      );

      return rows.map(row => ({
        userId: row.user_id,
        action: row.action,
        resource: row.resource,
        timestamp: row.timestamp,
        success: row.success === 1,
        details: row.details ? JSON.parse(row.details) : undefined
      }));
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SecurityAudit',
        message: 'Failed to retrieve audit logs',
        userId,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  public async getRecentAccessAttempts(userId: string, minutes: number = 60): Promise<AccessAttempt[]> {
    try {
      const cutoffTime = Date.now() - minutes * 60 * 1000;
      const rows = await this.sqlite.all<AccessAttemptRow>(
        `SELECT * FROM access_attempts
         WHERE user_id = ? AND timestamp >= ?
         ORDER BY timestamp DESC
         LIMIT 1000`,
        [userId, cutoffTime]
      );

      return rows.map(row => ({
        userId: row.user_id,
        resource: row.resource,
        timestamp: row.timestamp,
        success: row.success === 1,
        ipAddress: row.ip_address
      }));
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SecurityAudit',
        message: 'Failed to retrieve access attempts',
        userId,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  public startPermissionCheck(resource: string, action: string): () => void {
    const end = this.permissionCheckDuration.startTimer({ resource, action });
    return end;
  }
}