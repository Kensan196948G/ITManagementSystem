import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, User, LoginFormData, ApiResponse } from '../types/api';
import { authApi } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginFormData) => Promise<ApiResponse<AuthState>>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  error: null,
  login: async () => ({ status: 'error', message: 'Context not initialized' }),
  logout: async () => {},
  getCurrentUser: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: Boolean(localStorage.getItem('token')), // トークンの存在で初期認証状態を設定
    user: null,
    token: localStorage.getItem('token'),
    loading: true,
    error: null,
  });

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setState(prev => ({
          ...prev,
          loading: false,
          isAuthenticated: false,
        }));
        return;
      }

      try {
        const user = await authApi.getCurrentUser();
        setState(prev => ({
          ...prev,
          user,
          isAuthenticated: Boolean(user),
          loading: false,
        }));
      } catch (error) {
        localStorage.removeItem('token'); // エラー時はトークンを削除
        setState(prev => ({
          ...prev,
          loading: false,
          isAuthenticated: false,
          user: null,
        }));
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginFormData) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await authApi.login(credentials);
      if (response.status === 'success' && response.data?.user) {
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: response.data.user,
          token: response.data.token,
          loading: false,
          error: null,
        }));
      } else {
        throw new Error('Invalid response format');
      }
      return response;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Login failed',
        isAuthenticated: false,
        user: null,
        token: null,
      }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      // エラーが発生しても状態をクリアする
      setState({
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
      });
      localStorage.removeItem('token');
    }
  };

  const getCurrentUser = async () => {
    try {
      const user = await authApi.getCurrentUser();
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: Boolean(user),
      }));
      return user;
    } catch (error) {
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
      }));
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        isLoading: state.loading,
        error: state.error,
        login,
        logout,
        getCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);