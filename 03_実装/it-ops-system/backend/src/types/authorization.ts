/**
 * 権限レベルの列挙型 - フロントエンドの AuthorizationLevel と一致させる
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