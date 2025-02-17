import request from 'supertest';
import { Express } from 'express';
import { mockRequest, mockResponse, createTestToken } from '../setup';
import app from '../../index';
import ActiveDirectory from 'activedirectory2';
import { UserPayload } from '../../types/custom';

// ActiveDirectoryのモック
jest.mock('activedirectory2');

describe('AD Routes', () => {
  let testToken: string;

  beforeEach(() => {
    testToken = createTestToken({ id: 'test-user-id', roles: ['admin'] });
    jest.clearAllMocks();
  });

  describe('GET /ad/users', () => {
    const mockUsers = [
      {
        sAMAccountName: 'testuser1',
        displayName: 'Test User 1',
        mail: 'testuser1@example.com',
        department: 'IT',
      },
      {
        sAMAccountName: 'testuser2',
        displayName: 'Test User 2',
        mail: 'testuser2@example.com',
        department: 'HR',
      },
    ];

    it('ユーザー一覧の取得 - 成功', async () => {
      (ActiveDirectory as jest.Mock).mockImplementation(() => ({
        findUsers: (_query: any, callback: Function) => callback(null, mockUsers),
      }));

      const response = await request(app)
        .get('/api/ad/users')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toEqual(mockUsers);
    });

    it('ユーザー一覧の取得 - AD接続エラー', async () => {
      (ActiveDirectory as jest.Mock).mockImplementation(() => ({
        findUsers: (_query: any, callback: Function) => 
          callback(new Error('AD connection failed')),
      }));

      const response = await request(app)
        .get('/api/ad/users')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('code', 'AD_ERROR');
    });

    it('認証なしでのアクセス拒否', async () => {
      const response = await request(app).get('/api/ad/users');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'No token provided');
    });
  });

  describe('POST /ad/users', () => {
    const mockUserData = {
      sAMAccountName: 'newuser',
      displayName: 'New User',
      mail: 'newuser@example.com',
      department: 'IT',
    };

    it('ユーザー作成 - 成功', async () => {
      (ActiveDirectory as jest.Mock).mockImplementation(() => ({
        createUser: (_userData: any, callback: Function) => callback(null),
      }));

      const response = await request(app)
        .post('/api/ad/users')
        .set('Authorization', `Bearer ${testToken}`)
        .send(mockUserData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'User created successfully');
    });

    it('ユーザー作成 - バリデーションエラー', async () => {
      const response = await request(app)
        .post('/api/ad/users')
        .set('Authorization', `Bearer ${testToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  describe('PUT /ad/users/:samAccountName', () => {
    const mockUpdateData = {
      displayName: 'Updated User',
      department: 'Finance',
    };

    it('ユーザー更新 - 成功', async () => {
      (ActiveDirectory as jest.Mock).mockImplementation(() => ({
        updateUser: (_samAccountName: string, _userData: any, callback: Function) => 
          callback(null),
      }));

      const response = await request(app)
        .put('/api/ad/users/testuser')
        .set('Authorization', `Bearer ${testToken}`)
        .send(mockUpdateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'User updated successfully');
    });
  });

  describe('POST /ad/groups', () => {
    const mockGroupData = {
      cn: 'IT-Group',
      description: 'IT Department Group',
    };

    it('グループ作成 - 成功', async () => {
      (ActiveDirectory as jest.Mock).mockImplementation(() => ({
        createGroup: (_groupData: any, callback: Function) => callback(null),
      }));

      const response = await request(app)
        .post('/api/ad/groups')
        .set('Authorization', `Bearer ${testToken}`)
        .send(mockGroupData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Group created successfully');
    });
  });

  describe('POST /ad/groups/:name/members', () => {
    it('グループメンバー追加 - 成功', async () => {
      (ActiveDirectory as jest.Mock).mockImplementation(() => ({
        addUsersToGroup: (_groupName: string, _members: string[], callback: Function) => 
          callback(null),
      }));

      const response = await request(app)
        .post('/api/ad/groups/IT-Group/members')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          action: 'add',
          members: ['user1', 'user2'],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Members added to group successfully');
    });
  });
});