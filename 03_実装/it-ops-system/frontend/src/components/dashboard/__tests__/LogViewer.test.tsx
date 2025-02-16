import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import LogViewer from '../LogViewer';
import { LogEntry } from '../../../types/api';
import userEvent from '@testing-library/user-event';

describe('LogViewer Component', () => {
  const mockLogs: LogEntry[] = [
    {
      id: 'log-1',
      timestamp: new Date('2025-02-16T10:00:00'),
      level: 'error',
      source: 'system',
      message: 'Database connection failed',
      metadata: { errno: 500 },
    },
    {
      id: 'log-2',
      timestamp: new Date('2025-02-16T10:01:00'),
      level: 'warning',
      source: 'network',
      message: 'High latency detected',
      metadata: { latency: 500 },
    },
    {
      id: 'log-3',
      timestamp: new Date('2025-02-16T10:02:00'),
      level: 'info',
      source: 'application',
      message: 'User login successful',
      metadata: { userId: 'user123' },
    },
  ];

  const renderComponent = (logs = mockLogs) => {
    return render(
      <ThemeProvider theme={theme}>
        <LogViewer logs={logs} />
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ログ一覧の表示', () => {
    renderComponent();

    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    expect(screen.getByText('High latency detected')).toBeInTheDocument();
    expect(screen.getByText('User login successful')).toBeInTheDocument();
  });

  it('ログレベルに応じたアイコンの表示', () => {
    renderComponent();

    const errorIcon = screen.getByTestId('ErrorIcon');
    const warningIcon = screen.getByTestId('WarningIcon');
    const infoIcon = screen.getByTestId('InfoIcon');

    expect(errorIcon).toBeInTheDocument();
    expect(warningIcon).toBeInTheDocument();
    expect(infoIcon).toBeInTheDocument();
  });

  describe('フィルタリング機能', () => {
    it('ログレベルでのフィルタリング', async () => {
      renderComponent();
      
      const levelFilter = screen.getByLabelText('ログレベル');
      await userEvent.click(levelFilter);
      await userEvent.click(screen.getByText('エラー'));

      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      expect(screen.queryByText('High latency detected')).not.toBeInTheDocument();
      expect(screen.queryByText('User login successful')).not.toBeInTheDocument();
    });

    it('ソースでのフィルタリング', async () => {
      renderComponent();
      
      const sourceFilter = screen.getByLabelText('ソース');
      await userEvent.click(sourceFilter);
      await userEvent.click(screen.getByText('system'));

      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      expect(screen.queryByText('High latency detected')).not.toBeInTheDocument();
      expect(screen.queryByText('User login successful')).not.toBeInTheDocument();
    });

    it('検索機能', async () => {
      renderComponent();
      
      const searchInput = screen.getByLabelText('検索');
      await userEvent.type(searchInput, 'latency');

      expect(screen.queryByText('Database connection failed')).not.toBeInTheDocument();
      expect(screen.getByText('High latency detected')).toBeInTheDocument();
      expect(screen.queryByText('User login successful')).not.toBeInTheDocument();
    });
  });

  describe('ソート機能', () => {
    it('タイムスタンプでのソート', () => {
      renderComponent();
      
      const rows = screen.getAllByRole('row');
      const timestamps = rows.slice(1).map(row => 
        within(row).getByText(/\d{4}-\d{2}-\d{2}/).textContent
      );

      expect(timestamps).toEqual([...timestamps].sort());
    });
  });

  it('ログが空の場合のメッセージ表示', () => {
    renderComponent([]);
    expect(screen.getByText('ログが見つかりません')).toBeInTheDocument();
  });

  describe('エッジケース', () => {
    it('長いメッセージの表示', () => {
      const longMessage = 'a'.repeat(200);
      const logsWithLongMessage = [
        {
          ...mockLogs[0],
          message: longMessage,
        },
      ];

      renderComponent(logsWithLongMessage);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('無効なタイムスタンプの処理', () => {
      const logsWithInvalidDate = [
        {
          ...mockLogs[0],
          timestamp: new Date('invalid date'),
        },
      ];

      renderComponent(logsWithInvalidDate);
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });

    it('特殊文字を含むメッセージの処理', () => {
      const specialChars = '<script>alert("test")</script>';
      const logsWithSpecialChars = [
        {
          ...mockLogs[0],
          message: specialChars,
        },
      ];

      renderComponent(logsWithSpecialChars);
      const message = screen.getByText(specialChars);
      expect(message).toBeInTheDocument();
      expect(message.innerHTML).not.toBe(specialChars);
    });
  });

  describe('パフォーマンス', () => {
    it('大量のログの表示', () => {
      const manyLogs = Array(1000).fill(null).map((_, index) => ({
        ...mockLogs[0],
        id: `log-${index}`,
        message: `Log message ${index}`,
      }));

      renderComponent(manyLogs);
      expect(screen.getAllByRole('row')).toHaveLength(1001); // ヘッダー行 + データ行
    });
  });
});