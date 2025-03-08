/**
 * Graph APIパーミッションの型定義
 */
export interface GraphPermission {
  id: string;
  value: string;
  type: 'Delegated' | 'Application';
  description?: string;
  displayName?: string;
}

/**
 * パーミッション監査ログの型定義
 */
export interface PermissionAuditLog {
  id?: number;
  timestamp: string;
  userEmail: string;
  operatorEmail: string;
  action: 'grant' | 'revoke' | 'list';
  permission?: string;
  permissionType?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * IT運用情報の概要の型定義
 */
export interface OperationsSummary {
  totalAvailablePermissions: number;
  delegatedPermissions: number;
  applicationPermissions: number;
  commonPermissions: {
    name: string;
    description?: string;
    type: string;
  }[];
  lastUpdated: string;
}

/**
 * パーミッション操作結果の型定義
 */
export interface PermissionOperationResult {
  success: boolean;
  message: string;
  details?: any;
}