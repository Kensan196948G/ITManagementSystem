import express from 'express';
import cors from 'cors';
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
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type']
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

export default app;