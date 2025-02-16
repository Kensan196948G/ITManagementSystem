import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import Dashboard from '../Dashboard';
import { metricsApi, alertsApi, logsApi } from '../../../services/api';
import { mockMetricsData, mockAlertData } from '../../../tests/mockData';

// APIモック
jest.mock('../../../services/api', () => ({
  metricsApi: {
    getMetrics: jest.fn(),
  },
  alertsApi: {
    getAlerts: jest.fn(),
    acknowledgeAlert: jest.fn(),
  },
  logsApi: {
    getLogs: jest.fn(),
  },
}));

describe('Dashboard Component', () => {
  const mockMetrics = mockMetricsData;
  const mockAlerts = [mockAlertData];
  const mockLogs = [
    {
      id: 'test-log-1',
      timestamp: new Date(),
      level: 'info',
      source: 'system',
      message: 'Test log message',
      metadata: {},
    },
  ];

  beforeEach(() => {
    // APIモックのリセット
    jest.clearAllMocks();
    
    // 成功時のレスポンスを設定
    (metricsApi.getMetrics as jest.Mock).mockResolvedValue(mockMetrics);
    (alertsApi.getAlerts as jest.Mock).mockResolvedValue(mockAlerts);
    (logsApi.getLogs as jest.Mock).mockResolvedValue(mockLogs);
  });

  it('ダッシュボードの初期レンダリング - ローディング状態', () => {
    render(
      <ThemeProvider theme={theme}>
        <Dashboard />
      </ThemeProvider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('データ取得成功時の表示', async () => {
    render(
      <ThemeProvider theme={theme}>
        <Dashboard />
      </ThemeProvider>
    );

    await waitFor(() => {
      // メトリクスの表示確認
      expect(screen.getByText('システムメトリクス')).toBeInTheDocument();
      expect(screen.getByText(`${mockMetrics.cpu.usage.toFixed(1)}%`)).toBeInTheDocument();

      // アラートの表示確認
      expect(screen.getByText('アクティブアラート')).toBeInTheDocument();
      expect(screen.getByText(mockAlerts[0].message)).toBeInTheDocument();

      // ログの表示確認
      expect(screen.getByText('システムログ')).toBeInTheDocument();
      expect(screen.getByText(mockLogs[0].message)).toBeInTheDocument();
    });
  });

  it('データ取得エラー時の表示', async () => {
    const errorMessage = 'データの取得に失敗しました';
    (metricsApi.getMetrics as jest.Mock).mockRejectedValue(new Error(errorMessage));

    render(
      <ThemeProvider theme={theme}>
        <Dashboard />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('30秒ごとのデータ更新', async () => {
    jest.useFakeTimers();

    render(
      <ThemeProvider theme={theme}>
        <Dashboard />
      </ThemeProvider>
    );

    // 初回データ取得の確認
    await waitFor(() => {
      expect(metricsApi.getMetrics).toHaveBeenCalledTimes(1);
    });

    // 30秒経過
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // 2回目のデータ取得の確認
    await waitFor(() => {
      expect(metricsApi.getMetrics).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('アラート確認機能の動作確認', async () => {
    const acknowledgeSuccess = { status: 'success', message: 'Alert acknowledged' };
    (alertsApi.acknowledgeAlert as jest.Mock).mockResolvedValue(acknowledgeSuccess);

    render(
      <ThemeProvider theme={theme}>
        <Dashboard />
      </ThemeProvider>
    );

    await waitFor(() => {
      const acknowledgeButton = screen.getByLabelText('acknowledge');
      acknowledgeButton.click();
    });

    await waitFor(() => {
      expect(alertsApi.acknowledgeAlert).toHaveBeenCalledWith(mockAlerts[0].id);
    });
  });

  it('リソース使用状況の表示確認', async () => {
    render(
      <ThemeProvider theme={theme}>
        <Dashboard />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('CPU使用率')).toBeInTheDocument();
      expect(screen.getByText('メモリ使用率')).toBeInTheDocument();
      
      const cpuUsage = `${mockMetrics.cpu.usage.toFixed(1)}%`;
      const memoryUsage = `${((mockMetrics.memory.used / mockMetrics.memory.total) * 100).toFixed(1)}%`;
      
      expect(screen.getByText(cpuUsage)).toBeInTheDocument();
      expect(screen.getByText(memoryUsage)).toBeInTheDocument();
    });
  });
});