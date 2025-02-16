import request from 'supertest';
import { Express } from 'express';
import {
  M365User,
  M365License,
  M365UserCreateDto,
  M365UserUpdateDto
} from '../../types/system';
import {
  mockRequest,
  mockResponse,
  createTestToken,
  createTestUser,
} from '../setup';
import app from '../../index';

describe('Microsoft 365 Routes', () => {
  let testToken: string;

  beforeEach(async () => {
    const testUser = await createTestUser();
    testToken = createTestToken({ id: testUser.id });
  });

  describe('GET /m365/users', () => {
    it('認証済みユーザーがM365ユーザー一覧を取得できる', async () => {
      const response = await request(app)
        .get('/api/m365/users')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('認証なしでアクセスするとエラーになる', async () => {
      const response = await request(app).get('/api/m365/users');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  describe('POST /m365/users', () => {
    const newUser: M365UserCreateDto = {
      displayName: 'Test User 1',
      email: 'testuser1@example.com',
      password: 'TestPass123!',
      licenses: ['license-1'],
      accountEnabled: true
    };

    it('正常なユーザー作成リクエストが成功する', async () => {
      const response = await request(app)
        .post('/api/m365/users')
        .set('Authorization', `Bearer ${testToken}`)
        .send(newUser);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'User created successfully');
    });

    it('必須フィールドが不足している場合はエラーになる', async () => {
      const invalidUser = {
        displayName: 'Test User 1',
        accountEnabled: true
      };

      const response = await request(app)
        .post('/api/m365/users')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  describe('PUT /m365/users/:id', () => {
    const updateData: M365UserUpdateDto = {
      displayName: 'Updated Test User',
      accountEnabled: false
    };

    it('ユーザー情報の更新が成功する', async () => {
      const response = await request(app)
        .put('/api/m365/users/test-user-1')
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'User updated successfully');
    });
  });

  describe('GET /m365/licenses', () => {
    it('ライセンス一覧の取得が成功する', async () => {
      const response = await request(app)
        .get('/api/m365/licenses')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /m365/users/:userId/services/:serviceId', () => {
    it('サービスの有効化が成功する', async () => {
      const serviceToggle = {
        enabled: true
      };

      const response = await request(app)
        .post('/api/m365/users/test-user-1/services/service-1')
        .set('Authorization', `Bearer ${testToken}`)
        .send(serviceToggle);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Service enabled successfully');
    });

    it('サービスの無効化が成功する', async () => {
      const serviceToggle = {
        enabled: false
      };

      const response = await request(app)
        .post('/api/m365/users/test-user-1/services/service-1')
        .set('Authorization', `Bearer ${testToken}`)
        .send(serviceToggle);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Service disabled successfully');
    });

    it('存在しないサービスIDでリクエストするとエラーになる', async () => {
      const serviceToggle = {
        enabled: true
      };

      const response = await request(app)
        .post('/api/m365/users/test-user-1/services/invalid-service')
        .set('Authorization', `Bearer ${testToken}`)
        .send(serviceToggle);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
    });
  });
});