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
  // 簡素化したヘルスチェック - データベース接続チェックなし
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
  windowMs: isDevelopment ? 60000 : parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 開発環境では1分
  max: isDevelopment ? 1000 : parseInt(process.env.RATE_LIMIT_MAX || '100'), // 開発環境では1分あたり1000リクエスト
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  }
});

// 認証エンドポイント用の緩和されたレート制限
const authLimiter = rateLimit({
  windowMs: isDevelopment ? 60000 : 900000, // 開発環境では1分
  max: isDevelopment ? 10000 : 10, // 開発環境では1分あたり10000リクエスト（実質制限なし）
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later.'
  }
});

// レート制限設定の無効化（開発環境またはヘルスチェックエンドポイント用）
// ヘルスチェックを完全に除外し、他のエンドポイントのみにレート制限を適用
app.use((req, res, next) => {
  if (req.path === '/api/health' || 
      req.originalUrl === '/api/health' || 
      req.path === '/health') {
    return next();
  }
  
  // 認証エンドポイント用のレート制限
  if (req.path.startsWith('/api/auth/') || req.path.startsWith('/auth/')) {
    return authLimiter(req, res, next);
  }
  
  // その他のエンドポイント用のレート制限
  if (req.path.startsWith('/api/') || req.path.startsWith('/')) {
    return limiter(req, res, next);
  }
  
  return next();
});

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
