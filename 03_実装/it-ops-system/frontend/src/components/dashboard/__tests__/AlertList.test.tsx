import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import AlertList from '../AlertList';
import { Alert } from '../../../types/api';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

describe('AlertList Component', () => {
  const mockAlerts: Alert[] = [
    {
      id: 'alert-1',
      type: 'critical',
      source: 'system',
      message: 'Critical system error',
      timestamp: new Date(),
      acknowledged: false,
    },
    {
      id: 'alert-2',
      type: 'warning',
      source: 'network',
      message: 'Network performance degraded',
      timestamp: new Date(),
      acknowledged: false,
    },
    {
      id: 'alert-3',
      type: 'info',
      source: 'application',
      message: 'Application update available',
      timestamp: new Date(),
      acknowledged: true,
      acknowledgedBy: 'admin',
      acknowledgedAt: new Date(),
    },
  ];

  const mockOnAcknowledge = jest.fn();

  const renderComponent = (alerts = mockAlerts) => {
    return render(
      <ThemeProvider theme={theme}>
        <AlertList alerts={alerts} onAcknowledge={mockOnAcknowledge} />
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('アラート一覧の表示', () => {
    renderComponent();

    expect(screen.getByText('Critical system error')).toBeInTheDocument();
    expect(screen.getByText('Network performance degraded')).toBeInTheDocument();
    expect(screen.getByText('Application update available')).toBeInTheDocument();
  });

  it('アラートタイプに応じたアイコンの表示', () => {
    renderComponent();

    const criticalIcon = screen.getByTestId('ErrorIcon-critical');
    const warningIcon = screen.getByTestId('WarningIcon-warning');
    const infoIcon = screen.getByTestId('InfoIcon-info');

    expect(criticalIcon).toBeInTheDocument();
    expect(warningIcon).toBeInTheDocument();
    expect(infoIcon).toBeInTheDocument();
  });

  it('アラート確認機能の動作確認', () => {
    renderComponent();

    const acknowledgeButtons = screen.getAllByLabelText('acknowledge');
    fireEvent.click(acknowledgeButtons[0]);

    expect(mockOnAcknowledge).toHaveBeenCalledWith('alert-1');
  });

  it('確認済みアラートの表示', () => {
    renderComponent();

    const acknowledgedAlert = screen.getByText('Application update available');
    const acknowledgedBy = screen.getByText(/確認者: admin/);

    expect(acknowledgedAlert).toBeInTheDocument();
    expect(acknowledgedBy).toBeInTheDocument();
  });

  it('アラートが空の場合のメッセージ表示', () => {
    renderComponent([]);

    expect(screen.getByText('アクティブなアラートはありません')).toBeInTheDocument();
  });

  it('タイムスタンプの正しい表示', () => {
    const now = new Date();
    const alerts = [
      {
        ...mockAlerts[0],
        timestamp: now,
      },
    ];

    renderComponent(alerts);

    const formattedTime = format(now, 'PP pp', { locale: ja });
    expect(screen.getByText(new RegExp(formattedTime))).toBeInTheDocument();
  });

  it('アラートソースの表示', () => {
    renderComponent();

    expect(screen.getByText(/ソース: system/)).toBeInTheDocument();
    expect(screen.getByText(/ソース: network/)).toBeInTheDocument();
    expect(screen.getByText(/ソース: application/)).toBeInTheDocument();
  });

  describe('アラートの状態表示', () => {
    it('未確認アラートのスタイル', () => {
      renderComponent();
      const unacknowledgedAlert = screen.getByText('Critical system error')
        .closest('li');

      expect(unacknowledgedAlert).toHaveStyle({ opacity: 1 });
    });

    it('確認済みアラートのスタイル', () => {
      renderComponent();
      const acknowledgedAlert = screen.getByText('Application update available')
        .closest('li');

      expect(acknowledgedAlert).toHaveStyle({ opacity: 0.7 });
    });
  });

  describe('エッジケース', () => {
    it('長いメッセージの表示', () => {
      const longMessage = 'a'.repeat(200);
      const alertsWithLongMessage = [
        {
          ...mockAlerts[0],
          message: longMessage,
        },
      ];

      renderComponent(alertsWithLongMessage);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('無効な日付の処理', () => {
      const alertsWithInvalidDate = [
        {
          ...mockAlerts[0],
          timestamp: new Date('invalid date'),
        },
      ];

      renderComponent(alertsWithInvalidDate);
      expect(screen.getByText(/Critical system error/)).toBeInTheDocument();
    });
  });
});