"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auditMetricsService_1 = require("../services/auditMetricsService");
const authService_1 = require("../services/authService");
const zod_1 = require("zod");
const AuditError_1 = require("../errors/AuditError");
const router = (0, express_1.Router)();
const metricsService = auditMetricsService_1.AuditMetricsService.getInstance();
const authService = authService_1.AuthService.getInstance();
const metricsQuerySchema = zod_1.z.object({
    name: zod_1.z.string(),
    aggregation: zod_1.z.enum(['sum', 'avg', 'min', 'max', 'count']),
    interval: zod_1.z.enum(['hour', 'day', 'week', 'month']),
    startTime: zod_1.z.string().datetime().optional(),
    endTime: zod_1.z.string().datetime().optional()
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
        const metrics = await metricsService.getAggregatedMetrics(query.name, query.aggregation, query.interval, query.startTime ? new Date(query.startTime) : undefined, query.endTime ? new Date(query.endTime) : undefined);
        res.json(metrics);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            next(new AuditError_1.AuditValidationError('無効なクエリパラメータです', error.errors));
        }
        else {
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=metricsRoutes.js.map