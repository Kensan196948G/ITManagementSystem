import React, { useEffect, useState } from 'react';
import {
  Alert,
  CircularProgress,
  Container,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useAuth } from '../../contexts/AuthContext';

interface Permission {
  id: string;
  type: string;
}

interface PermissionData {
  recommendedPermissions: string[];
  currentPermissions: {
    resourceAccess: Permission[];
  }[];
}

export const GraphAPIPermissionCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionData | null>(null);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/admin/check-global-admin', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setIsAdmin(data.isGlobalAdmin);
        if (data.isGlobalAdmin) {
          await checkGraphPermissions();
        }
      } else {
        setError('管理者権限の確認に失敗しました');
      }
    } catch (err) {
      setError('管理者権限の確認中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkGraphPermissions = async () => {
    try {
      const response = await fetch('/api/admin/graph-permissions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setPermissions(data.data);
      } else {
        setError('Graph APIパーミッションの確認に失敗しました');
      }
    } catch (err) {
      setError('Graph APIパーミッションの確認中にエラーが発生しました');
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!isAdmin) {
    return (
      <Alert severity="warning" sx={{ my: 2 }}>
        この機能を利用するにはグローバル管理者権限が必要です。
      </Alert>
    );
  }

  const missingPermissions = permissions?.recommendedPermissions.filter(
    (perm: string) => !permissions.currentPermissions.some(
      (current) => current.resourceAccess.some(
        (access) => access.id === perm
      )
    )
  ) || [];

  return (
    <Container sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Microsoft Graph API パーミッション確認
      </Typography>

      <List>
        {permissions?.recommendedPermissions.map((permission: string) => (
          <ListItem key={permission}>
            <ListItemIcon>
              {permissions.currentPermissions.some(
                (current) => current.resourceAccess.some(
                  (access) => access.id === permission
                )
              ) ? (
                <CheckCircleIcon color="success" />
              ) : (
                <ErrorIcon color="error" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={permission}
              secondary={
                <Chip
                  label={
                    permissions.currentPermissions.some(
                      (current) => current.resourceAccess.some(
                        (access) => access.id === permission
                      )
                    )
                      ? "設定済み"
                      : "未設定"
                  }
                  color={
                    permissions.currentPermissions.some(
                      (current) => current.resourceAccess.some(
                        (access) => access.id === permission
                      )
                    )
                      ? "success"
                      : "error"
                  }
                  size="small"
                />
              }
            />
          </ListItem>
        ))}
      </List>

      {missingPermissions.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {missingPermissions.length}個の推奨パーミッションが未設定です
        </Alert>
      )}

      {children}
    </Container>
  );
};