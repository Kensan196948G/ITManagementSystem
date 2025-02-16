import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Alert,
  LinearProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  Person as PersonIcon,
  VpnKey as VpnKeyIcon,
} from '@mui/icons-material';
import { M365User, M365License, M365Service, ApiResponse } from '../../../types/api';

interface M365UserManagementProps {
  onError?: (error: string) => void;
}

const M365UserManagement: React.FC<M365UserManagementProps> = ({ onError }) => {
  const [users, setUsers] = useState<M365User[]>([]);
  const [licenses, setLicenses] = useState<M365License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<M365User | null>(null);
  const [formData, setFormData] = useState<Partial<M365User>>({});

  useEffect(() => {
    fetchUsers();
    fetchLicenses();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/m365/users');
      const data: ApiResponse<M365User[]> = await response.json();
      if (data.status === 'success' && data.data) {
        setUsers(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch users');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchLicenses = async () => {
    try {
      const response = await fetch('/api/m365/licenses');
      const data: ApiResponse<M365License[]> = await response.json();
      if (data.status === 'success' && data.data) {
        setLicenses(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch licenses:', err);
    }
  };

  const handleOpenDialog = (user?: M365User) => {
    setSelectedUser(user || null);
    setFormData(user || {});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setFormData({});
  };

  const handleSubmit = async () => {
    try {
      const url = selectedUser
        ? `/api/m365/users/${selectedUser.id}`
        : '/api/m365/users';
      const method = selectedUser ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data: ApiResponse = await response.json();
      if (data.status === 'success') {
        handleCloseDialog();
        fetchUsers();
      } else {
        throw new Error(data.message || '操作に失敗しました');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleToggleService = async (userId: string, serviceId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/m365/users/${userId}/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      const data: ApiResponse = await response.json();
      if (data.status === 'success') {
        fetchUsers();
      } else {
        throw new Error(data.message || 'サービスの更新に失敗しました');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">M365ユーザー管理</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ユーザー名</TableCell>
              <TableCell>メール</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>ライセンス</TableCell>
              <TableCell>サービス</TableCell>
              <TableCell>最終サインイン</TableCell>
              <TableCell>アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.displayName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={user.accountEnabled ? '有効' : '無効'}
                    color={user.accountEnabled ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    {user.licenses.map((licenseId) => {
                      const license = licenses.find((l) => l.id === licenseId);
                      return (
                        <Chip
                          key={licenseId}
                          label={license?.name || licenseId}
                          size="small"
                        />
                      );
                    })}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    {user.assignedServices.map((service) => (
                      <Chip
                        key={service.id}
                        label={service.name}
                        color={service.status === 'enabled' ? 'success' : 'default'}
                        size="small"
                      />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  {user.lastSignIn
                    ? new Date(user.lastSignIn).toLocaleDateString()
                    : '未ログイン'}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(user)}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedUser ? 'ユーザー編集' : '新規ユーザー作成'}
        </DialogTitle>
        <DialogContent>
          <Box display="grid" gap={3} sx={{ mt: 2 }}>
            <TextField
              label="表示名"
              value={formData.displayName || ''}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
              fullWidth
              required
            />
            <TextField
              label="メールアドレス"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.accountEnabled || false}
                  onChange={(e) =>
                    setFormData({ ...formData, accountEnabled: e.target.checked })
                  }
                />
              }
              label="アカウント有効"
            />
            <FormControl fullWidth>
              <InputLabel>ライセンス</InputLabel>
              <Select
                multiple
                value={formData.licenses || []}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    licenses: e.target.value as string[],
                  })
                }
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const license = licenses.find((l) => l.id === value);
                      return (
                        <Chip key={value} label={license?.name || value} />
                      );
                    })}
                  </Box>
                )}
              >
                {licenses.map((license) => (
                  <MenuItem key={license.id} value={license.id}>
                    {license.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>キャンセル</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {selectedUser ? '更新' : '作成'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default M365UserManagement;