import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent,
  CardHeader, Divider, Chip, CircularProgress, Alert, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Dns as DnsIcon,
  Api as ApiIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { systemStatusApi } from '../services/systemStatusApi';

// システムステータスの型定義
interface SystemStatus {
  status: 'healthy' | 'degraded' | 'critical';
  components: {
    database: {
      status: 'healthy' | 'degraded' | 'critical';
      message?: string;
    };
    api: {
      status: 'healthy' | 'degraded' | 'critical';
      message?: string;
    };
    filesystem: {
      status: 'healthy' | 'degraded' | 'critical';
      message?: string;
    };
    memory: {
      status: 'healthy' | 'degraded' | 'critical';
      message?: string;
      usage: number;
    };
  };
  lastChecked: string;
}

// リソース使用状況の型定義
interface ResourceUsage {
  cpu: {
    usage: any;
    cores: number;
    model: string;
    loadAverage: number[];
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercentage: string;
    process: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
  };
  disk: {
    [key: string]: {
      total: number;
      free: number;
      used: number;
      usagePercentage: string;
    };
  };
  network: any;
  system: {
    platform: string;
    release: string;
    hostname: string;
    uptime: number;
  };
  timestamp: string;
}

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
 * システムステータスダッシュボード
 * システムの状態、リソース使用状況、セキュリティアラートを表示
 */
const SystemStatusDashboard: React.FC = () => {
  // 状態管理
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [resourceUsage, setResourceUsage] = useState<ResourceUsage | null>(null);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30秒ごとに更新
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // データの読み込み
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // システムステータスの取得
      const status = await systemStatusApi.getSystemStatus();
      setSystemStatus(status);
      
      // リソース使用状況の取得
      const resources = await systemStatusApi.getResourceUsage();
      setResourceUsage(resources);
      
      // セキュリティアラートの取得
      const alerts = await systemStatusApi.getSecurityAlerts();
      setSecurityAlerts(alerts);
      
      setLastUpdated(new Date());
      setLoading(false);
      setError(null);
    } catch (err) {
      setError('データの読み込み中にエラーが発生しました');
      setLoading(false);
      console.error('Dashboard data loading error:', err);
    }
  };

  // 初回読み込み
  useEffect(() => {
    fetchData();
  }, []);

  // 定期的な更新
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // ステータスに応じたアイコンとカラーを取得
  const getStatusIcon = (status: 'healthy' | 'degraded' | 'critical') => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon color="success" />;
      case 'degraded':
        return <WarningIcon color="warning" />;
      case 'critical':
        return <ErrorIcon color="error" />;
      default:
        return <CheckCircleIcon color="success" />;
    }
  };

  // ステータスに応じたテキストを取得
  const getStatusText = (status: 'healthy' | 'degraded' | 'critical') => {
    switch (status) {
      case 'healthy':
        return '正常';
      case 'degraded':
        return '劣化';
      case 'critical':
        return '危機的';
      default:
        return '不明';
    }
  };

  // ステータスに応じたカラーを取得
  const getStatusColor = (status: 'healthy' | 'degraded' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  // コンポーネントアイコンを取得
  const getComponentIcon = (component: string) => {
    switch (component) {
      case 'database':
        return <StorageIcon />;
      case 'api':
        return <ApiIcon />;
      case 'filesystem':
        return <DnsIcon />;
      case 'memory':
        return <MemoryIcon />;
      default:
        return <SpeedIcon />;
    }
  };

  // バイト単位を人間が読みやすい形式に変換
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // 秒単位を人間が読みやすい形式に変換
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}日 ${hours}時間 ${minutes}分`;
  };

  // ローディング中の表示
  if (loading && !systemStatus) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // エラー表示
  if (error && !systemStatus) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 3, mb: 2 }}>
        システムステータスダッシュボード
      </Typography>
      
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          最終更新: {lastUpdated.toLocaleString()}
        </Typography>
        {loading && <LinearProgress sx={{ width: '100%', ml: 2 }} />}
      </Box>
      
      {/* システム全体のステータス */}
      {systemStatus && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box display="flex" alignItems="center" mb={2}>
            {getStatusIcon(systemStatus.status)}
            <Typography variant="h5" sx={{ ml: 1 }}>
              システム状態: {getStatusText(systemStatus.status)}
            </Typography>
            <Chip
              label={getStatusText(systemStatus.status)}
              color={getStatusColor(systemStatus.status) as any}
              sx={{ ml: 2 }}
            />
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={3}>
            {Object.entries(systemStatus.components).map(([key, component]) => (
              <Grid item xs={12} sm={6} md={3} key={key}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      {getComponentIcon(key)}
                      <Typography variant="subtitle1" sx={{ ml: 1 }}>
                        {key === 'database' ? 'データベース' :
                         key === 'api' ? 'API' :
                         key === 'filesystem' ? 'ファイルシステム' :
                         key === 'memory' ? 'メモリ' : key}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      {getStatusIcon(component.status)}
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {getStatusText(component.status)}
                      </Typography>
                    </Box>
                    {component.message && (
                      <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                        {component.message}
                      </Typography>
                    )}
                    {key === 'memory' && 'usage' in component && (
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={parseFloat(component.usage.toString())}
                          color={
                            component.usage > 90 ? 'error' :
                            component.usage > 70 ? 'warning' : 'success'
                          }
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                          使用率: {component.usage.toFixed(1)}%
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
      
      {/* リソース使用状況 */}
      {resourceUsage && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            リソース使用状況
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={3}>
            {/* CPU情報 */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="CPU" avatar={<SpeedIcon />} />
                <CardContent>
                  <Typography variant="body2">
                    モデル: {resourceUsage.cpu.model}
                  </Typography>
                  <Typography variant="body2">
                    コア数: {resourceUsage.cpu.cores}
                  </Typography>
                  <Typography variant="body2">
                    負荷平均: {resourceUsage.cpu.loadAverage.map(load => load.toFixed(2)).join(', ')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            {/* メモリ情報 */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="メモリ" avatar={<MemoryIcon />} />
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={parseFloat(resourceUsage.memory.usagePercentage)}
                      color={
                        parseFloat(resourceUsage.memory.usagePercentage) > 90 ? 'error' :
                        parseFloat(resourceUsage.memory.usagePercentage) > 70 ? 'warning' : 'success'
                      }
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                      使用率: {resourceUsage.memory.usagePercentage}%
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    合計: {formatBytes(resourceUsage.memory.total)}
                  </Typography>
                  <Typography variant="body2">
                    使用中: {formatBytes(resourceUsage.memory.used)}
                  </Typography>
                  <Typography variant="body2">
                    空き: {formatBytes(resourceUsage.memory.free)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            {/* ディスク情報 */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title="ディスク" avatar={<StorageIcon />} />
                <CardContent>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ドライブ</TableCell>
                          <TableCell>合計</TableCell>
                          <TableCell>使用中</TableCell>
                          <TableCell>空き</TableCell>
                          <TableCell>使用率</TableCell>
                          <TableCell>状態</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(resourceUsage.disk).map(([drive, info]) => (
                          <TableRow key={drive}>
                            <TableCell>{drive}</TableCell>
                            <TableCell>{formatBytes(info.total)}</TableCell>
                            <TableCell>{formatBytes(info.used)}</TableCell>
                            <TableCell>{formatBytes(info.free)}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ width: '100%', mr: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={parseFloat(info.usagePercentage)}
                                    color={
                                      parseFloat(info.usagePercentage) > 90 ? 'error' :
                                      parseFloat(info.usagePercentage) > 70 ? 'warning' : 'success'
                                    }
                                  />
                                </Box>
                                <Box sx={{ minWidth: 35 }}>
                                  <Typography variant="body2" color="textSecondary">
                                    {info.usagePercentage}%
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              {parseFloat(info.usagePercentage) > 90 ? (
                                <Chip size="small" label="危機的" color="error" />
                              ) : parseFloat(info.usagePercentage) > 70 ? (
                                <Chip size="small" label="警告" color="warning" />
                              ) : (
                                <Chip size="small" label="正常" color="success" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            
            {/* システム情報 */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="システム情報" avatar={<DnsIcon />} />
                <CardContent>
                  <Typography variant="body2">
                    ホスト名: {resourceUsage.system.hostname}
                  </Typography>
                  <Typography variant="body2">
                    プラットフォーム: {resourceUsage.system.platform} {resourceUsage.system.release}
                  </Typography>
                  <Typography variant="body2">
                    稼働時間: {formatUptime(resourceUsage.system.uptime)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {/* セキュリティアラート */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          セキュリティアラート
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {securityAlerts.length === 0 ? (
          <Alert severity="success">
            現在、アクティブなセキュリティアラートはありません
          </Alert>
        ) : (
          <List>
            {securityAlerts.map((alert) => (
              <ListItem
                key={alert.id}
                sx={{
                  mb: 1,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 
                    alert.severity === 'critical' ? 'error.light' :
                    alert.severity === 'high' ? 'error.100' :
                    alert.severity === 'medium' ? 'warning.100' : 'info.100'
                }}
              >
                <ListItemIcon>
                  {alert.severity === 'critical' || alert.severity === 'high' ? (
                    <ErrorIcon color="error" />
                  ) : alert.severity === 'medium' ? (
                    <WarningIcon color="warning" />
                  ) : (
                    <InfoIcon color="info" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center">
                      <Typography variant="subtitle1">
                        {alert.type}
                      </Typography>
                      <Chip
                        label={
                          alert.severity === 'critical' ? '重大' :
                          alert.severity === 'high' ? '高' :
                          alert.severity === 'medium' ? '中' : '低'
                        }
                        color={
                          alert.severity === 'critical' || alert.severity === 'high' ? 'error' :
                          alert.severity === 'medium' ? 'warning' : 'info'
                        }
                        size="small"
                        sx={{ ml: 1 }}
                      />
                      <Chip
                        label={
                          alert.status === 'active' ? 'アクティブ' :
                          alert.status === 'acknowledged' ? '確認済み' : '解決済み'
                        }
                        color={
                          alert.status === 'active' ? 'error' :
                          alert.status === 'acknowledged' ? 'warning' : 'success'
                        }
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" component="span">
                        {alert.message}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" component="div">
                        ソース: {alert.source} | 検出時刻: {new Date(alert.timestamp).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default SystemStatusDashboard;