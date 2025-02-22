import request from 'supertest';
import { createTestToken } from '../setup';
import app from '../../index';
import { ErrorCode } from '../../types/errors';

describe('エラーハンドリングテスト', () => {
  let testToken: string;

  beforeEach(() => {
    testToken = createTestToken({ id: 'test-user-id', roles: ['admin'] });
  });

  describe('バリデーションエラー', () => {
    it('必須フィールドの欠落時に適切なエラーを返す', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        status: 'error',
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: expect.any(String)
      });
    });

    it('無効なパスワードフォーマット時に詳細なエラーを返す', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'weak'
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        status: 'error',
        code: ErrorCode.VALIDATION_FAILED,
        message: expect.any(String),
        details: expect.objectContaining({
          requirements: expect.any(Object)
        })
      });
    });
  });

  describe('認証エラー', () => {
    it('無効なトークンで適切なエラーを返す', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        status: 'error',
        code: ErrorCode.AUTH_TOKEN_INVALID,
        message: expect.any(String)
      });
    });

    it('期限切れトークンで適切なエラーを返す', async () => {
      // 期限切れトークンを生成（1秒後に期限切れ）
      const expiredToken = createTestToken({ 
        id: 'test-user-id', 
        roles: ['admin']
      });

      // 2秒待機して期限切れにする
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        status: 'error',
        code: ErrorCode.AUTH_TOKEN_EXPIRED,
        message: expect.any(String)
      });
    });
  });

  describe('外部サービスエラー', () => {
    it('ADサービス接続エラー時に適切なエラーを返す', async () => {
      // ADサーバーが利用できない状態を模倣
      process.env.AD_URL = 'ldap://invalid-server:389';

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'ValidPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        status: 'error',
        code: ErrorCode.AD_CONNECTION_ERROR,
        message: expect.any(String)
      });

      // テスト後に環境変数を元に戻す
      process.env.AD_URL = 'ldap://your-ad-server:389';
    });
  });

  describe('エラーログ', () => {
    it('エラー発生時にログが記録される', async () => {
      const mockLogger = jest.spyOn(console, 'error');
      
      await request(app)
        .post('/api/auth/login')
        .send({});

      expect(mockLogger).toHaveBeenCalled();
      mockLogger.mockRestore();
    });
  });
});