import { ADUser, ADGroup, M365User, M365License } from '../../types/system';

// Active Directoryモックサービス
export const mockADService = {
  findUsers: jest.fn().mockImplementation(() => {
    return Promise.resolve([
      {
        id: 'user-1',
        samAccountName: 'testuser1',
        displayName: 'Test User 1',
        email: 'testuser1@example.com',
        department: 'IT',
        enabled: true,
        groups: ['TestGroup1']
      }
    ] as ADUser[]);
  }),

  findGroups: jest.fn().mockImplementation(() => {
    return Promise.resolve([
      {
        id: 'group-1',
        name: 'TestGroup1',
        description: 'Test Group 1',
        members: ['testuser1'],
        type: 'security',
        scope: 'global'
      }
    ] as ADGroup[]);
  }),

  createUser: jest.fn().mockImplementation(() => Promise.resolve(true)),
  updateUser: jest.fn().mockImplementation(() => Promise.resolve(true)),
  deleteUser: jest.fn().mockImplementation(() => Promise.resolve(true)),
  enableUser: jest.fn().mockImplementation(() => Promise.resolve(true)),
  disableUser: jest.fn().mockImplementation(() => Promise.resolve(true))
};

// Microsoft 365モックサービス
export const mockM365Service = {
  getUsers: jest.fn().mockImplementation(() => {
    return Promise.resolve([
      {
        id: 'user-1',
        displayName: 'Test User 1',
        email: 'testuser1@example.com',
        licenses: ['license-1'],
        accountEnabled: true,
        assignedServices: [
          { id: 'service-1', name: 'Exchange Online', status: 'enabled' }
        ]
      }
    ] as M365User[]);
  }),

  getLicenses: jest.fn().mockImplementation(() => {
    return Promise.resolve([
      {
        id: 'license-1',
        name: 'Microsoft 365 E3',
        skuId: 'sku-1',
        totalQuantity: 100,
        consumedQuantity: 50,
        services: [
          { id: 'service-1', name: 'Exchange Online', status: 'enabled' }
        ]
      }
    ] as M365License[]);
  }),

  assignLicense: jest.fn().mockImplementation(() => Promise.resolve(true)),
  removeLicense: jest.fn().mockImplementation(() => Promise.resolve(true)),
  enableService: jest.fn().mockImplementation(() => Promise.resolve(true)),
  disableService: jest.fn().mockImplementation(() => Promise.resolve(true))
};

// モニタリングサービスモック
export const mockMonitoringService = {
  getMetrics: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      cpu: {
        usage: 45.5,
        temperature: 65.0
      },
      memory: {
        total: 16000000000,
        used: 8000000000,
        free: 8000000000
      },
      disk: {
        total: 500000000000,
        used: 250000000000,
        free: 250000000000
      },
      network: {
        bytesIn: 1000000,
        bytesOut: 500000,
        packetsIn: 1000,
        packetsOut: 500
      },
      timestamp: new Date()
    });
  }),

  getAlerts: jest.fn().mockImplementation(() => {
    return Promise.resolve([
      {
        id: 'alert-1',
        type: 'warning',
        source: 'cpu',
        message: 'High CPU usage detected',
        timestamp: new Date(),
        acknowledged: false
      }
    ]);
  })
};

// セキュリティサービスモック
export const mockSecurityService = {
  getThreats: jest.fn().mockImplementation(() => {
    return Promise.resolve([
      {
        id: 'threat-1',
        type: 'malware',
        severity: 'high',
        status: 'active',
        detectedAt: new Date(),
        source: 'endpoint-protection'
      }
    ]);
  }),

  getPolicies: jest.fn().mockImplementation(() => {
    return Promise.resolve([
      {
        id: 'policy-1',
        name: 'Password Policy',
        type: 'authentication',
        settings: {
          minLength: 12,
          requireComplexity: true,
          expiryDays: 90
        },
        status: 'active'
      }
    ]);
  })
};

// モックサービスのリセット
export const resetMocks = () => {
  Object.values(mockADService).forEach(mock => {
    if (typeof mock === 'function') mock.mockClear();
  });
  Object.values(mockM365Service).forEach(mock => {
    if (typeof mock === 'function') mock.mockClear();
  });
  Object.values(mockMonitoringService).forEach(mock => {
    if (typeof mock === 'function') mock.mockClear();
  });
  Object.values(mockSecurityService).forEach(mock => {
    if (typeof mock === 'function') mock.mockClear();
  });
};