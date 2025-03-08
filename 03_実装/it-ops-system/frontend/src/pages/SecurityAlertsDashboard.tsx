import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent,
  Divider, Chip, CircularProgress, Alert, Button, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogActions, DialogContent, DialogTitle, TextField,
  FormControl, InputLabel, Select, MenuItem, Snackbar
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { systemStatusApi } from '../services/systemStatusApi';
import { useAuth } from '../contexts/AuthContext';

// セキュリティアラートの型定義
interface SecurityAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  source: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  details?: any;
}

/**
 * セキュリティアラートダッシュボード
 * セキュリティアラートの一覧表示と管理機能を提供
 */
const SecurityAlertsDashboard: React.FC = () => {
  // 状態管理
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [acknowledgeOpen, setAcknowledgeOpen] = useState<boolean>(false);
  const [resolveOpen, setResolveOpen] = useState<boolean>(false);
  const [comment, setComment] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // フィルター設定
  const [filters, setFilters] = useState<{
    severity: string[];
    status: string[];
    source: string[];
    type: string[];
  }>({
    severity: [],
    status: [],
    source: [],
    type: []
  });
  
  const [filterDialogOpen, setFilterDialogOpen] = useState<boolean>(false);
  
  // 認証情報の取得
  const { isAdmin } = useAuth();
  
  // データの読み込み
  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await systemStatusApi.getSecurityAlerts();
      setAlerts(data);
      applyFilters(data);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError('セキュリティアラートの読み込み中にエラーが発生しました');
      setLoading(false);
      console.error('Security alerts loading error:', err);
    }
  };
  
  // 初回読み込み
  useEffect(() => {
    fetchAlerts();
  }, []);
  
  // フィルターの適用
  const applyFilters = (alertsData: SecurityAlert[] = alerts) => {
    let filtered = [...alertsData];
    
    // 重要度フィルター
    if (filters.severity.length > 0) {
      filtered = filtered.filter(alert => filters.severity.includes(alert.severity));
    }
    
    // ステータスフィルター
    if (filters.status.length > 0) {
      filtered = filtered.filter(alert => filters.status.includes(alert.status));
    }
    
    // ソースフィルター
    if (filters.source.length > 0) {
      filtered = filtered.filter(alert => filters.source.includes(alert.source));
    }
    
    // タイプフィルター
    if (filters.type.length > 0) {
      filtered = filtered.filter(alert => filters.type.includes(alert.type));
    }
    
    setFilteredAlerts(filtered);
  };
  
  // フィルターの更新
  const handleFilterChange = (filterType: string, values: string[]) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: values
    }));
  };
  
  // フィルターダイアログを開く
  const handleOpenFilterDialog = () => {
    setFilterDialogOpen(true);
  };
  
  // フィルターダイアログを閉じる
  const handleCloseFilterDialog = () => {
    setFilterDialogOpen(false);
  };
  
  // フィルターを適用
  const handleApplyFilters = () => {
    applyFilters();
    setFilterDialogOpen(false);
  };
  
  // フィルターをリセット
  const handleResetFilters = () => {
    setFilters({
      severity: [],
      status: [],
      source: [],
      type: []
    });
    setFilteredAlerts(alerts);
    setFilterDialogOpen(false);
  };
  
  // アラート詳細ダイアログを開く
  const handleOpenDetails = (alert: SecurityAlert) => {
    setSelectedAlert(alert);
    setDetailsOpen(true);
  };
  
  // アラート詳細ダイアログを閉じる
  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };
  
  // アラート確認ダイアログを開く
  const handleOpenAcknowledge = (alert: SecurityAlert) => {
    setSelectedAlert(alert);
    setComment('');
    setAcknowledgeOpen(true);
  };
  
  // アラート確認ダイアログを閉じる
  const handleCloseAcknowledge = () => {
    setAcknowledgeOpen(false);
  };
  
  // アラート解決ダイアログを開く
  const handleOpenResolve = (alert: SecurityAlert) => {
    setSelectedAlert(alert);
    setComment('');
    setResolveOpen(true);
  };
  
  // アラート解決ダイアログを閉じる
  const handleCloseResolve = () => {
    setResolveOpen(false);
  };
  
  // アラートを確認済みにする
  const handleAcknowledgeAlert = async () => {
    if (!selectedAlert) return;
    
    try {
      // ここで実際のAPIを呼び出してアラートを確認済みにする処理を実装
      // 現在はモックとして、フロントエンドの状態だけを更新
      
      const updatedAlerts = alerts.map(alert => 
        alert.id === selectedAlert.id 
          ? { ...alert, status: 'acknowledged' } 
          : alert
      );
      
      setAlerts(updatedAlerts);
      applyFilters(updatedAlerts);
      
      setSnackbar({
        open: true,
        message: 'アラートを確認済みにしました',
        severity: 'success'
      });
      
      handleCloseAcknowledge();
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'アラートの確認に失敗しました',
        severity: 'error'
      });
      console.error('Failed to acknowledge alert:', err);
    }
  };
  
  // アラートを解決済みにする
  const handleResolveAlert = async () => {
    if (!selectedAlert) return;
    
    try {
      // ここで実際のAPIを呼び出してアラートを解決済みにする処理を実装
      // 現在はモックとして、フロントエンドの状態だけを更新
      
      const updatedAlerts = alerts.map(alert => 
        alert.id === selectedAlert.id 
          ? { ...alert, status: 'resolved' } 
          : alert
      );
      
      setAlerts(updatedAlerts);
      applyFilters(updatedAlerts);
      
      setSnackbar({
        open: true,
        message: 'アラートを解決済みにしました',
        severity: 'success'
      });
      
      handleCloseResolve();
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'アラートの解決に失敗しました',
        severity: 'error'
      });
      console.error('Failed to resolve alert:', err);
    }
  };
  
  // スナックバーを閉じる
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  // 重要度に応じたアイコンを取得
  const getSeverityIcon = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'high':
        return <ErrorIcon color="error" />;
      case 'medium':
        return <WarningIcon color="warning" />;
      case 'low':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon color="info" />;
    }
  };
  
  // 重要度に応じた表示名を取得
  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '重大';
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return severity;
    }
  };
  
  // ステータスに応じた表示名を取得
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'アクティブ';
      case 'acknowledged':
        return '確認済み';
      case 'resolved':
        return '解決済み';
      default:
        return status;
    }
  };
  
  // ローディング中の表示
  if (loading && alerts.length === 0) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  // エラー表示
  if (error && alerts.length === 0) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      </Container>
    );
  }
  
  // 利用可能なフィルターオプションを取得
  const getFilterOptions = () => {
    const options = {
      severity: Array.from(new Set(alerts.map(alert => alert.severity))),
      status: Array.from(new Set(alerts.map(alert => alert.status))),
      source: Array.from(new Set(alerts.map(alert => alert.source))),
      type: Array.from(new Set(alerts.map(alert => alert.type)))
    };
    
    return options;
  };
  
  const filterOptions = getFilterOptions();
  
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 3, mb: 2 }}>
        セキュリティアラート
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAlerts}
            sx={{ mr: 1 }}
          >
            更新
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={handleOpenFilterDialog}
          >
            フィルター
          </Button>
        </Box>
        <Typography variant="body2" color="textSecondary">
          {filteredAlerts.length} 件のアラート
        </Typography>
      </Box>
      
      {/* アラート一覧 */}
      <Paper elevation={3} sx={{ mb: 4 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>重要度</TableCell>
                <TableCell>タイプ</TableCell>
                <TableCell>メッセージ</TableCell>
                <TableCell>ソース</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>検出時刻</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body1" sx={{ py: 2 }}>
                      アラートはありません
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {getSeverityIcon(alert.severity)}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {getSeverityLabel(alert.severity)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{alert.type}</TableCell>
                    <TableCell>{alert.message}</TableCell>
                    <TableCell>{alert.source}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(alert.status)}
                        color={
                          alert.status === 'active' ? 'error' :
                          alert.status === 'acknowledged' ? 'warning' : 'success'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{new Date(alert.timestamp).toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDetails(alert)}
                        title="詳細"
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                      
                      {isAdmin && alert.status === 'active' && (
                        <IconButton
                          size="small"
                          onClick={() => handleOpenAcknowledge(alert)}
                          title="確認済みにする"
                          color="warning"
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      )}
                      
                      {isAdmin && (alert.status === 'active' || alert.status === 'acknowledged') && (
                        <IconButton
                          size="small"
                          onClick={() => handleOpenResolve(alert)}
                          title="解決済みにする"
                          color="success"
                        >
                          <SecurityIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* フィルターダイアログ */}
      <Dialog open={filterDialogOpen} onClose={handleCloseFilterDialog} maxWidth="sm" fullWidth>
        <DialogTitle>アラートフィルター</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="severity-filter-label">重要度</InputLabel>
                <Select
                  labelId="severity-filter-label"
                  multiple
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value as string[])}
                  label="重要度"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={getSeverityLabel(value)} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {filterOptions.severity.map((severity) => (
                    <MenuItem key={severity} value={severity}>
                      {getSeverityLabel(severity)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="status-filter-label">ステータス</InputLabel>
                <Select
                  labelId="status-filter-label"
                  multiple
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value as string[])}
                  label="ステータス"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={getStatusLabel(value)} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {filterOptions.status.map((status) => (
                    <MenuItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="source-filter-label">ソース</InputLabel>
                <Select
                  labelId="source-filter-label"
                  multiple
                  value={filters.source}
                  onChange={(e) => handleFilterChange('source', e.target.value as string[])}
                  label="ソース"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {filterOptions.source.map((source) => (
                    <MenuItem key={source} value={source}>
                      {source}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="type-filter-label">タイプ</InputLabel>
                <Select
                  labelId="type-filter-label"
                  multiple
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value as string[])}
                  label="タイプ"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {filterOptions.type.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetFilters} color="inherit">
            リセット
          </Button>
          <Button onClick={handleCloseFilterDialog} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleApplyFilters} color="primary" variant="contained">
            適用
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* アラート詳細ダイアログ */}
      <Dialog open={detailsOpen} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        {selectedAlert && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                {getSeverityIcon(selectedAlert.severity)}
                <Typography variant="h6" sx={{ ml: 1 }}>
                  {selectedAlert.type}
                </Typography>
                <Chip
                  label={getSeverityLabel(selectedAlert.severity)}
                  color={
                    selectedAlert.severity === 'critical' || selectedAlert.severity === 'high' ? 'error' :
                    selectedAlert.severity === 'medium' ? 'warning' : 'info'
                  }
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="subtitle1" gutterBottom>
                {selectedAlert.message}
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    ソース: {selectedAlert.source}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    ステータス: {getStatusLabel(selectedAlert.status)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    検出時刻: {new Date(selectedAlert.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    ID: {selectedAlert.id}
                  </Typography>
                </Grid>
              </Grid>
              
              {selectedAlert.details && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    詳細情報:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(selectedAlert.details, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails} color="primary">
                閉じる
              </Button>
              
              {isAdmin && selectedAlert.status === 'active' && (
                <Button
                  onClick={() => {
                    handleCloseDetails();
                    handleOpenAcknowledge(selectedAlert);
                  }}
                  color="warning"
                >
                  確認済みにする
                </Button>
              )}
              
              {isAdmin && (selectedAlert.status === 'active' || selectedAlert.status === 'acknowledged') && (
                <Button
                  onClick={() => {
                    handleCloseDetails();
                    handleOpenResolve(selectedAlert);
                  }}
                  color="success"
                >
                  解決済みにする
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* アラート確認ダイアログ */}
      <Dialog open={acknowledgeOpen} onClose={handleCloseAcknowledge} maxWidth="sm" fullWidth>
        <DialogTitle>アラートを確認済みにする</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <>
              <Typography variant="body1" gutterBottom>
                以下のアラートを確認済みにしますか？
              </Typography>
              <Typography variant="subtitle2">
                {selectedAlert.type}: {selectedAlert.message}
              </Typography>
              
              <TextField
                label="コメント（オプション）"
                multiline
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                fullWidth
                margin="normal"
                variant="outlined"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAcknowledge} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleAcknowledgeAlert} color="warning" variant="contained">
            確認済みにする
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* アラート解決ダイアログ */}
      <Dialog open={resolveOpen} onClose={handleCloseResolve} maxWidth="sm" fullWidth>
        <DialogTitle>アラートを解決済みにする</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <>
              <Typography variant="body1" gutterBottom>
                以下のアラートを解決済みにしますか？
              </Typography>
              <Typography variant="subtitle2">
                {selectedAlert.type}: {selectedAlert.message}
              </Typography>
              
              <TextField
                label="解決方法（オプション）"
                multiline
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                fullWidth
                margin="normal"
                variant="outlined"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResolve} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleResolveAlert} color="success" variant="contained">
            解決済みにする
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SecurityAlertsDashboard;