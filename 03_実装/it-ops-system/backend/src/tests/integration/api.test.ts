import request from 'supertest';
import { createTestToken } from '../setup';
import app from '../../index';
import { mockMetrics, mockAlerts, mockLogs, mockADUsers, mockM365Users } from '../mocks/services';
import { SystemMetrics, Alert, LogEntry } from '../../types/system';

describe('API Integration Tests', () => {
  let testToken: string;

  beforeEach(() => {
    testToken = createTestToken({ id: 'test-user-id', roles: ['admin'] });
  });

  describe('認証フロー', () => {
    it('ログイン -> ユーザー情報取得 -> ログアウトのフロー', async () => {
      // ログイン
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'validpassword',
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('status', 'success');
      const token = loginResponse.body.data.token;

      // ユーザー情報取得
      const userResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(userResponse.status).toBe(200);
      expect(userResponse.body).toHaveProperty('status', 'success');
      expect(userResponse.body.data.user).toHaveProperty('username', 'testuser');

      // ログアウト
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body).toHaveProperty('status', 'success');
    });
  });

  describe('ダッシュボードデータフロー', () => {
    it('メトリクス、アラート、ログの同時取得', async () => {
      const responses = await Promise.all([
        request(app)
          .get('/api/monitoring/metrics')
          .set('Authorization', `Bearer ${testToken}`),
        request(app)
          .get('/api/monitoring/alerts')
          .set('Authorization', `Bearer ${testToken}`),
        request(app)
          .get('/api/monitoring/logs')
          .set('Authorization', `Bearer ${testToken}`),
      ]);

      // メトリクスの検証
      expect(responses[0].status).toBe(200);
      expect(responses[0].body.data).toBeDefined();
      expect(responses[0].body.data.cpu).toBeDefined();

      // アラートの検証
      expect(responses[1].status).toBe(200);
      expect(responses[1].body.data).toBeInstanceOf(Array);

      // ログの検証
      expect(responses[2].status).toBe(200);
      expect(responses[2].body.data).toBeInstanceOf(Array);
    });
  });

  describe('ユーザー管理フロー', () => {
    it('ADユーザー作成 -> M365ライセンス割り当て', async () => {
      // ADユーザー作成
      const adResponse = await request(app)
        .post('/api/ad/users')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          sAMAccountName: 'newuser',
          displayName: 'New User',
          mail: 'newuser@example.com',
          department: 'IT',
        });

      expect(adResponse.status).toBe(200);
      expect(adResponse.body).toHaveProperty('status', 'success');

      // M365ユーザー作成とライセンス割り当て
      const m365Response = await request(app)
        .post('/api/m365/users')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          displayName: 'New User',
          email: 'newuser@example.com',
          password: 'Password123!',
          accountEnabled: true,
          licenses: ['E3-License'],
        });

      expect(m365Response.status).toBe(200);
      expect(m365Response.body).toHaveProperty('status', 'success');
    });
  });

  describe('システム監視フロー', () => {
    it('アラート発生 -> 通知 -> 確認のフロー', async () => {
      // アラートの取得
      const alertsResponse = await request(app)
        .get('/api/monitoring/alerts')
        .set('Authorization', `Bearer ${testToken}`);

      expect(alertsResponse.status).toBe(200);
      const alerts = alertsResponse.body.data;
      const unacknowledgedAlert = alerts.find((a: Alert) => !a.acknowledged);

      if (unacknowledgedAlert) {
        // アラートの確認
        const ackResponse = await request(app)
          .post(`/api/monitoring/alerts/${unacknowledgedAlert.id}/acknowledge`)
          .set('Authorization', `Bearer ${testToken}`);

        expect(ackResponse.status).toBe(200);
        expect(ackResponse.body).toHaveProperty('status', 'success');

        // 更新後のアラート状態確認
        const updatedAlertsResponse = await request(app)
          .get('/api/monitoring/alerts')
          .set('Authorization', `Bearer ${testToken}`);

        expect(updatedAlertsResponse.status).toBe(200);
        const updatedAlert = updatedAlertsResponse.body.data
          .find((a: Alert) => a.id === unacknowledgedAlert.id);
        expect(updatedAlert.acknowledged).toBe(true);
      }
    });
  });

  describe('エラーハンドリング', () => {
    it('無効なトークンでのアクセス拒否', async () => {
      const responses = await Promise.all([
        request(app)
          .get('/api/monitoring/metrics')
          .set('Authorization', 'Bearer invalid-token'),
        request(app)
          .get('/api/ad/users')
          .set('Authorization', 'Bearer invalid-token'),
        request(app)
          .get('/api/m365/users')
          .set('Authorization', 'Bearer invalid-token'),
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('status', 'error');
      });
    });

    it('不正なリクエストパラメータのハンドリング', async () => {
      const responses = await Promise.all([
        request(app)
          .post('/api/ad/users')
          .set('Authorization', `Bearer ${testToken}`)
          .send({}),
        request(app)
          .post('/api/m365/users')
          .set('Authorization', `Bearer ${testToken}`)
          .send({}),
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('status', 'error');
      });
    });
  });
});