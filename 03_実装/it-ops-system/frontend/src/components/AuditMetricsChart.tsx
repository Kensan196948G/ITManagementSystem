import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface MetricData {
  timestamp: Date;
  value: number;
}

interface AuditMetricsChartProps {
  title: string;
  metricName: string;
}

export const AuditMetricsChart: React.FC<AuditMetricsChartProps> = ({
  title,
  metricName
}) => {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aggregation, setAggregation] = useState<'sum' | 'avg' | 'min' | 'max' | 'count'>('count');
  const [interval, setInterval] = useState<'hour' | 'day' | 'week' | 'month'>('day');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/permission-audit/metrics?name=${metricName}&aggregation=${aggregation}&interval=${interval}`);
      
      if (!response.ok) {
        throw new Error('メトリクスの取得に失敗しました');
      }

      const data = await response.json();
      setMetrics(data.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メトリクスの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [metricName, aggregation, interval]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>集計方法</InputLabel>
                <Select
                  value={aggregation}
                  label="集計方法"
                  onChange={(e) => setAggregation(e.target.value as any)}
                >
                  <MenuItem value="count">カウント</MenuItem>
                  <MenuItem value="sum">合計</MenuItem>
                  <MenuItem value="avg">平均</MenuItem>
                  <MenuItem value="min">最小</MenuItem>
                  <MenuItem value="max">最大</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>期間</InputLabel>
                <Select
                  value={interval}
                  label="期間"
                  onChange={(e) => setInterval(e.target.value as any)}
                >
                  <MenuItem value="hour">時間単位</MenuItem>
                  <MenuItem value="day">日単位</MenuItem>
                  <MenuItem value="week">週単位</MenuItem>
                  <MenuItem value="month">月単位</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
        
        <Box height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                formatter={(value: number) => [value.toLocaleString(), '値']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};