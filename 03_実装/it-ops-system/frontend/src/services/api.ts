import axios from 'axios';
import { ApiResponse, AuthState, User, LoginFormData, Alert, LogEntry } from '../types/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
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
    const response = await axiosInstance.post<ApiResponse<AuthState>>(
      '/auth/login',
      credentials
    );
    if (response.data.data?.token) {
      localStorage.setItem('token', response.data.data.token);
    }
    return response.data;
  },

  async logout(): Promise<void> {
    await axiosInstance.post('/auth/logout');
    localStorage.removeItem('token');
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await axiosInstance.get<ApiResponse<User>>('/auth/me');
      return response.data.data || null;
    } catch (error) {
      return null;
    }
  },

  checkPermission: async (params: { userEmail: string; check: { resource: string; action: string } }): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/auth/check-permission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    const data = await response.json();
    return data.allowed;
  }
};

export const metricsApi = {
  async getSystemMetrics() {
    const response = await axiosInstance.get('/metrics/system');
    return response.data;
  },
};

export const alertsApi = {
  getAlerts: async (): Promise<Alert[]> => {
    const response = await fetch(`${API_BASE_URL}/security/dashboard`);
    const data = await response.json();
    if (!data || !data.activeAlerts) {
      throw new Error('Failed to fetch alerts');
    }
    return data.activeAlerts;
  },

  acknowledgeAlert: async (alertId: string): Promise<ApiResponse> => {
    const response = await fetch(`${API_BASE_URL}/security/incidents/${alertId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'acknowledge' }),
    });
    return response.json();
  },
};

export const logsApi = {
  getLogs: async (): Promise<LogEntry[]> => {
    const response = await fetch(`${API_BASE_URL}/monitoring/logs`);
    const data: ApiResponse<LogEntry[]> = await response.json();
    if (data.status === 'error' || !data.data) {
      throw new Error(data.message || 'Failed to fetch logs');
    }
    return data.data;
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