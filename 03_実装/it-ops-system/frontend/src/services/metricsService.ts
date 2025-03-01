import { SystemMetrics, ApiResponse } from '../types/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

class MetricsService {
  private pollingInterval: NodeJS.Timeout | null = null;

  async getSystemMetrics(): Promise<SystemMetrics> {
    const response = await fetch(`${API_BASE_URL}/metrics/system`);
    const data: ApiResponse<SystemMetrics> = await response.json();
    if (data.status === 'error' || !data.data) {
      throw new Error(data.message || 'Failed to fetch metrics');
    }
    return data.data;
  }

  async startMetricsPolling(callback: (metrics: SystemMetrics) => void, interval = 5000): Promise<() => void> {
    // 初回データ取得
    try {
      const initialMetrics = await this.getSystemMetrics();
      callback(initialMetrics);
    } catch (error) {
      console.error('Failed to fetch initial metrics:', error);
    }

    // ポーリング開始
    this.pollingInterval = setInterval(async () => {
      try {
        const metrics = await this.getSystemMetrics();
        callback(metrics);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    }, interval);

    // クリーンアップ関数を返す
    return () => {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    };
  }
}

export const metricsService = new MetricsService();