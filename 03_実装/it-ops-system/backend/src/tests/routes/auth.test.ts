import request from 'supertest';
import { Express } from 'express';
import jwt from 'jsonwebtoken';
import {
  mockRequest,
  mockResponse,
  createTestToken,
  createTestUser,
} from '../setup';
import { verifyToken } from '../../routes/auth';
import app from '../../index';

describe('Auth Routes', () => {
  let testUser: any;
  let testToken: string;

  beforeEach(async () => {
    testUser = await createTestUser();
    testToken = createTestToken(testUser.id);
  });

  describe('POST /auth/login', () => {
    it('正常なログイン - 有効な認証情報', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'validpassword',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
    });

    it('不正なログイン - 無効なユーザー名', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'invaliduser',
          password: 'validpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('不正なログイン - 無効なパスワード', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'invalidpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('status', 'error');
    });

    it('不正なリクエスト - パラメータ不足', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Username and password are required');
    });
  });

  describe('POST /auth/logout', () => {
    it('正常なログアウト', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });

    it('不正なログアウト - トークンなし', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'No token provided');
    });
  });

  describe('GET /auth/me', () => {
    it('ユーザー情報の取得 - 有効なトークン', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data.user).toHaveProperty('id', testUser.id);
    });

    it('ユーザー情報の取得失敗 - 無効なトークン', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });
  });

  describe('verifyToken Middleware', () => {
    it('有効なトークンの検証', () => {
      const req = mockRequest({
        headers: { authorization: `Bearer ${testToken}` },
      });
      const res = mockResponse();
      const next = jest.fn();

      verifyToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req).toHaveProperty('user');
    });

    it('トークンなしの検証', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No token provided',
      });
    });

    it('無効なトークンの検証', () => {
      const req = mockRequest({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const res = mockResponse();
      const next = jest.fn();

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid token',
      });
    });
  });
});