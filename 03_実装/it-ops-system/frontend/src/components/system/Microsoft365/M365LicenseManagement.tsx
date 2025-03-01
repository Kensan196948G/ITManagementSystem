import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  LinearProgress,
  FormHelperText,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { M365License, ApiResponse } from '../../../types/api';
import { m365Api } from '../../../services/api';

interface M365LicenseManagementProps {
  onError: (message: string) => void;
}

interface FormValidationErrors {
  name?: string;
  type?: string;
  totalCount?: string;
}

export const M365LicenseManagement: React.FC<M365LicenseManagementProps> = ({ onError }) => {
  const [licenses, setLicenses] = useState<M365License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<M365License | null>(null);
  const [formData, setFormData] = useState<Partial<M365License>>({});
  const [formErrors, setFormErrors] = useState<FormValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleError = useCallback((err: unknown) => {
    const errorMessage = err instanceof Error 
      ? err.message 
      : typeof err === 'string'
        ? err
        : '予期せぬエラーが発生しました';
    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  const fetchLicenses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await m365Api.getLicenses();
      
      if (data.status === 'success' && data.data) {
        setLicenses(data.data);
      } else {
        throw new Error(data.message || 'ライセンス情報の取得に失敗しました');
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  const handleInputChange = <K extends keyof M365License>(key: K, value: M365License[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setFormErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validateForm = (): FormValidationErrors => {
    const errors: FormValidationErrors = {};

    if (!formData?.name?.trim()) {
      errors.name = 'ライセンス名は必須です';
    } else if (formData.name.length > 50) {
      errors.name = 'ライセンス名は50文字以内で入力してください';
    }

    if (!formData?.type) {
      errors.type = 'ライセンスの種類を選択してください';
    }

    if (formData?.totalCount === undefined || formData.totalCount <= 0) {
      errors.totalCount = 'ライセンス数は1以上でなければなりません';
    } else if (formData.totalCount > 10000) {
      errors.totalCount = 'ライセンス数は10000以下で入力してください';
    }

    setFormErrors(errors);
    return errors;
  };

  const handleOpenDialog = useCallback((license?: M365License) => {
    setSelectedLicense(license || null);
    setFormData(license || {});
    setFormErrors({});
    setError(null);
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    if (isSubmitting) return;
    setOpenDialog(false);
    setSelectedLicense(null);
    setFormData({});
    setFormErrors({});
  }, [isSubmitting]);

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const url = selectedLicense
        ? `/api/m365/licenses/${selectedLicense.id}`
        : '/api/m365/licenses';
      const method = selectedLicense ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('APIリクエストに失敗しました');
      }

      const data: ApiResponse = await response.json();
      if (data.status === 'success') {
        handleCloseDialog();
        await fetchLicenses();
      } else {
        throw new Error(data.message || '操作に失敗しました');
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <LinearProgress sx={{ width: '100%' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">M365ライセンス管理</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={isSubmitting}
        >
          ライセンスの追加
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {licenses.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          ライセンスが登録されていません
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ライセンス名</TableCell>
                <TableCell>種類</TableCell>
                <TableCell align="right">割り当て数</TableCell>
                <TableCell align="right">合計数</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell align="center">アクション</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {licenses.map((license) => (
                <TableRow key={license.id}>
                  <TableCell>{license.name}</TableCell>
                  <TableCell>{license.type}</TableCell>
                  <TableCell align="right">{license.assignedCount}</TableCell>
                  <TableCell align="right">{license.totalCount}</TableCell>
                  <TableCell>
                    <Chip
                      label={license.status}
                      color={license.status === 'active' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      onClick={() => handleOpenDialog(license)}
                      disabled={isSubmitting}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        disableEscapeKeyDown={isSubmitting}
      >
        <DialogTitle>
          {selectedLicense ? 'ライセンス編集' : '新規ライセンス追加'}
        </DialogTitle>
        <DialogContent>
          <Box display="grid" gap={3} sx={{ mt: 2 }}>
            <TextField
              label="ライセンス名"
              value={formData?.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={!!formErrors.name}
              helperText={formErrors.name}
              fullWidth
              required
              disabled={isSubmitting}
            />
            <FormControl fullWidth required error={!!formErrors.type}>
              <InputLabel>種類</InputLabel>
              <Select
                value={formData?.type || ''}
                onChange={(e) => handleInputChange('type', e.target.value)}
                disabled={isSubmitting}
              >
                <MenuItem value="e1">E1</MenuItem>
                <MenuItem value="e3">E3</MenuItem>
                <MenuItem value="e5">E5</MenuItem>
                <MenuItem value="f1">F1</MenuItem>
              </Select>
              {formErrors.type && (
                <FormHelperText>{formErrors.type}</FormHelperText>
              )}
            </FormControl>
            <TextField
              label="ライセンス数"
              type="number"
              value={formData?.totalCount || ''}
              onChange={(e) => 
                handleInputChange('totalCount', parseInt(e.target.value, 10) || 0)
              }
              error={!!formErrors.totalCount}
              helperText={formErrors.totalCount}
              fullWidth
              required
              disabled={isSubmitting}
              InputProps={{
                inputProps: { min: 1, max: 10000 }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseDialog}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? '処理中...' : selectedLicense ? '更新' : '追加'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};