/**
 * 権限レベル定数定義ファイル
 * システム内の権限レベルを明確に定義し、一貫した権限管理を実現します
 */

/**
 * 権限レベルの定義
 * - ユーザー種別によるアクセス制御に使用
 */
export enum AuthorizationLevel {
  // グローバル管理者のみがアクセス可能
  GLOBAL_ADMIN_ONLY = 'GLOBAL_ADMIN_ONLY',
  
  // 特定の管理者ロールを持つユーザーがアクセス可能
  ADMIN_ROLE = 'ADMIN_ROLE',
  
  // 一般ユーザー（適切なロールを持つ）がアクセス可能
  USER_ROLE = 'USER_ROLE',
  
  // すべての認証済みユーザーがアクセス可能
  AUTHENTICATED = 'AUTHENTICATED',
}

/**
 * リソース別の権限定義
 * - 各機能に対する細かな権限制御に使用
 */
export const ResourcePermissions = {
  // ダッシュボード関連
  DASHBOARD: {
    VIEW: 'dashboard:read',
    EDIT: 'dashboard:write',
    ADMIN: 'dashboard:admin',
  },
  
  // メトリクス関連
  METRICS: {
    VIEW: 'metrics:read',
    EDIT: 'metrics:write',
    ADMIN: 'metrics:admin',
  },
  
  // セキュリティ関連
  SECURITY: {
    VIEW: 'security:read',
    EDIT: 'security:write',
    ADMIN: 'security:admin',
  },
  
  // ユーザー管理関連
  USERS: {
    VIEW: 'users:read',
    EDIT: 'users:write',
    ADMIN: 'users:admin',
  },
  
  // システム設定関連
  SYSTEM: {
    VIEW: 'system:read',
    EDIT: 'system:write',
    ADMIN: 'system:admin',
  },
};

/**
 * グローバル管理者専用の機能ID一覧
 */
export const GlobalAdminFeatures: string[] = [
  // Microsoft Graph API関連
  'graph-api-permissions',
  'tenant-management',
  'license-management',
  'security-policies',
  
  // 監査・コンプライアンス関連
  'audit-logs-admin',
  'compliance-center',
  
  // システム構成関連
  'system-configuration',
  'api-integration-settings',
];

/**
 * 権限エラーメッセージ
 */
export const PermissionErrorMessages = {
  ACCESS_DENIED: 'アクセス権限がありません',
  ADMIN_REQUIRED: 'この操作には管理者権限が必要です',
  GLOBAL_ADMIN_REQUIRED: 'この操作にはグローバル管理者権限が必要です',
  FEATURE_DISABLED: 'この機能は現在使用できません',
  INSUFFICIENT_PERMISSIONS: '操作を実行するための十分な権限がありません',
  CONTACT_ADMIN: '必要な権限については管理者にお問い合わせください',
};

/**
 * 権限が必要なアクションの種類
 */
export enum PermissionActionType {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ADMIN = 'admin',
}

/**
 * 権限チェックのヘルパー関数
 * - 任意の権限リストの中に必要な権限があるかを確認
 * 
 * @param userPermissions ユーザーが持つ権限の配列
 * @param requiredPermission 必要な権限
 * @param isGlobalAdmin ユーザーがグローバル管理者かどうか
 * @returns 権限を持っているかどうか
 */
export const hasPermission = (
  userPermissions: string[],
  requiredPermission: string,
  isGlobalAdmin: boolean = false
): boolean => {
  // グローバル管理者はすべての権限を持つ
  if (isGlobalAdmin) return true;
  
  // 権限の直接マッチング
  if (userPermissions.includes(requiredPermission)) return true;
  
  // 上位権限の確認（例: write権限があればread権限も持つ）
  if (requiredPermission.endsWith(':read')) {
    const writeVersion = requiredPermission.replace(':read', ':write');
    const adminVersion = requiredPermission.replace(':read', ':admin');
    return userPermissions.includes(writeVersion) || userPermissions.includes(adminVersion);
  }
  
  // admin権限の確認（大きな権限）
  if (requiredPermission.endsWith(':write')) {
    const adminVersion = requiredPermission.replace(':write', ':admin');
    return userPermissions.includes(adminVersion);
  }
  
  // 必要な権限が見つからない場合
  return false;
};

/**
 * 権限変更の監査用アクションタイプ
 */
export enum AuditActionType {
  PERMISSION_GRANT = 'PERMISSION_GRANT',
  PERMISSION_REVOKE = 'PERMISSION_REVOKE',
  PERMISSION_MODIFY = 'PERMISSION_MODIFY',
  ROLE_ASSIGN = 'ROLE_ASSIGN',
  ROLE_REMOVE = 'ROLE_REMOVE',
  GROUP_ADD = 'GROUP_ADD',
  GROUP_REMOVE = 'GROUP_REMOVE',
  ADMIN_ESCALATION = 'ADMIN_ESCALATION',
  ADMIN_REVOCATION = 'ADMIN_REVOCATION',
}

/**
 * 権限変更を申請する際の理由種別
 */
export const PermissionChangeReasons = [
  { key: 'job_duty', label: '業務上必要なため' },
  { key: 'project_requirement', label: 'プロジェクト要件' },
  { key: 'role_change', label: '役職・役割の変更' },
  { key: 'temporary_access', label: '一時的なアクセス' },
  { key: 'security_requirement', label: 'セキュリティ要件' },
  { key: 'audit_recommendation', label: '監査での指摘' },
  { key: 'error_correction', label: '誤った設定の修正' },
  { key: 'other', label: 'その他' },
];

/**
 * 権限テスト用のリソース一覧
 */
export const TestableResources = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'metrics', label: 'メトリクス' },
  { key: 'security', label: 'セキュリティ' },
  { key: 'users', label: 'ユーザー管理' },
  { key: 'system', label: 'システム設定' },
];

/**
 * 権限テスト用のアクション一覧
 */
export const TestableActions = [
  { key: 'read', label: '表示' },
  { key: 'write', label: '編集' },
  { key: 'admin', label: '管理' },
];