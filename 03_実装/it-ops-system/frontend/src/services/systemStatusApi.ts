import { axiosInstance } from './api';

/**
 * システムステータスAPIサービス
 * システムの状態、リソース使用状況、セキュリティアラートなどの情報を取得
 */
export const systemStatusApi = {
  /**
   * システムステータス情報を取得
   */
  getSystemStatus: async () => {
    try {
      const response = await axiosInstance.get('/system-status/status');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      throw error;
    }
  },

  /**
   * リソース使用状況を取得
   */
  getResourceUsage: async () => {
    try {
      const response = await axiosInstance.get('/system-status/resources');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch resource usage:', error);
      throw error;
    }
  },

  /**
   * セキュリティアラート情報を取得
   */
  getSecurityAlerts: async () => {
    try {
      const response = await axiosInstance.get('/system-status/security-alerts');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch security alerts:', error);
      throw error;
    }
  },

  /**
   * WebSocketを使用してリアルタイム通知を受信するためのURL生成
   * @param token 認証トークン
   */
  getWebSocketUrl: (token: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws?token=${token}`;
  }
};

export default systemStatusApi;