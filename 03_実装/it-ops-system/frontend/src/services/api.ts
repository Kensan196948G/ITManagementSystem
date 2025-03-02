import axios from 'axios';
import { ApiResponse, AuthState, User, LoginFormData, Alert, LogEntry, AuthResponse } from '../types/api';

// 開発環境の判定
const isDevelopment = process.env.NODE_ENV === 'development';

// 開発環境ではプロキシ設定を使用するため、相対パスを使用
const API_BASE_URL = '/api';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
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