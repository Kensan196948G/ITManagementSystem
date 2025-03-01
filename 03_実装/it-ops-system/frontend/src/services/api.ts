import axios from 'axios';
import { ApiResponse, AuthState, User, LoginFormData, Alert, LogEntry } from '../types/api';

// REACT_APP_API_URLが設定されていない場合は3002ポートを使用
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

// axiosInstanceの設定でwithCredentialsをfalseに変更（CORSエラー防止）
export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// リクエストインターセプター
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  async login(credentials: LoginFormData): Promise<ApiResponse<AuthState>> {
    const endpoint = process.env.NODE_ENV === 'development' 
      ? '/auth/dev/login' 
      : '/auth/login';
    
    const response = await axiosInstance.post<ApiResponse<AuthState>>(endpoint, credentials);
    if (response.data.data?.token) {
      localStorage.setItem('token', response.data.data.token);
      // トークンをセットしたら、レスポンスヘッダーも更新
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;
    }
    return response.data;
  },

  async logout(): Promise<void> {
    await axiosInstance.post('/auth/logout');
    localStorage.removeItem('token');
    delete axiosInstance.defaults.headers.common['Authorization'];
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await axiosInstance.get<ApiResponse<User>>('/auth/me');
      return response.data.data || null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  },

  checkPermission: async (params: { userEmail: string; check: { resource: string; action: string } }): Promise<boolean> => {
    const response = await axiosInstance.post('/auth/check-permission', params);
    return response.data.allowed;
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
  async getLicenses() {
    const response = await axiosInstance.get('/m365/licenses');
    return response.data;
  },

  async getUsers() {
    const response = await axiosInstance.get('/m365/users');
    return response.data;
  }
};