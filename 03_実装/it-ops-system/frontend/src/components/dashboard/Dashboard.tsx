import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Speed as CpuIcon,
  Storage as StorageIcon,
  Warning as AlertIcon,
  Terminal as LogIcon,
} from '@mui/icons-material';
import { SystemMetrics, Alert, LogEntry } from '../../types/api';
import { alertsApi, logsApi } from '../../services/api';
import { metricsService } from '../../services/metricsService';
import MetricsChart from './MetricsChart';
import AlertList from './AlertList';
import LogViewer from './LogViewer';

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [metricsData, alertsData, logsData] = await Promise.all([
        metricsService.getSystemMetrics(),
        alertsApi.getAlerts(),
        logsApi.getLogs(),
      ]);

      setMetrics(metricsData);
      setAlerts(alertsData);
      setLogs(logsData);
      setError(null);
    } catch (err) {
      setError('データの取得に失敗しました');
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    let cleanupFunction: (() => void) | undefined;

    metricsService.startMetricsPolling((newMetrics) => {
      setMetrics(newMetrics);
    }, 5000).then(cleanup => { cleanupFunction = cleanup; });
    
    return () => cleanupFunction?.();
  }, []);

  const handleAlertAcknowledge = async (alertId: string) => {
    try {
      await alertsApi.acknowledgeAlert(alertId);
      await fetchData();
    } catch (err) {
      setError('アラートの確認に失敗しました');
      console.error('Alert acknowledge error:', err);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Paper elevation={3} sx={{ p: 3, backgroundColor: '#fff3f3' }}>
          <Typography color="error" variant="h6" align="center">
            <AlertIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            {error}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* システムメトリクス */}
      <Grid item xs={12} md={8}>
        <Paper 
          elevation={3}
          sx={{
            p: 3,
            background: 'linear-gradient(to right bottom, #ffffff, #f8f9fa)',
          }}
        >
          <Box display="flex" alignItems="center" mb={2}>
            <CpuIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">システムメトリクス</Typography>
          </Box>
          {metrics && <MetricsChart data={metrics} />}
        </Paper>
      </Grid>

      {/* クイックステータス */}
      <Grid item xs={12} md={4}>
        <Paper 
          elevation={3}
          sx={{
            p: 3,
            background: 'linear-gradient(to right bottom, #ffffff, #f8f9fa)',
          }}
        >
          <Box display="flex" alignItems="center" mb={3}>
            <StorageIcon sx={{ mr: 1, color: 'secondary.main' }} />
            <Typography variant="h6">システムステータス</Typography>
          </Box>
          {metrics && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <CpuIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="subtitle1">CPU使用率</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={metrics.cpu.usage}
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: metrics.cpu.usage > 80 ? '#f44336' : '#4caf50'
                        }
                      }}
                    />
                    <Typography variant="h5" sx={{ mt: 1, textAlign: 'right' }}>
                      {`${metrics.cpu.usage.toFixed(1)}%`}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <MemoryIcon sx={{ mr: 1, color: 'secondary.main' }} />
                      <Typography variant="subtitle1">メモリ使用率</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(metrics.memory.used / metrics.memory.total) * 100}
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: (metrics.memory.used / metrics.memory.total) * 100 > 80 ? '#f44336' : '#4caf50'
                        }
                      }}
                    />
                    <Typography variant="h5" sx={{ mt: 1, textAlign: 'right' }}>
                      {`${((metrics.memory.used / metrics.memory.total) * 100).toFixed(1)}%`}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Paper>
      </Grid>

      {/* アラート */}
      <Grid item xs={12} md={6}>
        <Paper 
          elevation={3}
          sx={{
            p: 3,
            background: 'linear-gradient(to right bottom, #ffffff, #f8f9fa)',
          }}
        >
          <Box display="flex" alignItems="center" mb={2}>
            <AlertIcon sx={{ mr: 1, color: 'warning.main' }} />
            <Typography variant="h6">アクティブアラート</Typography>
          </Box>
          <AlertList alerts={alerts} onAcknowledge={handleAlertAcknowledge} />
        </Paper>
      </Grid>

      {/* システムログ */}
      <Grid item xs={12} md={6}>
        <Paper 
          elevation={3}
          sx={{
            p: 3,
            background: 'linear-gradient(to right bottom, #ffffff, #f8f9fa)',
          }}
        >
          <Box display="flex" alignItems="center" mb={2}>
            <LogIcon sx={{ mr: 1, color: 'info.main' }} />
            <Typography variant="h6">システムログ</Typography>
          </Box>
          <LogViewer logs={logs} />
        </Paper>
      </Grid>
    </Grid>
  );
};

export default Dashboard;