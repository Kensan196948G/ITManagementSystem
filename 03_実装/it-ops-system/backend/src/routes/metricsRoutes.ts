import { Router } from 'express';
import { AuditMetricsService } from '../services/auditMetricsService';
import { AuthService } from '../services/authService';
import { z } from 'zod';
import { AuditValidationError } from '../errors/AuditError';

const router = Router();
const metricsService = AuditMetricsService.getInstance();
const authService = AuthService.getInstance();

const metricsQuerySchema = z.object({
  name: z.string(),
  aggregation: z.enum(['sum', 'avg', 'min', 'max', 'count']),
  interval: z.enum(['hour', 'day', 'week', 'month']),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional()
});

/**
 * メトリクスの取得
 */
router.get('/', async (req, res, next) => {
  try {
    // アクセス権限の確認
    const user = await authService.getCurrentUser(req);
    if (!user || !await authService.hasPermission(user.id, 'metrics.read')) {
      return res.status(403).json({ error: '権限がありません' });
    }

    // クエリパラメータのバリデーション
    const query = metricsQuerySchema.parse(req.query);

    const metrics = await metricsService.getAggregatedMetrics(
      query.name,
      query.aggregation,
      query.interval,
      query.startTime ? new Date(query.startTime) : undefined,
      query.endTime ? new Date(query.endTime) : undefined
    );

    res.json(metrics);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AuditValidationError('無効なクエリパラメータです', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * メトリクスの記録
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, value, labels } = req.body;

    // アクセス権限の確認
    const user = await authService.getCurrentUser(req);
    if (!user || !await authService.hasPermission(user.id, 'metrics.write')) {
      return res.status(403).json({ error: '権限がありません' });
    }

    await metricsService.recordMetric(name, value, labels);
    res.status(201).json({ message: 'メトリクスを記録しました' });
  } catch (error) {
    next(error);
  }
});

export default router;