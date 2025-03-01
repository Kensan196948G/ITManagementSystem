import express from 'express';
import { SQLiteService } from '../services/sqliteService';
import { RedisService } from '../services/redisService';
import { cpuUsage, memoryUsage, networkStats } from '../utils/systemMetrics';
import LoggingService from '../services/loggingService';
import { verifyToken } from '../middleware/auth';

const router = express.Router();
const sqliteService = SQLiteService.getInstance();
const redisService = RedisService.getInstance();
const logger = LoggingService.getInstance();

// /api/metrics/system エンドポイント
router.get('/system', verifyToken, async (req, res) => {
  try {
    const metricsResults = await Promise.allSettled([
      cpuUsage(),
      memoryUsage(),
      networkStats(),
      redisService.healthCheck()
    ]);

    const cpu = metricsResults[0].status === 'fulfilled' ? metricsResults[0].value : null;
    const memory = metricsResults[1].status === 'fulfilled' ? metricsResults[1].value : null;
    const network = metricsResults[2].status === 'fulfilled' ? metricsResults[2].value : null;
    const redisHealth = metricsResults[3].status === 'fulfilled' ? metricsResults[3].value : false;

    if (!cpu || !memory || !network) {
      logger.logError(new Error('Partial metrics fetch failure'), {
        context: 'SystemMetrics',
        message: 'One or more system metrics could not be fetched',
        details: {
          cpu: !!cpu,
          memory: !!memory,
          network: !!network
        }
      });
    }

    // SQLite metrics fetching with error handling
    let dbStatus = false;
    let memoryUsed = 0;
    let operationsCount = 0;
    try {
      dbStatus = await sqliteService.healthCheck();
      memoryUsed = await sqliteService.getMemoryUsage();
      operationsCount = await sqliteService.getOperationsCount();
    } catch (dbError) {
      logger.logError(dbError as Error, {
        context: 'SystemMetrics',
        message: 'Error fetching SQLite metrics'
      });
    }

    let redisMetrics = {
      connectionStatus: 0,
      memoryUsageBytes: 0,
      cacheHitRatio: 0,
      retryAttempts: 0
    };

    try {
      if (redisHealth) {
        redisMetrics = await redisService.getMetrics();
      }
    } catch (redisError) {
      logger.logError(redisError as Error, {
        context: 'SystemMetrics',
        message: 'Error fetching Redis metrics'
      });
    }

    const systemMetrics = {
      status: 'success',
      data: {
        cpu: cpu || { error: 'Failed to fetch CPU usage' },
        memory: memory || { error: 'Failed to fetch memory usage' },
        network: network || { error: 'Failed to fetch network stats' },
        database: {
          type: 'sqlite',
          connectionStatus: dbStatus ? 1 : 0,
          memoryUsageBytes: memoryUsed,
          operationsTotal: operationsCount
        },
        redis: redisMetrics,
        timestamp: new Date()
      }
    };

    logger.logAccess({
      userId: req.user?.id || 'system',
      action: 'get_metrics',
      resource: 'system',
      result: 'success',
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
      details: { metricsCollected: Object.keys(systemMetrics.data) }
    });

    res.json(systemMetrics);
  } catch (error) {
    logger.logError(error as Error, {
      context: 'SystemMetrics',
      message: 'Failed to fetch system metrics'
    });
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch system metrics'
    });
  }
});

export default router;