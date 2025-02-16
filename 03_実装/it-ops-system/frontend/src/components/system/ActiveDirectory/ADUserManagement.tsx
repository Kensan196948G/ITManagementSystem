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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
} from '@mui/icons-material';
import { ADUser, ADGroup, ApiResponse } from '../../../types/api';

interface ADUserManagementProps {
  onError?: (error: string) => void;
}

const ADUserManagement: React.FC<ADUserManagementProps> = ({ onError }) => {
  const [users, setUsers] = useState<ADUser[]>([]);
  const [groups, setGroups] = useState<ADGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ADUser | null>(null);
  const [formData, setFormData] = useState<Partial<ADUser>>({});

  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ad/users');
      const data: ApiResponse<ADUser[]> = await response.json();
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

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/ad/groups');
      const data: ApiResponse<ADGroup[]> = await response.json();
      if (data.status === 'success' && data.data) {
        setGroups(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  };

  const handleOpenDialog = (user?: ADUser) => {
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
        ? `/api/ad/users/${selectedUser.id}`
        : '/api/ad/users';
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

  const handleToggleUserStatus = async (user: ADUser) => {
    try {
      const response = await fetch(`/api/ad/users/${user.id}/toggle-status`, {
        method: 'POST',
      });

      const data: ApiResponse = await response.json();
      if (data.status === 'success') {
        fetchUsers();
      } else {
        throw new Error(data.message || 'ステータスの変更に失敗しました');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">ADユーザー管理</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          新規ユーザー作成
        </Button>
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
              <TableCell>表示名</TableCell>
              <TableCell>メール</TableCell>
              <TableCell>部署</TableCell>
              <TableCell>グループ</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.samAccountName}</TableCell>
                <TableCell>{user.displayName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.department}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    {user.groups.map((group) => (
                      <Chip key={group} label={group} size="small" />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.enabled ? '有効' : '無効'}
                    color={user.enabled ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(user)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleToggleUserStatus(user)}>
                    {user.enabled ? <LockIcon /> : <LockOpenIcon />}
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
              label="ユーザー名"
              value={formData.samAccountName || ''}
              onChange={(e) =>
                setFormData({ ...formData, samAccountName: e.target.value })
              }
              fullWidth
              required
            />
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
            <TextField
              label="部署"
              value={formData.department || ''}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>グループ</InputLabel>
              <Select
                multiple
                value={formData.groups || []}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    groups: e.target.value as string[],
                  })
                }
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.name}>
                    {group.name}
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

export default ADUserManagement;