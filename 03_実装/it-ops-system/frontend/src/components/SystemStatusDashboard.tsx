import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  CircularProgress, 
  Chip,
  LinearProgress,
  Divider,
  Paper,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Wifi as WifiIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip as ChartTooltip, 
  Legend 
} from 'chart.js';
import api from '../services/api';

// ChartJSの登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

// システムステータスの型定義
interface SystemStatus {
  status: 'healthy' | 'degraded' | 'critical';
  components: {
    database: { status: 'healthy' | 'degraded' | 'critical' };
    api: { status: 'healthy' | 'degraded' | 'critical' };
    filesystem: { status: 'healthy' | 'degraded' | 'critical' };
    memory: { 
      status: 'healthy' | 'degraded' | 'critical';
      usage: number;
    };
  };
  lastChecked: string;
}

// リソース使用状況の型定義
interface ResourceUsage {
  cpu: {
    usage: {
      user: number;
      system: number;
    };
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
  network: {
    [key: string]: any;
  };
  system: {
    platform: string;
    release: string;
    hostname: string;
    uptime: number;
  };
  timestamp: string;
}

// 履歴データの型定義
interface HistoricalData {
  timestamps: string[];
  cpu: number[];
  memory: number[];
  disk: number[];
}

const SystemStatusDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [resourceUsage, setResourceUsage] = useState<ResourceUsage | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'history'>('overview');
  const [refreshInterval, setRefreshInterval] = useState<number>(60000); // 1分
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // システムステータスの取得
  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/system-status/status');
      setSystemStatus(response.data.data);
      
      setLoading(false);
    } catch (err) {
      setError(t('systemStatus.fetchError'));
      setLoading(false);
      console.error('Error fetching system status:', err);
    }
  };

  // リソース使用状況の取得
  const fetchResourceUsage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/system-status/resources');
      setResourceUsage(response.data.data);
      
      setLoading(false);
    } catch (err) {
      setError(t('systemStatus.fetchError'));
      setLoading(false);
      console.error('Error fetching resource usage:', err);
    }
  };

  // 履歴データの取得
  const fetchHistoricalData = async (period: 'day' | 'week' | 'month' = 'day') => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/system-status/history?period=${period}`);
      setHistoricalData(response.data.data);
      
      setLoading(false);
    } catch (err) {
      setError(t('systemStatus.fetchError'));
      setLoading(false);
      console.error('Error fetching historical data:', err);
    }
  };

  // 手動更新
  const handleRefresh = () => {
    if (activeTab === 'overview') {
      fetchSystemStatus();
    } else if (activeTab === 'resources') {
      fetchResourceUsage();
    } else if (activeTab === 'history') {
      fetchHistoricalData();
    }
  };

  // タブ切り替え
  const handleTabChange = (tab: 'overview' | 'resources' | 'history') => {
    setActiveTab(tab);
    
    if (tab === 'overview' && !systemStatus) {
      fetchSystemStatus();
    } else if (tab === 'resources' && !resourceUsage) {
      fetchResourceUsage();
    } else if (tab === 'history' && !historicalData) {
      fetchHistoricalData();
    }
  };

  // 自動更新の設定
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        handleRefresh();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, activeTab]);

  // 初期データ取得
  useEffect(() => {
    fetchSystemStatus();
  }, []);

  // ステータスに応じた色を取得
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

  // ステータスに応じたアイコンを取得
  const getStatusIcon = (status: 'healthy' | 'degraded' | 'critical') => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon color="success" />;
      case 'degraded':
        return <WarningIcon color="warning" />;
      case 'critical':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  // バイト単位を人間が読みやすい形式に変換
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 秒単位の時間を人間が読みやすい形式に変換
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}${t('systemStatus.days')} ${hours}${t('systemStatus.hours')} ${minutes}${t('systemStatus.minutes')}`;
  };

  // 履歴データのチャートオプション
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: t('systemStatus.resourceHistory'),
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: t('systemStatus.usagePercentage'),
        },
      },
    },
  };

  // 履歴データのチャートデータ
  const chartData = historicalData ? {
    labels: historicalData.timestamps.map(timestamp => 
      format(new Date(timestamp), 'MM/dd HH:mm', { locale: ja })
    ),
    datasets: [
      {
        label: 'CPU',
        data: historicalData.cpu,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: t('systemStatus.memory'),
        data: historicalData.memory,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: t('systemStatus.disk'),
        data: historicalData.disk,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
    ],
  } : { labels: [], datasets: [] };

  // ローディング表示
  if (loading && !systemStatus && !resourceUsage && !historicalData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  // エラー表示
  if (error && !systemStatus && !resourceUsage && !historicalData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          {t('systemStatus.title')}
        </Typography>
        <Box>
          <Tooltip title={t('systemStatus.refresh')}>
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* タブナビゲーション */}
      <Box sx={{ display: 'flex', mb: 2 }}>
        <Button 
          variant={activeTab === 'overview' ? 'contained' : 'outlined'} 
          onClick={() => handleTabChange('overview')}
          sx={{ mr: 1 }}
        >
          {t('systemStatus.overview')}
        </Button>
        <Button 
          variant={activeTab === 'resources' ? 'contained' : 'outlined'} 
          onClick={() => handleTabChange('resources')}
          sx={{ mr: 1 }}
        >
          {t('systemStatus.resources')}
        </Button>
        <Button 
          variant={activeTab === 'history' ? 'contained' : 'outlined'} 
          onClick={() => handleTabChange('history')}
        >
          {t('systemStatus.history')}
        </Button>
      </Box>

      {/* 概要タブ */}
      {activeTab === 'overview' && systemStatus && (
        <Grid container spacing={3}>
          {/* システム全体のステータス */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {getStatusIcon(systemStatus.status)}
                  <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                    {t(`systemStatus.status.${systemStatus.status}`)}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {t('systemStatus.lastChecked')}: {format(new Date(systemStatus.lastChecked), 'yyyy/MM/dd HH:mm:ss', { locale: ja })}
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  {/* データベースステータス */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {t('systemStatus.components.database')}
                      </Typography>
                      <Chip 
                        label={t(`systemStatus.status.${systemStatus.components.database.status}`)} 
                        color={getStatusColor(systemStatus.components.database.status) as any}
                        size="small"
                      />
                    </Paper>
                  </Grid>
                  {/* APIステータス */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {t('systemStatus.components.api')}
                      </Typography>
                      <Chip 
                        label={t(`systemStatus.status.${systemStatus.components.api.status}`)} 
                        color={getStatusColor(systemStatus.components.api.status) as any}
                        size="small"
                      />
                    </Paper>
                  </Grid>
                  {/* ファイルシステムステータス */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {t('systemStatus.components.filesystem')}
                      </Typography>
                      <Chip 
                        label={t(`systemStatus.status.${systemStatus.components.filesystem.status}`)} 
                        color={getStatusColor(systemStatus.components.filesystem.status) as any}
                        size="small"
                      />
                    </Paper>
                  </Grid>
                  {/* メモリステータス */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {t('systemStatus.components.memory')}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip 
                          label={t(`systemStatus.status.${systemStatus.components.memory.status}`)} 
                          color={getStatusColor(systemStatus.components.memory.status) as any}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="body2">
                          {systemStatus.components.memory.usage.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* リソースタブ */}
      {activeTab === 'resources' && resourceUsage && (
        <Grid container spacing={3}>
          {/* CPU使用率 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SpeedIcon color="primary" />
                  <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                    {t('systemStatus.cpu')}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    {t('systemStatus.model')}: {resourceUsage.cpu.model}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {t('systemStatus.cores')}: {resourceUsage.cpu.cores}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {t('systemStatus.loadAverage')}: {resourceUsage.cpu.loadAverage.join(' / ')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: 100 }}>
                    {t('systemStatus.userUsage')}:
                  </Typography>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={resourceUsage.cpu.usage.user / (resourceUsage.cpu.usage.user + resourceUsage.cpu.usage.system) * 100} 
                      color="primary"
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                  <Typography variant="body2">
                    {Math.round(resourceUsage.cpu.usage.user / (resourceUsage.cpu.usage.user + resourceUsage.cpu.usage.system) * 100)}%
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ minWidth: 100 }}>
                    {t('systemStatus.systemUsage')}:
                  </Typography>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={resourceUsage.cpu.usage.system / (resourceUsage.cpu.usage.user + resourceUsage.cpu.usage.system) * 100} 
                      color="secondary"
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                  <Typography variant="body2">
                    {Math.round(resourceUsage.cpu.usage.system / (resourceUsage.cpu.usage.user + resourceUsage.cpu.usage.system) * 100)}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* メモリ使用率 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <MemoryIcon color="primary" />
                  <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                    {t('systemStatus.memory')}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    {t('systemStatus.total')}: {formatBytes(resourceUsage.memory.total)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {t('systemStatus.used')}: {formatBytes(resourceUsage.memory.used)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {t('systemStatus.free')}: {formatBytes(resourceUsage.memory.free)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: 100 }}>
                    {t('systemStatus.usage')}:
                  </Typography>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={parseFloat(resourceUsage.memory.usagePercentage)} 
                      color={
                        parseFloat(resourceUsage.memory.usagePercentage) > 90 ? 'error' :
                        parseFloat(resourceUsage.memory.usagePercentage) > 70 ? 'warning' : 'primary'
                      }
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                  <Typography variant="body2">
                    {resourceUsage.memory.usagePercentage}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* ディスク使用率 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <StorageIcon color="primary" />
                  <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                    {t('systemStatus.disk')}
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  {Object.entries(resourceUsage.disk).map(([drive, data]) => (
                    <Grid item xs={12} md={6} key={drive}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          {drive}
                        </Typography>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" gutterBottom>
                            {t('systemStatus.total')}: {formatBytes(data.total)}
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            {t('systemStatus.used')}: {formatBytes(data.used)}
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            {t('systemStatus.free')}: {formatBytes(data.free)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ minWidth: 100 }}>
                            {t('systemStatus.usage')}:
                          </Typography>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={parseFloat(data.usagePercentage)} 
                              color={
                                parseFloat(data.usagePercentage) > 90 ? 'error' :
                                parseFloat(data.usagePercentage) > 70 ? 'warning' : 'primary'
                              }
                              sx={{ height: 10, borderRadius: 5 }}
                            />
                          </Box>
                          <Typography variant="body2">
                            {data.usagePercentage}%
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* システム情報 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {t('systemStatus.systemInfo')}
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" gutterBottom>
                      <strong>{t('systemStatus.platform')}:</strong> {resourceUsage.system.platform}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" gutterBottom>
                      <strong>{t('systemStatus.release')}:</strong> {resourceUsage.system.release}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" gutterBottom>
                      <strong>{t('systemStatus.hostname')}:</strong> {resourceUsage.system.hostname}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" gutterBottom>
                      <strong>{t('systemStatus.uptime')}:</strong> {formatUptime(resourceUsage.system.uptime)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 履歴タブ */}
      {activeTab === 'history' && historicalData && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TimelineIcon color="primary" />
                  <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                    {t('systemStatus.resourceHistory')}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <Box>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={() => fetchHistoricalData('day')}
                      sx={{ mr: 1 }}
                    >
                      {t('systemStatus.day')}
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={() => fetchHistoricalData('week')}
                      sx={{ mr: 1 }}
                    >
                      {t('systemStatus.week')}
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={() => fetchHistoricalData('month')}
                    >
                      {t('systemStatus.month')}
                    </Button>
                  </Box>
                </Box>
                <Box sx={{ height: 400 }}>
                  <Line options={chartOptions} data={chartData} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default SystemStatusDashboard;