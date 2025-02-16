import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import MetricsChart from '../MetricsChart';
import { mockMetricsData } from '../../../tests/mockData';

// Chart.jsのモック
jest.mock('react-chartjs-2', () => ({
  Line: jest.fn().mockImplementation(({ data, options }) => (
    <div data-testid="mock-chart">
      <span data-testid="chart-data">{JSON.stringify(data)}</span>
      <span data-testid="chart-options">{JSON.stringify(options)}</span>
    </div>
  )),
}));

describe('MetricsChart Component', () => {
  const mockData = mockMetricsData;

  const renderComponent = () => {
    return render(
      <ThemeProvider theme={theme}>
        <MetricsChart data={mockData} />
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('グラフコンポーネントのレンダリング', () => {
    renderComponent();
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
  });

  it('正しいデータセットの構造確認', () => {
    renderComponent();
    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '');

    expect(chartData.datasets).toHaveLength(4); // CPU, メモリ, ネットワーク入力/出力
    expect(chartData.datasets[0]).toHaveProperty('label', 'CPU使用率 (%)');
    expect(chartData.datasets[1]).toHaveProperty('label', 'メモリ使用率 (%)');
    expect(chartData.datasets[2]).toHaveProperty('label', 'ネットワーク受信 (Mbps)');
    expect(chartData.datasets[3]).toHaveProperty('label', 'ネットワーク送信 (Mbps)');
  });

  it('グラフオプションの設定確認', () => {
    renderComponent();
    const chartOptions = JSON.parse(screen.getByTestId('chart-options').textContent || '');

    expect(chartOptions).toHaveProperty('responsive', true);
    expect(chartOptions).toHaveProperty('maintainAspectRatio', false);
    expect(chartOptions.plugins.title.text).toBe('システムメトリクス');
  });

  it('データ更新時のグラフ更新', () => {
    const { rerender } = renderComponent();

    const updatedData = {
      ...mockData,
      cpu: { usage: 80, temperature: 70 },
    };

    rerender(
      <ThemeProvider theme={theme}>
        <MetricsChart data={updatedData} />
      </ThemeProvider>
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '');
    expect(chartData.datasets[0].data).toContain(80);
  });

  it('メモリ使用率の計算確認', () => {
    renderComponent();
    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '');
    const memoryUsagePercent = (mockData.memory.used / mockData.memory.total) * 100;
    
    expect(chartData.datasets[1].data).toContain(memoryUsagePercent);
  });

  it('ネットワークトラフィックの単位変換確認', () => {
    renderComponent();
    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '');
    const bytesToMbps = (bytes: number) => Number((bytes * 8 / 1000000).toFixed(2));

    expect(chartData.datasets[2].data).toContain(bytesToMbps(mockData.network.bytesIn));
    expect(chartData.datasets[3].data).toContain(bytesToMbps(mockData.network.bytesOut));
  });

  it('グラフのレスポンシブ設定確認', () => {
    const { container } = renderComponent();
    
    expect(container.firstChild).toHaveStyle({
      width: '100%',
      height: '400px',
    });
  });

  it('テーマカラーの適用確認', () => {
    renderComponent();
    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '');

    chartData.datasets.forEach((dataset: any) => {
      expect(dataset).toHaveProperty('borderColor');
      expect(dataset).toHaveProperty('backgroundColor');
    });
  });

  describe('エッジケース', () => {
    it('ゼロ値のデータ処理', () => {
      const zeroData = {
        ...mockData,
        cpu: { usage: 0, temperature: 0 },
        memory: { total: 1000, used: 0, free: 1000 },
        network: { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 },
      };

      render(
        <ThemeProvider theme={theme}>
          <MetricsChart data={zeroData} />
        </ThemeProvider>
      );

      const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '');
      expect(chartData.datasets[0].data).toContain(0);
      expect(chartData.datasets[1].data).toContain(0);
    });

    it('異常値のデータ処理', () => {
      const extremeData = {
        ...mockData,
        cpu: { usage: 100.5, temperature: 1000 },
        memory: { total: 1000, used: 1500, free: -500 },
      };

      render(
        <ThemeProvider theme={theme}>
          <MetricsChart data={extremeData} />
        </ThemeProvider>
      );

      const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '');
      expect(chartData.datasets[0].data.every((value: number) => value <= 100)).toBe(true);
    });
  });
});