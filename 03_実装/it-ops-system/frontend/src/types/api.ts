// システムメトリクス型定義
export interface SystemMetrics {
  cpu: {
    usage: number;
    temperature: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  redis: {
    connectionStatus: number;
    memoryUsageBytes: number;
    cacheHitRatio: number;
    retryAttempts: number;
  };
}

export type AlertType = 'critical' | 'error' | 'warning' | 'info';

// アラート型定義
export interface Alert {
  id: string;
  type: AlertType;
  source: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export type LogLevel = 'error' | 'warning' | 'info' | 'debug';

// ログエントリ型定義
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  source: string;
  message: string;
  metadata: Record<string, any>;
}

// API Response型定義
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: string[];
}

// メトリクスチャートのデータ型定義
export interface MetricsChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
  }[];
}

// チャートオプション型定義
export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  scales: {
    y: {
      beginAtZero: boolean;
      ticks: {
        callback: (value: number) => string;
      };
    };
  };
  plugins: {
    legend: {
      position: 'top' | 'bottom' | 'left' | 'right';
    };
    title: {
      display: boolean;
      text: string;
    };
  };
}

// ユーザー型定義
export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  roles: string[];
}

// 認証状態型定義
export interface AuthResponse {
  token: string;
  user: {
    username: string;
    displayName: string;
    email: string;
    groups: string[];
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// ログインフォーム型定義
export interface LoginFormData {
  username: string;
  password: string;
}

// Active Directory型定義
export interface ADUser {
  id: string;
  samAccountName: string;
  displayName: string;
  email: string;
  department: string;
  title: string;
  manager?: string;
  enabled: boolean;
  lastLogon?: Date;
  passwordLastSet?: Date;
  groups: string[];
}

export interface ADGroup {
  id: string;
  name: string;
  description: string;
  members: string[];
  type: 'security' | 'distribution';
  scope: 'domainLocal' | 'global' | 'universal';
}

// Microsoft 365型定義
export interface M365License {
  id: string;
  name: string;
  type: string;
  assignedCount: number;
  totalCount: number;
  status: 'active' | 'inactive';
}

export interface M365Service {
  id: string;
  name: string;
  status: 'enabled' | 'disabled' | 'pending';
}

export interface M365User {
  id: string;
  displayName: string;
  email: string;
  licenses: string[];
  assignedServices: M365Service[];
  accountEnabled: boolean;
  lastSignIn?: Date;
}

// システム管理設定型定義
export interface SystemSettings {
  adDomain: string;
  adServer: string;
  m365TenantId: string;
  defaultLicenses: string[];
  passwordPolicy: {
    minLength: number;
    complexity: boolean;
    expiryDays: number;
    historyCount: number;
  };
}