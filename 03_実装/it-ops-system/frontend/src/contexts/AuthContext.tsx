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
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await authApi.getCurrentUser();
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user,
          loading: false,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Authentication failed',
        }));
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginFormData) => {
    try {
      const response = await authApi.login(credentials);
      if (response.status === 'success' && response.data) {
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: response?.data?.user || null,
          token: response?.data?.token || null,
          error: null,
        }));
      }
      return response;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Login failed',
      }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setState({
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Logout failed',
      }));
    }
  };

  const getCurrentUser = async () => {
    try {
      const user = await authApi.getCurrentUser();
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
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