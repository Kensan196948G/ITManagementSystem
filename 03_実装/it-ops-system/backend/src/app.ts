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

const isDevelopment = process.env.NODE_ENV === 'development';

// CORS設定（ヘルスチェック用に先に設定）
app.use(cors({
  origin: isDevelopment ? 'http://localhost:3000' : process.env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
}));

// ヘルスチェックエンドポイント（認証不要、最優先）
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    mode: isDevelopment ? 'development' : 'production',
    timestamp: new Date().toISOString()
  });
});

// セキュリティ設定
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
}));

// JSONボディパーサーを追加
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 環境に応じたレート制限の設定
const limiter = rateLimit({
  windowMs: isDevelopment ? 1000 : parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: isDevelopment ? 100 : parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  }
});

// 認証エンドポイント用の緩和されたレート制限
const authLimiter = rateLimit({
  windowMs: isDevelopment ? 1000 : 900000,
  max: isDevelopment ? 50 : 10,
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later.'
  }
});

// ルートの前にミドルウェアを適用
app.use('/api/auth/', authLimiter);
app.use('/api/', limiter);

// ベースルート
app.get('/api', (req, res) => {
  res.json({ message: 'IT Operations System API' });
});

// Prometheusメトリクスのエンドポイント
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', Prometheus.register.contentType);
  const metrics = await Prometheus.register.metrics();
  res.send(metrics);
});

export default app;