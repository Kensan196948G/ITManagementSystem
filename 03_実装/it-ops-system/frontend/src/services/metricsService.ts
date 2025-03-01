import { SystemMetrics } from '../types/api';
import { axiosInstance } from './api';

class MetricsService {
  private pollingInterval: NodeJS.Timeout | null = null;

  async getSystemMetrics(): Promise<SystemMetrics> {
    const response = await axiosInstance.get('/metrics/system');
    if (response.data.status === 'error' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch metrics');
    }
    return response.data.data;
  }

  async startMetricsPolling(callback: (metrics: SystemMetrics) => void, interval = 5000): Promise<() => void> {
    this.pollingInterval = setInterval(async () => {
      try {
        const metrics = await this.getSystemMetrics();
        callback(metrics);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    }, interval);

    return () => {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    };
  }
}

export const metricsService = new MetricsService();