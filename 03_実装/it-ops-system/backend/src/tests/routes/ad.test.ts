import request from 'supertest';
import { Express } from 'express';
import { ADUser, ADGroup } from '../../types/system';
import {
  mockRequest,
  mockResponse,
  createTestToken,
  createTestUser,
} from '../setup';
import app from '../../index';

describe('AD Routes', () => {
  let testToken: string;

  beforeEach(async () => {
    const testUser = await createTestUser();
    testToken = createTestToken({ id: testUser.id });
  });

  describe('GET /ad/users', () => {
    it('認証済みユーザーがADユーザー一覧を取得できる', async () => {
      const response = await request(app)
        .get('/api/ad/users')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('認証なしでアクセスするとエラーになる', async () => {
      const response = await request(app).get('/api/ad/users');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  describe('POST /ad/users', () => {
    const newUser = {
      samAccountName: 'testuser1',
      displayName: 'Test User 1',
      email: 'testuser1@example.com',
      department: 'IT',
      enabled: true,
      password: 'TestPass123!',
      groups: ['TestGroup']
    };

    it('正常なユーザー作成リクエストが成功する', async () => {
      const response = await request(app)
        .post('/api/ad/users')
        .set('Authorization', `Bearer ${testToken}`)
        .send(newUser);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'User created successfully');
    });

    it('必須フィールドが不足している場合はエラーになる', async () => {
      const invalidUser = {
        displayName: 'Test User 1',
        email: 'testuser1@example.com'
      };

      const response = await request(app)
        .post('/api/ad/users')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  describe('PUT /ad/users/:samAccountName', () => {
    it('ユーザー情報の更新が成功する', async () => {
      const updateData = {
        displayName: 'Updated Test User',
        department: 'Updated Department'
      };

      const response = await request(app)
        .put('/api/ad/users/testuser1')
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'User updated successfully');
    });
  });

  describe('GET /ad/groups', () => {
    it('グループ一覧の取得が成功する', async () => {
      const response = await request(app)
        .get('/api/ad/groups')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /ad/groups', () => {
    const newGroup = {
      name: 'TestGroup1',
      description: 'Test Group Description',
      type: 'security',
      scope: 'global',
      members: ['testuser1']
    };

    it('正常なグループ作成リクエストが成功する', async () => {
      const response = await request(app)
        .post('/api/ad/groups')
        .set('Authorization', `Bearer ${testToken}`)
        .send(newGroup);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Group created successfully');
    });
  });

  describe('PUT /ad/groups/:name', () => {
    it('グループ情報の更新が成功する', async () => {
      const updateData = {
        description: 'Updated Group Description',
        members: ['testuser1', 'testuser2']
      };

      const response = await request(app)
        .put('/api/ad/groups/TestGroup1')
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Group updated successfully');
    });
  });

  describe('POST /ad/groups/:name/members', () => {
    it('グループメンバーの追加が成功する', async () => {
      const memberAction = {
        action: 'add',
        members: ['testuser2']
      };

      const response = await request(app)
        .post('/api/ad/groups/TestGroup1/members')
        .set('Authorization', `Bearer ${testToken}`)
        .send(memberAction);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Members added to group successfully');
    });

    it('グループメンバーの削除が成功する', async () => {
      const memberAction = {
        action: 'remove',
        members: ['testuser2']
      };

      const response = await request(app)
        .post('/api/ad/groups/TestGroup1/members')
        .set('Authorization', `Bearer ${testToken}`)
        .send(memberAction);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Members removed from group successfully');
    });
  });
});