import express from 'express';
import { verifyToken } from '../routes/auth';
import { SystemStatusService } from '../services/systemStatusService';
import LoggingService from '../services/loggingService';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const logger = LoggingService.getInstance();
const systemStatusService = new SystemStatusService();
const execAsync = promisify(exec);

/**
 * システムステータス情報を取得
 * 一般ユーザーも閲覧可能
 */
router.get('/status', verifyToken, async (_req, res) => {
  try {
    const status = await systemStatusService.getSystemStatus();
    
    res.json({
      status: 'success',
      data: status
    });
  } catch (error) {
    logger.logError(error as Error, {
      context: 'SystemStatusAPI',
      message: 'システムステータス取得エラー'
    });
    
    res.status(500).json({
      status: 'error',
      message: 'システムステータス取得中にエラーが発生しました',
      code: 'SYSTEM_STATUS_ERROR'
    });
  }
});

/**
 * リソース使用状況を取得
 * 一般ユーザーも閲覧可能
 */
router.get('/resources', verifyToken, async (_req, res) => {
  try {
    // システムリソース情報を取得
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const uptime = os.uptime();
    
    // ディスク使用状況を取得（Windowsの場合）
    let diskUsage = {};
    try {
      const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
      const lines = stdout.trim().split('\n').slice(1);
      
      diskUsage = lines.reduce((acc: any, line: string) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const drive = parts[0];
          const freeSpace = parseInt(parts[1], 10);
          const totalSize = parseInt(parts[2], 10);
          
          acc[drive] = {
            total: totalSize,
            free: freeSpace,
            used: totalSize - freeSpace,
            usagePercentage: ((totalSize - freeSpace) / totalSize * 100).toFixed(2)
          };
        }
        return acc;
      }, {});
    } catch (diskError) {
      logger.logError(diskError as Error, {
        context: 'SystemStatusAPI',
        message: 'ディスク使用状況取得エラー'
      });
    }
    
    // ネットワーク接続情報
    const networkInterfaces = os.networkInterfaces();
    
    res.json({
      status: 'success',
      data: {
        cpu: {
          usage: cpuUsage,
          cores: os.cpus().length,
          model: os.cpus()[0].model,
          loadAverage: os.loadavg()
        },
        memory: {
          total: totalMemory,
          free: freeMemory,
          used: totalMemory - freeMemory,
          usagePercentage: ((totalMemory - freeMemory) / totalMemory * 100).toFixed(2),
          process: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external
          }
        },
        disk: diskUsage,
        network: networkInterfaces,
        system: {
          platform: os.platform(),
          release: os.release(),
          hostname: os.hostname(),
          uptime: uptime
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.logError(error as Error, {
      context: 'SystemStatusAPI',
      message: 'リソース使用状況取得エラー'
    });
    
    res.status(500).json({
      status: 'error',
      message: 'リソース使用状況取得中にエラーが発生しました',
      code: 'RESOURCE_STATUS_ERROR'
    });
  }
});

/**
 * セキュリティアラート情報を取得
 * 一般ユーザーも閲覧可能
 */
router.get('/security-alerts', verifyToken, async (_req, res) => {
  try {
    const alerts = await systemStatusService.getSecurityAlerts();
    
    res.json({
      status: 'success',
      data: alerts
    });
  } catch (error) {
    logger.logError(error as Error, {
      context: 'SystemStatusAPI',
      message: 'セキュリティアラート取得エラー'
    });
    
    res.status(500).json({
      status: 'error',
      message: 'セキュリティアラート取得中にエラーが発生しました',
      code: 'SECURITY_ALERT_ERROR'
    });
  }
});

export default router;