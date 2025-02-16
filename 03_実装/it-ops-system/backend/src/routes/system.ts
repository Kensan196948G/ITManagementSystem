import express from 'express';
import { verifyToken } from './auth';
import { SystemConfig } from '../types/custom';

const router = express.Router();

// システム設定の取得
router.get('/config', verifyToken, async (_req, res) => {
  try {
    // TODO: 実際の設定をデータベースまたは設定ファイルから取得
    const config: SystemConfig = {
      ad: {
        domain: process.env.AD_DOMAIN || '',
        server: process.env.AD_SERVER || '',
        searchBase: process.env.AD_SEARCH_BASE || '',
        useTLS: process.env.AD_USE_TLS === 'true'
      },
      m365: {
        tenantId: process.env.M365_TENANT_ID || '',
        clientId: process.env.M365_CLIENT_ID || '',
        defaultLicenses: process.env.M365_DEFAULT_LICENSES?.split(',') || []
      },
      monitoring: {
        checkInterval: parseInt(process.env.MONITORING_CHECK_INTERVAL || '300'),
        retentionDays: parseInt(process.env.MONITORING_RETENTION_DAYS || '30'),
        alertThresholds: {
          cpu: parseInt(process.env.ALERT_THRESHOLD_CPU || '80'),
          memory: parseInt(process.env.ALERT_THRESHOLD_MEMORY || '80'),
          disk: parseInt(process.env.ALERT_THRESHOLD_DISK || '80')
        }
      }
    };

    res.json({ status: 'success', data: config });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve system configuration'
    });
  }
});

// システム設定の更新
router.put('/config', verifyToken, async (req, res) => {
  try {
    const config: Partial<SystemConfig> = req.body;
    // TODO: 設定の検証と保存の実装

    res.json({
      status: 'success',
      message: 'System configuration updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update system configuration'
    });
  }
});

// システムステータスの取得
router.get('/status', verifyToken, async (_req, res) => {
  try {
    const status = {
      healthy: true,
      services: [
        {
          name: 'Active Directory',
          status: 'up',
          lastCheck: new Date(),
        },
        {
          name: 'Microsoft 365',
          status: 'up',
          lastCheck: new Date(),
        },
        {
          name: 'Monitoring',
          status: 'up',
          lastCheck: new Date(),
        }
      ]
    };

    res.json({ status: 'success', data: status });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve system status'
    });
  }
});

export default router;