import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogActions, DialogContent, DialogTitle, FormControl,
  InputLabel, Select, MenuItem, Chip, Alert, Snackbar, CircularProgress,
  IconButton, Tooltip
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { graphPermissionApi } from '../services/graphPermissionApi';
import { m365Api } from '../services/api';
import { GraphPermission } from '../types/graphPermission';

/**
 * グローバル管理者向けのパーミッション管理画面
 * 一般ユーザーのGraph APIパーミッションを管理するコンポーネント
 */
const UserPermissionManagement: React.FC = () => {
  // ユーザー一覧
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<GraphPermission[]>([]);
  
  // 利用可能なパーミッション
  const [availablePermissions, setAvailablePermissions] = useState<GraphPermission[]>([]);
  
  // パーミッション付与ダイアログ
  const [openGrantDialog, setOpenGrantDialog] = useState<boolean>(false);
  const [selectedPermission, setSelectedPermission] = useState<string>('');
  const [selectedScope, setSelectedScope] = useState<'Delegated' | 'Application'>('Delegated');
  
  // UI状態
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // 初期データの読み込み
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // 利用可能なパーミッション一覧を取得
        const permissions = await graphPermissionApi.getAvailablePermissions();
        setAvailablePermissions(permissions);
        
        // ユーザー一覧を取得（管理者向けビュー）
        const usersResponse = await m365Api.getUsers(true);
        if (usersResponse && usersResponse.data) {
          setUsers(usersResponse.data);
        }
        
        setLoading(false);
      } catch (err) {
        setError('データの読み込み中にエラーが発生しました');
        setLoading(false);
        console.error('Permission management data loading error:', err);
      }
    };
    
    fetchInitialData();
  }, []);

  // ユーザーのパーミッション一覧を取得
  const fetchUserPermissions = async (userEmail: string) => {
    if (!userEmail) return;
    
    try {
      setLoading(true);
      const permissions = await graphPermissionApi.getUserPermissions(userEmail);
      setUserPermissions(permissions);
      setLoading(false);
    } catch (err) {
      setError(`ユーザー ${userEmail} のパーミッション取得中にエラーが発生しました`);
      setLoading(false);
      console.error('User permissions loading error:', err);
    }
  };

  // ユーザー選択時の処理
  const handleUserChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const userEmail = event.target.value as string;
    setSelectedUser(userEmail);
    fetchUserPermissions(userEmail);
  };

  // パーミッション付与ダイアログを開く
  const handleOpenGrantDialog = () => {
    setOpenGrantDialog(true);
  };

  // パーミッション付与ダイアログを閉じる
  const handleCloseGrantDialog = () => {
    setOpenGrantDialog(false);
    setSelectedPermission('');
  };

  // パーミッションを付与
  const handleGrantPermission = async () => {
    if (!selectedUser || !selectedPermission) return;
    
    try {
      setLoading(true);
      const result = await graphPermissionApi.grantPermission(
        selectedUser,
        selectedPermission,
        selectedScope
      );
      
      if (result.success) {
        setNotification({
          open: true,
          message: `パーミッション ${selectedPermission} を ${selectedUser} に付与しました`,
          severity: 'success'
        });
        
        // パーミッション一覧を更新
        await fetchUserPermissions(selectedUser);
      } else {
        setNotification({
          open: true,
          message: result.message || 'パーミッション付与に失敗しました',
          severity: 'error'
        });
      }
      
      setLoading(false);
      handleCloseGrantDialog();
    } catch (err) {
      setNotification({
        open: true,
        message: 'パーミッション付与中にエラーが発生しました',
        severity: 'error'
      });
      setLoading(false);
      handleCloseGrantDialog();
      console.error('Grant permission error:', err);
    }
  };

  // パーミッションを削除
  const handleRevokePermission = async (permission: GraphPermission) => {
    if (!selectedUser || !permission.value) return;
    
    try {
      setLoading(true);
      const result = await graphPermissionApi.revokePermission(
        selectedUser,
        permission.value,
        permission.type
      );
      
      if (result.success) {
        setNotification({
          open: true,
          message: `パーミッション ${permission.value} を ${selectedUser} から削除しました`,
          severity: 'success'
        });
        
        // パーミッション一覧を更新
        await fetchUserPermissions(selectedUser);
      } else {
        setNotification({
          open: true,
          message: result.message || 'パーミッション削除に失敗しました',
          severity: 'error'
        });
      }
      
      setLoading(false);
    } catch (err) {
      setNotification({
        open: true,
        message: 'パーミッション削除中にエラーが発生しました',
        severity: 'error'
      });
      setLoading(false);
      console.error('Revoke permission error:', err);
    }
  };

  // 通知を閉じる
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 3, mb: 4 }}>
        ユーザーパーミッション管理
      </Typography>
      
      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* ユーザー選択 */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="user-select-label">ユーザー</InputLabel>
              <Select
                labelId="user-select-label"
                value={selectedUser}
                onChange={handleUserChange}
                label="ユーザー"
                disabled={loading}
              >
                <MenuItem value="">
                  <em>ユーザーを選択</em>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.email}>
                    {user.displayName} ({user.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenGrantDialog}
                disabled={!selectedUser || loading}
                sx={{ mr: 1 }}
              >
                パーミッション付与
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => fetchUserPermissions(selectedUser)}
                disabled={!selectedUser || loading}
              >
                更新
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* ユーザーのパーミッション一覧 */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          {selectedUser ? `${selectedUser} のパーミッション` : 'ユーザーを選択してください'}
        </Typography>
        
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : selectedUser ? (
          userPermissions.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>パーミッション</TableCell>
                    <TableCell>タイプ</TableCell>
                    <TableCell>説明</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userPermissions.map((permission) => (
                    <TableRow key={`${permission.value}-${permission.type}`}>
                      <TableCell>{permission.value}</TableCell>
                      <TableCell>
                        <Chip
                          label={permission.type}
                          color={permission.type === 'Delegated' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{permission.description || '説明なし'}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="パーミッション削除">
                          <IconButton
                            color="error"
                            onClick={() => handleRevokePermission(permission)}
                            disabled={loading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              このユーザーには特別なGraph APIパーミッションが付与されていません
            </Alert>
          )
        ) : (
          <Alert severity="info">
            ユーザーを選択してパーミッション情報を表示します
          </Alert>
        )}
      </Paper>
      
      {/* パーミッション付与ダイアログ */}
      <Dialog open={openGrantDialog} onClose={handleCloseGrantDialog} maxWidth="sm" fullWidth>
        <DialogTitle>パーミッション付与</DialogTitle>
        <DialogContent>
          <Box my={2}>
            <Typography variant="body2" gutterBottom>
              ユーザー: {selectedUser}
            </Typography>
          </Box>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="permission-select-label">パーミッション</InputLabel>
            <Select
              labelId="permission-select-label"
              value={selectedPermission}
              onChange={(e) => setSelectedPermission(e.target.value as string)}
              label="パーミッション"
            >
              <MenuItem value="">
                <em>パーミッションを選択</em>
              </MenuItem>
              {availablePermissions.map((permission) => (
                <MenuItem key={`${permission.value}-${permission.type}`} value={permission.value}>
                  {permission.value} ({permission.type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel id="scope-select-label">スコープ</InputLabel>
            <Select
              labelId="scope-select-label"
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value as 'Delegated' | 'Application')}
              label="スコープ"
            >
              <MenuItem value="Delegated">Delegated (委任)</MenuItem>
              <MenuItem value="Application">Application (アプリケーション)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGrantDialog} color="inherit">
            キャンセル
          </Button>
          <Button
            onClick={handleGrantPermission}
            color="primary"
            variant="contained"
            disabled={!selectedPermission}
          >
            付与
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 通知 */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserPermissionManagement;