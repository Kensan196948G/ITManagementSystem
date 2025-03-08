import { SecurityAuditService } from '../securityAuditService';
import { SQLiteService } from '../sqliteService';
import { MetricsService } from '../metricsService';
import { LoggingService } from '../loggingService';
import { AuditEntry, AccessAttempt } from '../../types/audit';

jest.mock('../sqliteService');
jest.mock('../metricsService');
jest.mock('../loggingService');

describe('SecurityAuditService', () => {
  let securityAuditService: SecurityAuditService;
  let mockSQLite: jest.Mocked<SQLiteService>;
  let mockMetrics: jest.Mocked<MetricsService>;
  let mockLogger: jest.Mocked<LoggingService>;

  beforeEach(() => {
    mockSQLite = {
      run: jest.fn().mockResolvedValue({ lastID: 1 }),
      all: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue(null),
      exec: jest.fn().mockResolvedValue(undefined),
      getInstance: jest.fn().mockReturnThis()
    } as any;

    mockMetrics = {
      createHistogram: jest.fn(),
      createCounter: jest.fn(),
      observeHistogram: jest.fn(),
      getInstance: jest.fn().mockReturnThis()
    } as any;

    mockLogger = {
      logError: jest.fn(),
      logInfo: jest.fn(),
      getInstance: jest.fn().mockReturnThis()
    } as any;

    (SQLiteService as any).getInstance = jest.fn().mockReturnValue(mockSQLite);
    (MetricsService as any).getInstance = jest.fn().mockReturnValue(mockMetrics);
    (LoggingService as any).getInstance = jest.fn().mockReturnValue(mockLogger);

    securityAuditService = SecurityAuditService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('シングルトンインスタンスを返すこと', () => {
      const instance1 = SecurityAuditService.getInstance();
      const instance2 = SecurityAuditService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('logAuditEvent', () => {
    it('監査イベントを記録できること', async () => {
      const entry: AuditEntry = {
        userId: 'user123',
        action: 'login',
        resource: 'system',
        timestamp: Date.now(),
        success: true,
        details: { ip: '192.168.1.1' }
      };

      await securityAuditService.logAuditEvent(entry);
      expect(mockSQLite.run).toHaveBeenCalled();
      expect(mockLogger.logInfo).toHaveBeenCalled();
    });

    it('失敗した監査イベントを適切に処理すること', async () => {
      const entry: AuditEntry = {
        userId: 'user123',
        action: 'login',
        resource: 'system',
        timestamp: Date.now(),
        success: false,
        details: { error: 'Invalid credentials' }
      };

      await securityAuditService.logAuditEvent(entry);
      expect(mockLogger.logWarn).toHaveBeenCalled();
    });

    it('エラー発生時に適切に処理すること', async () => {
      mockSQLite.run.mockRejectedValueOnce(new Error('Database error'));

      const entry: AuditEntry = {
        userId: 'user123',
        action: 'login',
        resource: 'system',
        timestamp: Date.now(),
        success: true
      };

      await expect(securityAuditService.logAuditEvent(entry))
        .rejects.toThrow('Database error');
      expect(mockLogger.logError).toHaveBeenCalled();
    });
  });

  describe('logAccessAttempt', () => {
    it('アクセス試行を記録できること', async () => {
      const attempt: AccessAttempt = {
        userId: 'user123',
        resource: '/api/secure',
        timestamp: Date.now(),
        success: true,
        ipAddress: '192.168.1.1'
      };

      await securityAuditService.logAccessAttempt(attempt);
      expect(mockSQLite.run).toHaveBeenCalled();
    });

    it('失敗したアクセス試行を記録できること', async () => {
      const attempt: AccessAttempt = {
        userId: 'user123',
        resource: '/api/secure',
        timestamp: Date.now(),
        success: false,
        ipAddress: '192.168.1.1'
      };

      await securityAuditService.logAccessAttempt(attempt);
      expect(mockLogger.logWarn).toHaveBeenCalled();
    });
  });

  describe('getAuditEvents', () => {
    it('指定された期間の監査イベントを取得できること', async () => {
      const mockEvents = [
        {
          id: 1,
          userId: 'user123',
          action: 'login',
          timestamp: Date.now(),
          success: true
        }
      ];

      mockSQLite.all.mockResolvedValueOnce(mockEvents);

      const events = await securityAuditService.getAuditEvents({
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date()
      });

      expect(events).toEqual(mockEvents);
    });

    it('フィルター条件で監査イベントを絞り込めること', async () => {
      await securityAuditService.getAuditEvents({
        userId: 'user123',
        action: 'login',
        success: true
      });

      expect(mockSQLite.all).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining(['user123', 'login', 1])
      );
    });
  });

  describe('getAccessAttempts', () => {
    it('アクセス試行履歴を取得できること', async () => {
      const mockAttempts = [
        {
          id: 1,
          userId: 'user123',
          resource: '/api/secure',
          timestamp: Date.now(),
          success: true,
          ipAddress: '192.168.1.1'
        }
      ];

      mockSQLite.all.mockResolvedValueOnce(mockAttempts);

      const attempts = await securityAuditService.getAccessAttempts({
        userId: 'user123'
      });

      expect(attempts).toEqual(mockAttempts);
    });

    it('IPアドレスでアクセス試行を絞り込めること', async () => {
      await securityAuditService.getAccessAttempts({
        ipAddress: '192.168.1.1'
      });

      expect(mockSQLite.all).toHaveBeenCalledWith(
        expect.stringContaining('ip_address = ?'),
        expect.arrayContaining(['192.168.1.1'])
      );
    });
  });

  describe('getSecurityMetrics', () => {
    it('セキュリティメトリクスを取得できること', async () => {
      const mockMetrics = {
        totalEvents: 100,
        failedAttempts: 10,
        successRate: 0.9
      };

      mockSQLite.get
        .mockResolvedValueOnce({ count: 100 })
        .mockResolvedValueOnce({ count: 10 });

      const metrics = await securityAuditService.getSecurityMetrics();
      expect(metrics).toEqual(expect.objectContaining({
        totalEvents: expect.any(Number),
        failedAttempts: expect.any(Number),
        successRate: expect.any(Number)
      }));
    });

    it('期間を指定してメトリクスを取得できること', async () => {
      await securityAuditService.getSecurityMetrics({
        startTime: new Date(Date.now() - 86400000), // 24時間前
        endTime: new Date()
      });

      expect(mockSQLite.get).toHaveBeenCalledWith(
        expect.stringContaining('WHERE timestamp BETWEEN ? AND ?'),
        expect.any(Array)
      );
    });
  });
});