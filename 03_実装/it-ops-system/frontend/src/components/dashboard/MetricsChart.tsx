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
import { SystemMetrics } from '../../types/api';

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

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
    tension: number;
    borderWidth: number;
  }>;
}

const MetricsChart: React.FC<MetricsChartProps> = ({ data }) => {
  const theme = useTheme();
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    datasets: [],
  });

  const bytesToMbps = (bytes: number): number => {
    return Number((bytes * 8 / 1000000).toFixed(2));
  };

  const bytesToGB = (bytes: number): number => {
    return Number((bytes / (1024 * 1024 * 1024)).toFixed(2));
  };

  useEffect(() => {
    setChartData(prevData => {
      const now = new Date();
      const labels = [
        ...((prevData.labels as string[]).slice(-19)),
        now.toLocaleTimeString('ja-JP')
      ];

      const cpuData = [...(prevData.datasets[0]?.data || []).slice(-19), data.cpu.usage].slice(-20);
      const memoryData = [...(prevData.datasets[1]?.data || []).slice(-19), 
        (data.memory.used / data.memory.total) * 100].slice(-20);
      const networkInData = [...(prevData.datasets[2]?.data || []).slice(-19), 
        bytesToMbps(data.network.bytesIn)].slice(-20);
      const networkOutData = [...(prevData.datasets[3]?.data || []).slice(-19), 
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
            tension: 0.4,
            borderWidth: 2,
          },
          {
            label: 'メモリ使用率 (%)',
            data: memoryData,
            borderColor: theme.palette.secondary.main,
            backgroundColor: theme.palette.secondary.light,
            fill: false,
            tension: 0.4,
            borderWidth: 2,
          },
          {
            label: 'ネットワーク受信 (Mbps)',
            data: networkInData,
            borderColor: theme.palette.success.main,
            backgroundColor: theme.palette.success.light,
            fill: false,
            tension: 0.4,
            borderWidth: 2,
          },
          {
            label: 'ネットワーク送信 (Mbps)',
            data: networkOutData,
            borderColor: theme.palette.warning.main,
            backgroundColor: theme.palette.warning.light,
            fill: false,
            tension: 0.4,
            borderWidth: 2,
          }
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
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: function(value) {
            return value.toString();
          },
          color: theme.palette.text.secondary,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: theme.palette.text.secondary,
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
          color: theme.palette.text.primary,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: 400,
      p: 2,
      backgroundColor: '#ffffff',
      borderRadius: 1,
      boxShadow: '0 0 10px rgba(0,0,0,0.1) inset'
    }}>
      <Line data={chartData} options={options} />
    </Box>
  );
};

export default MetricsChart;