import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, CircularProgress, Container, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';

interface PermissionCheckProps {
  resource: string;
  action: 'read' | 'write';
  children: React.ReactNode;
}

export const PermissionCheck: React.FC<PermissionCheckProps> = ({ 
  resource,
  action,
  children 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        if (!user?.email) {
          navigate('/login');
          return;
        }

        const allowed = await authApi.checkPermission({
          userEmail: user.email,
          check: { resource, action }
        });

        setHasPermission(allowed);
        if (!allowed) {
          setError(`${resource}への${action}権限がありません`);
        }
      } catch (err) {
        setError('権限の確認中にエラーが発生しました');
        setHasPermission(false);
      }
    };

    checkPermission();
  }, [user, resource, action, navigate]);

  if (hasPermission === null) {
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
        </Alert>
      </Container>
    );
  }

  return hasPermission ? <>{children}</> : null;
};