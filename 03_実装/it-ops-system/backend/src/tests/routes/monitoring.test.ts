import request from 'supertest';
import express from 'express';
import monitoringRouter from '../../routes/monitoring';
import { SystemMetrics } from '../../types/custom';
import '../mocks/system-info';

// OSのモック
jest.mock('os', () => ({
  loadavg: () => [1.5, 1.0, 0.5],
  totalmem: () => 16000000000,
  freemem: () => 8000000000,
  platform: () => 'linux'
}));

// Expressアプリケーションのセットアップ
const setupApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/monitoring', monitoringRouter);
  
  // エラーハンドリング
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(500).json({ status: 'error', message: err.message });
  });
  
  return app;
};

describe('Monitoring Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = setupApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/monitoring/metrics', () => {
    it('should return system metrics', async () => {
      const response = await request(app).get('/api/monitoring/metrics');
      
      // ステータスコードとレスポンス形式のチェック
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      
      const metrics: SystemMetrics = response.body.data;
      
      // CPU使用率のテスト
      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.usage).toBeLessThanOrEqual(100);
      
      // メモリ使用率のテスト
      expect(metrics.memory.total).toBe(16000000000);
      expect(metrics.memory.free).toBe(8000000000);
      expect(metrics.memory.used).toBe(8000000000);
      
      // ディスク使用率のテスト
      expect(metrics.disk.total).toBeGreaterThan(0);
      expect(metrics.disk.used).toBeGreaterThanOrEqual(0);
      expect(metrics.disk.free).toBeGreaterThanOrEqual(0);
      
      // ネットワークトラフィックのテスト
      expect(metrics.network.bytesIn).toBeGreaterThanOrEqual(0);
      expect(metrics.network.bytesOut).toBeGreaterThanOrEqual(0);
      expect(metrics.network.packetsIn).toBeGreaterThanOrEqual(0);
      expect(metrics.network.packetsOut).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/monitoring/alerts', () => {
    it('should return empty alerts list', async () => {
      const response = await request(app).get('/api/monitoring/alerts');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/monitoring/logs', () => {
    it('should return empty logs list', async () => {
      const response = await request(app).get('/api/monitoring/logs');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });
});