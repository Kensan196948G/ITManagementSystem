import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // バックエンドの生存確認（リトライ機能付き）
  const checkBackendHealth = async (retries = 3): Promise<boolean> => {
    try {
      console.log('Health check is disabled for debugging');
      return true; // デバッグ用に常にtrueを返す
    } catch (err) {
      console.error(`Backend health check failed:`, err);
      setError('バックエンドサーバーに接続できません。システム管理者に連絡してください。');
      return false;
    }
  };

  useEffect(() => {
    const attemptAutoLogin = async () => {
      if (!autoLoginAttempted) {
        setAutoLoginAttempted(true);
        try {
          console.log('Attempting to check backend health...');
          const isBackendAlive = await checkBackendHealth();
          if (!isBackendAlive) {
            console.error('Backend health check failed');
            setError('サーバーに接続できません。しばらく待ってから再試行してください。');
            return;
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('Attempting auto-login...');
            const response = await login({ username: 'mockuser', password: 'mockpass' });
            if (response.status === 'success') {
              navigate('/');
            }
          }
        } catch (err: any) {
          console.error('Auto-login failed:', err);
          setError(err.response?.data?.message || 'サーバーに接続できません。しばらく待ってから再試行してください。');
        }
      }
    };

    attemptAutoLogin();
  }, [login, navigate, autoLoginAttempted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('ユーザー名とパスワードを入力してください');
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      const response = await login({ username, password });
      if (response.status === 'success') {
        navigate('/');
      } else {
        setError(response.message || 'ログインに失敗しました');
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('ログイン試行回数が多すぎます。しばらく待ってから再試行してください。');
      } else {
        setError(err.response?.data?.message || '認証エラーが発生しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            IT運用システム ログイン
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {isDevelopment && !autoLoginAttempted && (
            <Alert severity="info" sx={{ mb: 2 }}>
              バックエンド接続を確認中...
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                <CircularProgress size={20} />
              </Box>
            </Alert>
          )}

          {isDevelopment && autoLoginAttempted && (
            <Alert severity="info" sx={{ mb: 2 }}>
              開発環境用のモックユーザー:<br />
              ユーザー名: mockuser<br />
              パスワード: mockpass
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="ユーザー名"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="パスワード"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  ログイン中...
                </Box>
              ) : (
                'ログイン'
              )}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
