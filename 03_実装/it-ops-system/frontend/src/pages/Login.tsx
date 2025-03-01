import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Box
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // 開発環境の場合は自動ログインを試行
  useEffect(() => {
    const autoLogin = async () => {
      if (process.env.NODE_ENV === 'development' && !autoLoginAttempted) {
        setAutoLoginAttempted(true);
        try {
          const response = await login({ username: 'mockuser', password: 'mockpass' });
          if (response.status === 'success') {
            navigate('/');
          }
        } catch (err) {
          // 自動ログインに失敗した場合は手動ログインを許可
          console.error('自動ログインに失敗しました:', err);
        }
      }
    };

    // 遅延を入れて自動ログインを実行
    const timer = setTimeout(autoLogin, 1000);
    return () => clearTimeout(timer);
  }, [login, navigate, autoLoginAttempted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await login({ username, password });
      if (response.status === 'success') {
        navigate('/');
      } else {
        setError(response.message || 'ログインに失敗しました');
      }
    } catch (err) {
      setError('認証エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 開発環境の場合は自動ログインのメッセージを表示
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            IT運用システム ログイン
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {isDevelopment && (
            <Alert severity="info" sx={{ mb: 2 }}>
              開発環境では自動的にモックユーザーでログインを試みています...
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
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
              {loading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;