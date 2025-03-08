import { axiosInstance } from './api';
import { GraphPermission, PermissionAuditLog, OperationsSummary } from '../types/graphPermission';

export const graphPermissionApi = {
  /**
   * 利用可能なGraph APIパーミッション一覧を取得
   */
  getAvailablePermissions: async (): Promise<GraphPermission[]> => {
    try {
      const response = await axiosInstance.get('/graph-permissions/available');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch available permissions:', error);
      return [];
    }
  },

  /**
   * ユーザーのGraph APIパーミッション一覧を取得
   * @param userEmail ユーザーのメールアドレス
   */
  getUserPermissions: async (userEmail: string): Promise<GraphPermission[]> => {
    try {
      const response = await axiosInstance.get(`/graph-permissions/users/${userEmail}`);
      return response.data.data || [];
    } catch (error) {
      console.error(`Failed to fetch permissions for user ${userEmail}:`, error);
      return [];
    }
  },

  /**
   * ユーザーにGraph APIパーミッションを付与（グローバル管理者のみ）
   * @param userEmail ユーザーのメールアドレス
   * @param permission パーミッション名
   * @param scope パーミッションのスコープ（'Delegated' または 'Application'）
   */
  grantPermission: async (
    userEmail: string,
    permission: string,
    scope: 'Delegated' | 'Application'
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await axiosInstance.post(`/graph-permissions/users/${userEmail}/grant`, {
        permission,
        scope
      });
      return {
        success: response.data.status === 'success',
        message: response.data.message
      };
    } catch (error) {
      console.error(`Failed to grant permission ${permission} to user ${userEmail}:`, error);
      return {
        success: false,
        message: error.response?.data?.message || 'パーミッション付与に失敗しました'
      };
    }
  },

  /**
   * ユーザーからGraph APIパーミッションを削除（グローバル管理者のみ）
   * @param userEmail ユーザーのメールアドレス
   * @param permission パーミッション名
   * @param scope パーミッションのスコープ（'Delegated' または 'Application'）
   */
  revokePermission: async (
    userEmail: string,
    permission: string,
    scope: 'Delegated' | 'Application'
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await axiosInstance.post(`/graph-permissions/users/${userEmail}/revoke`, {
        permission,
        scope
      });
      return {
        success: response.data.status === 'success',
        message: response.data.message
      };
    } catch (error) {
      console.error(`Failed to revoke permission ${permission} from user ${userEmail}:`, error);
      return {
        success: false,
        message: error.response?.data?.message || 'パーミッション削除に失敗しました'
      };
    }
  },

  /**
   * パーミッション監査ログの取得
   * @param userEmail 特定ユーザーのログのみを取得する場合はメールアドレスを指定
   * @param limit 取得する最大件数
   * @param offset オフセット
   */
  getAuditLogs: async (
    userEmail?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<PermissionAuditLog[]> => {
    try {
      const params: Record<string, any> = { limit, offset };
      if (userEmail) {
        params.userEmail = userEmail;
      }

      const response = await axiosInstance.get('/graph-permissions/audit-logs', { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
  },

  /**
   * IT運用情報の概要を取得
   */
  getOperationsSummary: async (): Promise<OperationsSummary | null> => {
    try {
      const response = await axiosInstance.get('/graph-permissions/operations-summary');
      return response.data.data || null;
    } catch (error) {
      console.error('Failed to fetch operations summary:', error);
      return null;
    }
  }
};