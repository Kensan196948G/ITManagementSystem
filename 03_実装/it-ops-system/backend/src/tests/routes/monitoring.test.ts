import request from 'supertest';
import { mockRequest, mockResponse, createTestToken } from '../setup';
import app from '../../index';
import { SystemMetrics, Alert, LogEntry } from '../../types/system';

// モニタリングサービスのモック
jest.mock('../../services/monitoring');

describe('Monitoring Routes', () => {
  let testToken: string;

  beforeEach(() => {
    testToken = createTestToken({ id: 'test-user-id', roles: ['admin'] });
    jest.clearAllMocks();
  });

  describe('GET /monitoring/metrics', () => {
    const mockMetrics: SystemMetrics = {
      timestamp: new Date(),
      cpu: {
        usage: 45.5,
        temperature: 65,
        cores: [
          { id: 0, usage: 40 },
          { id: 1, usage: 51 },
        ],
      },
      memory: {
        total: 16000000000,
        used: 8000000000,
        free: 8000000000,
      },
      disk: {
        total: 1000000000000,
        used: 600000000000,
        free: 400000000000,
      },
      network: {
        bytesIn: 1000000,
        bytesOut: 500000,
        connections: 125,
      },
    };

    it('システムメトリクスの取得 - 成功', async () => {
      jest.spyOn(require('../../services/monitoring'), 'getSystemMetrics')
        .mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/monitoring/metrics')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toEqual(mockMetrics);
    });

    it('システムメトリクスの取得 - エラー', async () => {
      jest.spyOn(require('../../services/monitoring'), 'getSystemMetrics')
        .mockRejectedValue(new Error('Metrics collection failed'));

      const response = await request(app)
        .get('/api/monitoring/metrics')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  describe('GET /monitoring/alerts', () => {
    const mockAlerts: Alert[] = [
      {
        id: 'alert1',
        type: 'critical',
        message: 'High CPU Usage',
        source: 'System',
        timestamp: new Date(),
        acknowledged: false,
      },
      {
        id: 'alert2',
        type: 'warning',
        message: 'Low Disk Space',
        source: 'Storage',
        timestamp: new Date(),
        acknowledged: false,
      },
    ];

    it('アクティブアラートの取得 - 成功', async () => {
      jest.spyOn(require('../../services/monitoring'), 'getActiveAlerts')
        .mockResolvedValue(mockAlerts);

      const response = await request(app)
        .get('/api/monitoring/alerts')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toEqual(mockAlerts);
    });

    it('アラート確認 - 成功', async () => {
      jest.spyOn(require('../../services/monitoring'), 'acknowledgeAlert')
        .mockResolvedValue(true);

      const response = await request(app)
        .post('/api/monitoring/alerts/alert1/acknowledge')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Alert acknowledged successfully');
    });
  });

  describe('GET /monitoring/logs', () => {
    const mockLogs: LogEntry[] = [
      {
        id: 'log1',
        timestamp: new Date(),
        level: 'error',
        source: 'System',
        message: 'Service crashed',
        metadata: { service: 'auth' },
      },
      {
        id: 'log2',
        timestamp: new Date(),
        level: 'info',
        source: 'Security',
        message: 'User login',
        metadata: { userId: 'user1' },
      },
    ];

    it('システムログの取得 - 成功', async () => {
      jest.spyOn(require('../../services/monitoring'), 'getSystemLogs')
        .mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/api/monitoring/logs')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toEqual(mockLogs);
    });

    it('ログのフィルタリング - 成功', async () => {
      jest.spyOn(require('../../services/monitoring'), 'getSystemLogs')
        .mockResolvedValue([mockLogs[0]]);

      const response = await request(app)
        .get('/api/monitoring/logs')
        .query({ level: 'error', source: 'System' })
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].level).toBe('error');
    });
  });

  describe('GET /monitoring/health', () => {
    const mockHealthStatus = {
      status: 'healthy',
      services: {
        database: 'up',
        cache: 'up',
        messageQueue: 'up',
      },
      lastCheck: new Date(),
    };

    it('システム健康状態の取得 - 成功', async () => {
      jest.spyOn(require('../../services/monitoring'), 'getHealthStatus')
        .mockResolvedValue(mockHealthStatus);

      const response = await request(app)
        .get('/api/monitoring/health')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toEqual(mockHealthStatus);
    });
  });

  describe('GET /monitoring/performance', () => {
    const mockPerformanceData = {
      responseTime: {
        avg: 150,
        max: 500,
        p95: 300,
      },
      throughput: {
        requests: 1000,
        successRate: 99.5,
      },
      errors: {
        count: 5,
        rate: 0.5,
      },
    };

    it('パフォーマンスメトリクスの取得 - 成功', async () => {
      jest.spyOn(require('../../services/monitoring'), 'getPerformanceMetrics')
        .mockResolvedValue(mockPerformanceData);

      const response = await request(app)
        .get('/api/monitoring/performance')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toEqual(mockPerformanceData);
    });
  });
});