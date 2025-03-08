export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface NotificationTemplate {
  id: string;
  type: string;
  content: string;
  variables: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface NotificationChannelConfig {
  email?: string[];
  slack?: string[];
  webhook?: string[];
}

export interface NotificationResult {
  success: boolean;
  channel: 'email' | 'slack' | 'webhook';
  timestamp: Date;
  error?: string;
}