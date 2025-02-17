import request from 'supertest';
import { Client } from '@microsoft/microsoft-graph-client';
import { mockRequest, mockResponse, createTestToken } from '../setup';
import app from '../../index';

// Microsoft Graph Clientのモック
jest.mock('@microsoft/microsoft-graph-client');

describe('Microsoft 365 Routes', () => {
  let testToken: string;

  beforeEach(() => {
    testToken = createTestToken({ id: 'test-user-id', roles: ['admin'] });
    jest.clearAllMocks();
  });

  describe('GET /m365/users', () => {
    const mockUsers = [
      {
        id: 'user1',
        displayName: 'User One',
        userPrincipalName: 'user1@example.com',
        accountEnabled: true,
        assignedLicenses: [{ skuId: 'license1' }],
        signInActivity: { lastSignInDateTime: new Date().toISOString() },
      },
      {
        id: 'user2',
        displayName: 'User Two',
        userPrincipalName: 'user2@example.com',
        accountEnabled: true,
        assignedLicenses: [{ skuId: 'license2' }],
        signInActivity: { lastSignInDateTime: new Date().toISOString() },
      },
    ];

    it('ユーザー一覧の取得 - 成功', async () => {
      (Client.init as jest.Mock).mockImplementation(() => ({
        api: () => ({
          select: () => ({
            get: async () => ({ value: mockUsers }),
          }),
        }),
      }));

      const response = await request(app)
        .get('/api/m365/users')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toBeDefined();
    });

    it('ユーザー一覧の取得 - Graph APIエラー', async () => {
      (Client.init as jest.Mock).mockImplementation(() => ({
        api: () => ({
          select: () => ({
            get: async () => {
              throw new Error('Graph API error');
            },
          }),
        }),
      }));

      const response = await request(app)
        .get('/api/m365/users')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('code', 'M365_ERROR');
    });
  });

  describe('POST /m365/users', () => {
    const mockUserData = {
      displayName: 'New User',
      email: 'newuser@example.com',
      password: 'Password123!',
      accountEnabled: true,
      licenses: ['license1'],
    };

    it('ユーザー作成 - 成功', async () => {
      (Client.init as jest.Mock).mockImplementation(() => ({
        api: () => ({
          post: async () => ({ id: 'new-user-id' }),
        }),
      }));

      const response = await request(app)
        .post('/api/m365/users')
        .set('Authorization', `Bearer ${testToken}`)
        .send(mockUserData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'User created successfully');
    });

    it('ユーザー作成 - バリデーションエラー', async () => {
      const response = await request(app)
        .post('/api/m365/users')
        .set('Authorization', `Bearer ${testToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  describe('GET /m365/licenses', () => {
    const mockLicenses = [
      {
        skuId: 'license1',
        skuPartNumber: 'E3',
        consumedUnits: 50,
        prepaidUnits: { enabled: 100 },
      },
      {
        skuId: 'license2',
        skuPartNumber: 'E5',
        consumedUnits: 25,
        prepaidUnits: { enabled: 50 },
      },
    ];

    it('ライセンス一覧の取得 - 成功', async () => {
      (Client.init as jest.Mock).mockImplementation(() => ({
        api: () => ({
          select: () => ({
            get: async () => ({ value: mockLicenses }),
          }),
        }),
      }));

      const response = await request(app)
        .get('/api/m365/licenses')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toBeDefined();
    });
  });

  describe('POST /m365/users/:userId/services/:serviceId', () => {
    it('サービス有効化 - 成功', async () => {
      (Client.init as jest.Mock).mockImplementation(() => ({
        api: () => ({
          patch: async () => ({}),
        }),
      }));

      const response = await request(app)
        .post('/api/m365/users/user1/services/Teams')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Service enabled successfully');
    });

    it('サービス有効化 - Graph APIエラー', async () => {
      (Client.init as jest.Mock).mockImplementation(() => ({
        api: () => ({
          patch: async () => {
            throw new Error('Graph API error');
          },
        }),
      }));

      const response = await request(app)
        .post('/api/m365/users/user1/services/Teams')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ enabled: true });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('code', 'M365_ERROR');
    });
  });
});