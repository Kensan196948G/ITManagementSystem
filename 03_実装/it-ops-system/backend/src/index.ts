import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from 'dotenv';
import rateLimit from 'express-rate-limit';
import { requestLogger, errorLogger, errorHandler } from './middleware/errorHandling';

// ルーターのインポート
import authRouter from './routes/auth';
import systemRouter from './routes/system';
import monitoringRouter from './routes/monitoring';
import securityRouter from './routes/security';
import adRouter from './routes/ad';
import m365Router from './routes/m365';
import adminRouter from './routes/admin';
import { SQLiteService } from './services/sqliteService';
import { TokenManager } from './services/tokenManager';

// 環境変数の読み込み
config();

const app = express();
const isDevelopment = process.env.NODE_ENV === 'development';

// 開発モードの場合のメッセージ
if (isDevelopment) {
  console.log('Starting server in development mode');
  console.log('Some features may be disabled if services are not available');
}

// データベースの初期化
try {
  SQLiteService.getInstance();
  TokenManager.initialize();
} catch (error) {
  console.error('Failed to initialize SQLite database:', error);
  process.exit(1);
}

// セキュリティ設定
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// ミドルウェアの設定
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", process.env.CORS_ORIGIN],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "data:"],
    },
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(limiter);
app.use(requestLogger);

// 基本的なヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: isDevelopment ? 'development' : 'production' });
});

// ルートパスに対する基本的なレスポンス
app.get('/', (req, res) => {
  res.send('Welcome to the IT Ops System API');
});

// API ルート
app.use('/api/auth', authRouter);
app.use('/api/system', systemRouter);
app.use('/api/monitoring', monitoringRouter);
app.use('/api/security', securityRouter);
app.use('/api/ad', adRouter);
app.use('/api/m365', m365Router);
app.use('/api/admin', adminRouter);

app.use(errorLogger);
app.use(errorHandler);

// サーバー起動
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/api/health`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  SQLiteService.getInstance().close();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  SQLiteService.getInstance().close();
  if (!isDevelopment) {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (!isDevelopment) {
    SQLiteService.getInstance().close();
    process.exit(1);
  }
});

export default app;