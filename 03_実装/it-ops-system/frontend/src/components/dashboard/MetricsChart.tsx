import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Box, useTheme } from '@mui/material';
import { SystemMetrics, MetricsChartData } from '../../types/api';

// Chart.jsの設定
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MetricsChartProps {
  data: SystemMetrics;
}

const MetricsChart: React.FC<MetricsChartProps> = ({ data }) => {
  const theme = useTheme();
  const [chartData, setChartData] = useState<MetricsChartData>({
    labels: [],
    datasets: [],
  });

  // メモリ使用量をGBに変換
  const bytesToGB = (bytes: number): number => {
    return Number((bytes / (1024 * 1024 * 1024)).toFixed(2));
  };

  // ネットワークトラフィックをMbpsに変換
  const bytesToMbps = (bytes: number): number => {
    return Number((bytes * 8 / 1000000).toFixed(2));
  };

  useEffect(() => {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString();

    setChartData((prevData) => {
      const labels = [...prevData.labels, timeLabel].slice(-20);
      const cpuData = [...(prevData.datasets[0]?.data || []), data.cpu.usage].slice(-20);
      const memoryData = [...(prevData.datasets[1]?.data || []), 
        (data.memory.used / data.memory.total) * 100].slice(-20);
      const networkInData = [...(prevData.datasets[2]?.data || []), 
        bytesToMbps(data.network.bytesIn)].slice(-20);
      const networkOutData = [...(prevData.datasets[3]?.data || []), 
        bytesToMbps(data.network.bytesOut)].slice(-20);

      return {
        labels,
        datasets: [
          {
            label: 'CPU使用率 (%)',
            data: cpuData,
            borderColor: theme.palette.primary.main,
            backgroundColor: theme.palette.primary.light,
            fill: false,
          },
          {
            label: 'メモリ使用率 (%)',
            data: memoryData,
            borderColor: theme.palette.secondary.main,
            backgroundColor: theme.palette.secondary.light,
            fill: false,
          },
          {
            label: 'ネットワーク受信 (Mbps)',
            data: networkInData,
            borderColor: theme.palette.success.main,
            backgroundColor: theme.palette.success.light,
            fill: false,
          },
          {
            label: 'ネットワーク送信 (Mbps)',
            data: networkOutData,
            borderColor: theme.palette.warning.main,
            backgroundColor: theme.palette.warning.light,
            fill: false,
          },
        ],
      };
    });
  }, [data, theme.palette]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300,
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `${value}`,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'システムメトリクス',
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <Line data={chartData} options={options} />
    </Box>
  );
};

export default MetricsChart;