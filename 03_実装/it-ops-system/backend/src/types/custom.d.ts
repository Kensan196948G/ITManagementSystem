// 型定義ファイル

// ユーザーペイロード型
export interface UserPayload {
  id: string;
  username: string;
  roles: string[];
  email?: string;
  displayName?: string;
}

// データベースレコード型
export interface DatabaseRecord {
  [key: string]: any;
}

// システム通知型
export interface SystemNotification {
  id?: number;
  userId: string;
  userEmail: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  data?: any;
}

// アラート型
export interface Alert {
  id: string;
  type: string;
  source: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  severity?: 'critical' | 'error' | 'warning' | 'info';
  status?: 'new' | 'acknowledged' | 'resolved';
  assignedTo?: string;
}

// メール送信オプション型
export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// 通知オプション型
export interface NotificationOptions {
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  recipients: string[];
  metadata?: Record<string, any>;
}

// SQLiteサービス結果型
export interface SQLiteResult {
  lastID: number;
  changes: number;
}

// モック拡張用の型定義
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidTimestamp(): R;
      toBeValidEmail(): R;
    }
  }
}