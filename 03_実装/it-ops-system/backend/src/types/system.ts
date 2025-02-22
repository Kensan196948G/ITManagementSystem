// Active Directory関連の型
export interface ADUser {
  sAMAccountName: string;
  displayName: string;
  mail: string;
  department?: string;
  title?: string;
  manager?: string;
  whenCreated?: Date;
  whenChanged?: Date;
  lastLogon?: Date;
  memberOf?: string[];
}

export interface ADGroup {
  cn: string;
  description?: string;
  groupType: string;
  member?: string[];
}

// Microsoft 365関連の型
export interface M365User {
  id: string;
  displayName: string;
  email: string;
  accountEnabled: boolean;
  licenses: string[];
  assignedServices: string[];
  lastSignIn?: Date;
}

export interface M365License {
  id: string;
  name: string;
  totalQuantity: number;
  consumedQuantity: number;
  skuId: string;
  services: string[];
}

// システム監視関連の型
export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    temperature: number;
    cores: Array<{
      id: number;
      usage: number;
    }>;
  };
  memory: {
    total: number;
    used: number;
    free: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connections: number;
  };
}

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error';
  source: string;
  message: string;
  metadata: Record<string, any>;
}

export interface SystemError extends Error {
  code?: string;
  details?: any;
}

export interface AuthUser {
  id: string;
  username: string;
  roles: string[];
}

// セキュリティ関連の型
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // パスワードの有効期限（日数）
  preventReuse: number; // 過去のパスワード再利用防止数
}

export interface SecurityConfig {
  rateLimit: {
    windowMs: number; // 制限時間（ミリ秒）
    max: number; // 最大リクエスト数
    message: string;
  };
  session: {
    expiresIn: string; // トークンの有効期限
    maxConcurrentSessions: number; // 同時セッション数の制限
  };
}

export interface TokenBlacklist {
  token: string;
  expiresAt: Date;
  userId: string;
  reason: 'logout' | 'password_change' | 'security_breach';
}

// DTOインターフェース
export interface ADUserCreateDto {
  sAMAccountName: string;
  displayName: string;
  mail: string;
  department?: string;
  title?: string;
}

export interface ADUserUpdateDto {
  displayName?: string;
  department?: string;
  title?: string;
}

export interface ADGroupCreateDto {
  cn: string;
  description?: string;
}

export interface ADGroupUpdateDto {
  description?: string;
}

export interface M365UserCreateDto {
  displayName: string;
  email: string;
  password: string;
  accountEnabled: boolean;
  licenses: string[];
}

export interface M365UserUpdateDto {
  displayName?: string;
  accountEnabled?: boolean;
  licenses?: string[];
}

export interface M365LicenseCreateDto {
  skuId: string;
  quantity: number;
}

export interface M365LicenseUpdateDto {
  quantity: number;
}

export interface ServiceToggleDto {
  enabled: boolean;
}