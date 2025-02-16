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
  Group as GroupIcon,
} from '@mui/icons-material';
import { ADGroup, ADUser, ApiResponse } from '../../../types/api';

interface ADGroupManagementProps {
  onError?: (error: string) => void;
}

const ADGroupManagement: React.FC<ADGroupManagementProps> = ({ onError }) => {
  const [groups, setGroups] = useState<ADGroup[]>([]);
  const [users, setUsers] = useState<ADUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ADGroup | null>(null);
  const [formData, setFormData] = useState<Partial<ADGroup>>({});

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ad/groups');
      const data: ApiResponse<ADGroup[]> = await response.json();
      if (data.status === 'success' && data.data) {
        setGroups(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch groups');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/ad/users');
      const data: ApiResponse<ADUser[]> = await response.json();
      if (data.status === 'success' && data.data) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleOpenDialog = (group?: ADGroup) => {
    setSelectedGroup(group || null);
    setFormData(group || {
      type: 'security',
      scope: 'global',
      members: [],
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedGroup(null);
    setFormData({});
  };

  const handleSubmit = async () => {
    try {
      const url = selectedGroup
        ? `/api/ad/groups/${selectedGroup.id}`
        : '/api/ad/groups';
      const method = selectedGroup ? 'PUT' : 'POST';

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
        fetchGroups();
      } else {
        throw new Error(data.message || '操作に失敗しました');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('このグループを削除してもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/ad/groups/${groupId}`, {
        method: 'DELETE',
      });

      const data: ApiResponse = await response.json();
      if (data.status === 'success') {
        fetchGroups();
      } else {
        throw new Error(data.message || 'グループの削除に失敗しました');
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
        <Typography variant="h5">ADグループ管理</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          新規グループ作成
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
              <TableCell>グループ名</TableCell>
              <TableCell>説明</TableCell>
              <TableCell>タイプ</TableCell>
              <TableCell>スコープ</TableCell>
              <TableCell>メンバー数</TableCell>
              <TableCell>アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>{group.name}</TableCell>
                <TableCell>{group.description}</TableCell>
                <TableCell>
                  <Chip
                    label={group.type === 'security' ? 'セキュリティ' : '配布'}
                    color={group.type === 'security' ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{group.scope}</TableCell>
                <TableCell>{group.members.length}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(group)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteGroup(group.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedGroup ? 'グループ編集' : '新規グループ作成'}
        </DialogTitle>
        <DialogContent>
          <Box display="grid" gap={3} sx={{ mt: 2 }}>
            <TextField
              label="グループ名"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="説明"
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              fullWidth
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>グループタイプ</InputLabel>
              <Select
                value={formData.type || 'security'}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as 'security' | 'distribution' })
                }
              >
                <MenuItem value="security">セキュリティグループ</MenuItem>
                <MenuItem value="distribution">配布グループ</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>スコープ</InputLabel>
              <Select
                value={formData.scope || 'global'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scope: e.target.value as 'domainLocal' | 'global' | 'universal',
                  })
                }
              >
                <MenuItem value="domainLocal">ドメインローカル</MenuItem>
                <MenuItem value="global">グローバル</MenuItem>
                <MenuItem value="universal">ユニバーサル</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>メンバー</InputLabel>
              <Select
                multiple
                value={formData.members || []}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    members: e.target.value as string[],
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
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.samAccountName}>
                    {user.displayName} ({user.samAccountName})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>キャンセル</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {selectedGroup ? '更新' : '作成'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ADGroupManagement;