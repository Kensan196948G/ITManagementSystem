import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useAuth } from '../../contexts/AuthContext';

export const GraphAPIPermissionCheck: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [permissions, setPermissions] = useState<{
    currentPermissions: any[];
    recommendedPermissions: string[];
  } | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/admin/check-global-admin', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setIsGlobalAdmin(data.isGlobalAdmin);
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
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!isGlobalAdmin) {
    return (
      <Alert severity="warning" sx={{ my: 2 }}>
        この機能を利用するにはグローバル管理者権限が必要です。
      </Alert>
    );
  }

  const missingPermissions = permissions?.recommendedPermissions.filter(
    perm => !permissions.currentPermissions.some(
      (current: any) => current.resourceAccess.some(
        (access: any) => access.id === perm
      )
    )
  ) || [];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Microsoft Graph API パーミッション確認
      </Typography>

      <List>
        {permissions?.recommendedPermissions.map((permission) => (
          <ListItem key={permission}>
            <ListItemIcon>
              {permissions.currentPermissions.some(
                (current: any) => current.resourceAccess.some(
                  (access: any) => access.id === permission
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
                      (current: any) => current.resourceAccess.some(
                        (access: any) => access.id === permission
                      )
                    )
                      ? "設定済み"
                      : "未設定"
                  }
                  color={
                    permissions.currentPermissions.some(
                      (current: any) => current.resourceAccess.some(
                        (access: any) => access.id === permission
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
    </Box>
  );
};