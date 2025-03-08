import axios from 'axios';
import { ApiResponse, AuthState, User, LoginFormData, Alert, LogEntry, AuthResponse } from '../types/api';

// 開発環境の判定
const isDevelopment = process.env.NODE_ENV === 'development';

// 環境変数からAPIのベースURLを取得
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

export const axiosInstance = axios.create({
  baseURL: '/api',  // /apiプレフィックスを維持
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 5000, // 5秒タイムアウト
  validateStatus: (status) => {
    return status >= 200 && status < 500; // 500エラーのみ例外として扱う
  },
});

// リクエストインターセプター
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (isDevelopment) {
      console.log(`[DEV] Requesting: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
axiosInstance.interceptors.response.use(
  (response) => {
    if (isDevelopment) {
      console.log(`[DEV] Response from ${response.config.url}:`, response.data);
    }
    return response;
  },
  async (error) => {
    if (isDevelopment) {
      console.error(`[DEV] API Error:`, error);
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  async login(credentials: LoginFormData): Promise<ApiResponse<AuthResponse>> {
    // 開発環境用のエンドポイント
    const endpoint = isDevelopment ? '/auth/dev/login' : '/auth/login';
    try {
      const response = await axiosInstance.post<ApiResponse<AuthResponse>>(endpoint, credentials);
      if (response.data?.data?.token) {
        localStorage.setItem('token', response.data.data.token);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async logout(): Promise<void> {
    await axiosInstance.post('/logout');
    localStorage.removeItem('token');
    delete axiosInstance.defaults.headers.common['Authorization'];
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await axiosInstance.get<ApiResponse<User>>('/me');
      return response.data.data || null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  },

  // 権限チェックAPIを拡張
  checkPermission: async (params: { userEmail: string; check: { resource: string; action: string } }): Promise<boolean> => {
    try {
      const response = await axiosInstance.post('/auth/check-permission', params);
      return response.data.hasPermission || false;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  },

  // ユーザーのロールと権限情報を取得
  getUserRoles: async (email: string) => {
    try {
      const response = await axiosInstance.get(`/auth/user-roles/${email}`);
      return {
        isGlobalAdmin: response.data.isGlobalAdmin || false,
        roles: response.data.roles || [],
        userGroups: response.data.userGroups || []
      };
    } catch (error) {
      console.error('Failed to fetch user roles:', error);
      return { isGlobalAdmin: false, roles: [], userGroups: [] };
    }
  },

  // Microsoftアカウントの権限状態を確認
  checkMicrosoftPermissions: async (email: string) => {
    try {
      const response = await axiosInstance.get(`/auth/ms-permissions/${email}`);
      return {
        status: response.data.status,
        permissions: response.data.permissions || [],
        missingPermissions: response.data.missingPermissions || [],
        accountStatus: response.data.accountStatus || 'unknown'
      };
    } catch (error) {
      console.error('Failed to check Microsoft permissions:', error);
      return { 
        status: 'error', 
        permissions: [], 
        missingPermissions: [],
        accountStatus: 'error'
      };
    }
  },

  // グローバル管理者かどうかを確認
  isGlobalAdmin: async (email: string): Promise<boolean> => {
    try {
      const response = await axiosInstance.get(`/auth/check-global-admin/${email}`);
      return response.data.isGlobalAdmin || false;
    } catch (error) {
      console.error('Failed to check global admin status:', error);
      return false;
    }
  }
};

export const metricsApi = {
  async getSystemMetrics() {
    try {
      const response = await axiosInstance.get('/metrics/system');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
      throw error;
    }
  },
};

export const alertsApi = {
  getAlerts: async (): Promise<Alert[]> => {
    const response = await axiosInstance.get('/security/dashboard');
    const data = await response.data;
    if (!data || !data.activeAlerts) {
      throw new Error('Failed to fetch alerts');
    }
    return data.activeAlerts;
  },

  acknowledgeAlert: async (alertId: string): Promise<ApiResponse> => {
    const response = await axiosInstance.post(`/security/incidents/${alertId}/respond`, {
      action: 'acknowledge'
    });
    return response.data;
  },
};

export const logsApi = {
  getLogs: async (): Promise<LogEntry[]> => {
    const response = await axiosInstance.get('/monitoring/logs');
    if (response.data.status === 'error' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch logs');
    }
    return response.data.data;
  },
};

export const roleApi = {
  async getRoleMappings() {
    const response = await axiosInstance.get('/auth/role-mappings');
    return response.data;
  },

  async getUserRoles(email: string) {
    const response = await axiosInstance.get(`/auth/user-roles/${email}`);
    return response.data;
  }
};

export const m365Api = {
  // 権限レベルに応じたフィルタリングを追加
  async getLicenses(isAdmin: boolean = false) {
    try {
      const params = isAdmin ? { view: 'full' } : { view: 'limited' };
      const response = await axiosInstance.get('/m365/licenses', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch licenses:', error);
      throw error;
    }
  },

  // 権限レベルに応じたフィルタリングを追加
  async getUsers(isAdmin: boolean = false) {
    try {
      const params = isAdmin ? { view: 'full' } : { view: 'limited' };
      const response = await axiosInstance.get('/m365/users', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  },

  // グローバル管理者専用API
  async getGlobalAdminInfo() {
    try {
      const response = await axiosInstance.get('/admin/global-admin-info');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch global admin info:', error);
      throw error;
    }
  }
};
