import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  CssBaseline,
  CircularProgress,
  Alert,
  Typography,
  Button,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { SideNav } from './SideNav';
import { ErrorBoundary } from 'react-error-boundary';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          <Typography>{error}</Typography>
          <Button onClick={() => navigate('/login')}>
            ログインページに戻る
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <SideNav />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <ErrorBoundary
          fallback={
            <Alert severity="error">
              <Typography>予期せぬエラーが発生しました</Typography>
            </Alert>
          }
        >
          {children}
        </ErrorBoundary>
      </Box>
    </Box>
  );
};