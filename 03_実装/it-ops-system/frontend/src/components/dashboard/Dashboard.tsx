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
} from '@mui/material';
import { SystemMetrics, Alert, LogEntry } from '../../types/api';
import { metricsApi, alertsApi, logsApi } from '../../services/api';
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
        metricsApi.getMetrics(),
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
    const interval = setInterval(fetchData, 30000); // 30秒ごとに更新

    return () => clearInterval(interval);
  }, []);

  const handleAlertAcknowledge = async (alertId: string) => {
    try {
      await alertsApi.acknowledgeAlert(alertId);
      await fetchData(); // データを再取得
    } catch (err) {
      console.error('Alert acknowledge error:', err);
      setError('アラートの確認に失敗しました');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box mt={4} mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          システム監視ダッシュボード
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* システムメトリクス */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3}>
            <Box p={3}>
              <Typography variant="h6" gutterBottom>
                システムメトリクス
              </Typography>
              {metrics && <MetricsChart data={metrics} />}
            </Box>
          </Paper>
        </Grid>

        {/* アラート */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3}>
            <Box p={3}>
              <Typography variant="h6" gutterBottom>
                アクティブアラート
              </Typography>
              <AlertList alerts={alerts} onAcknowledge={handleAlertAcknowledge} />
            </Box>
          </Paper>
        </Grid>

        {/* リソース使用状況 */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3}>
            <Box p={3}>
              <Typography variant="h6" gutterBottom>
                リソース使用状況
              </Typography>
              {metrics && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Card>
                      <CardHeader title="CPU使用率" />
                      <CardContent>
                        <Typography variant="h4">{`${metrics.cpu.usage.toFixed(1)}%`}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card>
                      <CardHeader title="メモリ使用率" />
                      <CardContent>
                        <Typography variant="h4">
                          {`${((metrics.memory.used / metrics.memory.total) * 100).toFixed(1)}%`}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* システムログ */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3}>
            <Box p={3}>
              <Typography variant="h6" gutterBottom>
                システムログ
              </Typography>
              <LogViewer logs={logs} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;