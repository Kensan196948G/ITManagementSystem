import express from 'express';
import { verifyToken } from './auth';
import { SystemMetrics, SystemError } from '../types/custom';
import os from 'os';
import si from 'systeminformation';

const router = express.Router();

// メトリクス収集関数
const collectSystemMetrics = async (): Promise<SystemMetrics> => {
  try {
    // CPU使用率の取得
    const cpuUsage = os.loadavg()[0]; // 1分間の平均負荷

    // メモリ使用率の取得
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    // ディスク使用率の取得
    const fsInfo = await si.fsSize();
    const rootDisk = fsInfo.find(fs => fs.mount === '/') || fsInfo[0];

    // ネットワークトラフィックの取得
    const networkStats = await si.networkStats();
    const mainInterface = networkStats[0];

    // CPU温度の取得
    const tempInfo = await si.cpuTemperature();

    return {
      cpu: {
        usage: cpuUsage * 100, // パーセンテージに変換
        temperature: tempInfo.main || 0
      },
      memory: {
        total: totalMemory,
        used: totalMemory - freeMemory,
        free: freeMemory
      },
      disk: {
        total: rootDisk.size,
        used: rootDisk.used,
        free: rootDisk.available
      },
      network: {
        bytesIn: mainInterface.rx_sec || 0,
        bytesOut: mainInterface.tx_sec || 0,
        packetsIn: mainInterface.rx_dropped || 0,
        packetsOut: mainInterface.tx_dropped || 0
      },
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error collecting system metrics:', error);
    throw error;
  }
};

// メトリクス取得エンドポイント
router.get('/metrics', verifyToken, async (_req, res) => {
  try {
    const metrics = await collectSystemMetrics();
    res.json({ status: 'success', data: metrics });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to collect metrics'
    });
  }
});

// アラート取得エンドポイント
router.get('/alerts', verifyToken, async (_req, res) => {
  try {
    const alerts = [
      {
        id: 'alert-1',
        severity: 'high',
        type: 'performance',
        message: 'High CPU usage detected',
        timestamp: new Date(),
        source: 'system-monitor',
        status: 'active'
      }
    ];

    res.json({ status: 'success', data: alerts });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch alerts'
    });
  }
});

// アラート設定の取得
router.get('/alerts/settings', verifyToken, async (_req, res) => {
  try {
    const settings = {
      thresholds: {
        cpu: {
          warning: 70,
          critical: 90
        },
        memory: {
          warning: 80,
          critical: 95
        },
        disk: {
          warning: 85,
          critical: 95
        }
      },
      notifications: {
        email: true,
        slack: false,
        webhook: false
      }
    };

    res.json({ status: 'success', data: settings });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch alert settings'
    });
  }
});

// アラート設定の更新
router.put('/alerts/settings', verifyToken, async (req, res) => {
  try {
    const settings = req.body;
    // TODO: 設定の検証と保存

    res.json({
      status: 'success',
      message: 'Alert settings updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update alert settings'
    });
  }
});

// パフォーマンスレポートの生成
router.get('/reports/performance', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // TODO: 実際のレポート生成ロジックを実装

    const report = {
      period: {
        start: startDate,
        end: endDate
      },
      summary: {
        avgCpuUsage: 45.5,
        avgMemoryUsage: 62.3,
        peakCpuUsage: 88.2,
        peakMemoryUsage: 91.5
      },
      details: []
    };

    res.json({ status: 'success', data: report });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate performance report'
    });
  }
});

export default router;