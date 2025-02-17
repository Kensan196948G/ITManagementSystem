import { 
  ADUser, 
  ADGroup, 
  M365User, 
  M365License,
  SystemMetrics,
  Alert,
  LogEntry
} from '../../types/system';

// Active Directory モックデータ
export const mockADUsers: ADUser[] = [
  {
    sAMAccountName: 'user1',
    displayName: 'User One',
    mail: 'user1@example.com',
    department: 'IT',
    title: 'Engineer',
    whenCreated: new Date('2024-01-01'),
    whenChanged: new Date('2024-02-01'),
    lastLogon: new Date('2024-02-15'),
    memberOf: ['IT-Group', 'Developers']
  },
  {
    sAMAccountName: 'user2',
    displayName: 'User Two',
    mail: 'user2@example.com',
    department: 'HR',
    title: 'Manager',
    whenCreated: new Date('2024-01-01'),
    whenChanged: new Date('2024-02-01'),
    lastLogon: new Date('2024-02-15'),
    memberOf: ['HR-Group']
  }
];

export const mockADGroups: ADGroup[] = [
  {
    cn: 'IT-Group',
    description: 'IT Department Group',
    groupType: 'Security',
    member: ['user1']
  },
  {
    cn: 'HR-Group',
    description: 'HR Department Group',
    groupType: 'Security',
    member: ['user2']
  }
];

// Microsoft 365 モックデータ
export const mockM365Users: M365User[] = [
  {
    id: 'user1-id',
    displayName: 'User One',
    email: 'user1@example.com',
    accountEnabled: true,
    licenses: ['E3-License'],
    assignedServices: ['Exchange', 'Teams', 'OneDrive']
  },
  {
    id: 'user2-id',
    displayName: 'User Two',
    email: 'user2@example.com',
    accountEnabled: true,
    licenses: ['E5-License'],
    assignedServices: ['Exchange', 'Teams', 'OneDrive', 'Power BI']
  }
];

export const mockM365Licenses: M365License[] = [
  {
    id: 'E3-License',
    name: 'Microsoft 365 E3',
    totalQuantity: 100,
    consumedQuantity: 50,
    skuId: 'e3-sku-id',
    services: ['Exchange', 'Teams', 'OneDrive']
  },
  {
    id: 'E5-License',
    name: 'Microsoft 365 E5',
    totalQuantity: 50,
    consumedQuantity: 25,
    skuId: 'e5-sku-id',
    services: ['Exchange', 'Teams', 'OneDrive', 'Power BI']
  }
];

// システム監視モックデータ
export const mockMetrics: SystemMetrics = {
  timestamp: new Date(),
  cpu: {
    usage: 45.5,
    temperature: 65,
    cores: [
      { id: 0, usage: 40 },
      { id: 1, usage: 51 }
    ]
  },
  memory: {
    total: 16000000000,
    used: 8000000000,
    free: 8000000000
  },
  disk: {
    total: 1000000000000,
    used: 600000000000,
    free: 400000000000
  },
  network: {
    bytesIn: 1000000,
    bytesOut: 500000,
    connections: 125
  }
};

export const mockAlerts: Alert[] = [
  {
    id: 'alert1',
    type: 'critical',
    message: 'High CPU Usage',
    source: 'System',
    timestamp: new Date(),
    acknowledged: false
  },
  {
    id: 'alert2',
    type: 'warning',
    message: 'Low Disk Space',
    source: 'Storage',
    timestamp: new Date(),
    acknowledged: false
  }
];

export const mockLogs: LogEntry[] = [
  {
    id: 'log1',
    timestamp: new Date(),
    level: 'error',
    source: 'System',
    message: 'Service crashed',
    metadata: { service: 'auth' }
  },
  {
    id: 'log2',
    timestamp: new Date(),
    level: 'info',
    source: 'Security',
    message: 'User login',
    metadata: { userId: 'user1' }
  }
];