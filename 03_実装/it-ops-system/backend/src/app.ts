import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import monitoringRouter from './routes/monitoring';
import securityRouter from './routes/security';
import { errorHandler } from './middleware/errorHandler';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Prometheus } from './metrics/prometheus';
import { SecurityMonitorService } from './services/securityMonitorService';
import { RedisService } from './services/redisService';

// 各サービスの初期化
SecurityMonitorService.getInstance();
RedisService.getInstance();

const app = express();

// セキュリティ設定
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));

// レート制限
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100')
});
app.use('/api/', limiter);

// Prometheusメトリクスのエンドポイント
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', Prometheus.register.contentType);
  const metrics = await Prometheus.register.metrics();
  res.send(metrics);
});

// ミドルウェア
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ルーター
app.use('/api/auth', authRouter);
app.use('/api/monitoring', monitoringRouter);
app.use('/api/security', securityRouter);

// エラーハンドリング
app.use(errorHandler);

export default app;