import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiClient = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // CORSリクエストでクッキーを送信
  });

  // APIクライアントのインターセプターを設定
  apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem(process.env.REACT_APP_AUTH_STORAGE_KEY || 'it_ops_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  const login = async (username: string, password: string) => {
    try {
      setError(null);
      const response = await apiClient.post('/auth/login', { username, password });
      const { token } = response.data.data;
      localStorage.setItem(process.env.REACT_APP_AUTH_STORAGE_KEY || 'it_ops_token', token);
      setIsAuthenticated(true);
    } catch (err) {
      setError('ログインに失敗しました');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem(process.env.REACT_APP_AUTH_STORAGE_KEY || 'it_ops_token');
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem(process.env.REACT_APP_AUTH_STORAGE_KEY || 'it_ops_token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};