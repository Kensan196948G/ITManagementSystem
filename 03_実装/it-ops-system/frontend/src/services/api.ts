import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  SystemMetrics,
  Alert,
  LogEntry,
  ApiResponse,
  LoginFormData,
  AuthState,
} from '../types/api';

// APIクライアントの作成
const createApiClient = (): AxiosInstance => {
  const baseURL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : '/api';

  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // リクエストインターセプター
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // レスポンスインターセプター
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return client;
};

const apiClient = createApiClient();

// 認証関連の API
export const authApi = {
  login: async (credentials: LoginFormData): Promise<ApiResponse<AuthState>> => {
    const response: AxiosResponse<ApiResponse<AuthState>> = await apiClient.post(
      '/auth/login',
      credentials
    );
    const { token } = response.data.data!;
    localStorage.setItem('token', token);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
    localStorage.removeItem('token');
  },

  getCurrentUser: async (): Promise<ApiResponse<AuthState>> => {
    const response: AxiosResponse<ApiResponse<AuthState>> = await apiClient.get('/auth/me');
    return response.data;
  },
};

// システムメトリクス関連の API
export const metricsApi = {
  getMetrics: async (): Promise<SystemMetrics> => {
    const response: AxiosResponse<ApiResponse<SystemMetrics>> = await apiClient.get(
      '/monitoring/metrics'
    );
    return response.data.data!;
  },
};

// アラート関連の API
export const alertsApi = {
  getAlerts: async (): Promise<Alert[]> => {
    const response: AxiosResponse<ApiResponse<Alert[]>> = await apiClient.get(
      '/monitoring/alerts'
    );
    return response.data.data!;
  },

  acknowledgeAlert: async (alertId: string): Promise<void> => {
    await apiClient.post(`/monitoring/alerts/${alertId}/acknowledge`);
  },
};

// ログ関連の API
export const logsApi = {
  getLogs: async (params?: {
    startDate?: Date;
    endDate?: Date;
    level?: string;
    source?: string;
  }): Promise<LogEntry[]> => {
    const response: AxiosResponse<ApiResponse<LogEntry[]>> = await apiClient.get(
      '/monitoring/logs',
      { params }
    );
    return response.data.data!;
  },

  addLog: async (logEntry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<LogEntry> => {
    const response: AxiosResponse<ApiResponse<LogEntry>> = await apiClient.post(
      '/monitoring/logs',
      logEntry
    );
    return response.data.data!;
  },
};

// エラーハンドリング
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// エラーレスポンスの変換
export const handleApiError = (error: AxiosError): ApiError => {
  if (error.response) {
    return new ApiError(
      error.response.status,
      (error.response.data as any).message || 'APIエラーが発生しました',
      (error.response.data as any).errors
    );
  }
  return new ApiError(500, 'ネットワークエラーが発生しました');
};

export default {
  auth: authApi,
  metrics: metricsApi,
  alerts: alertsApi,
  logs: logsApi,
};