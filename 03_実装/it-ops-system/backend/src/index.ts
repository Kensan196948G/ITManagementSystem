import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import { config } from 'dotenv';
import cors from 'cors';
import { requestLogger, errorLogger, errorHandler } from './middleware/errorHandling';
import authRouter from './routes/auth';
import systemRouter from './routes/system';
import monitoringRouter from './routes/monitoring';
import securityRouter from './routes/security';
import adRouter from './routes/ad';
import m365Router from './routes/m365';
import adminRouter from './routes/admin';
import metricsRouter from './routes/metrics';
import { SQLiteService } from './services/sqliteService';
import { TokenManager } from './services/tokenManager';
import app from './app';

// 環境変数の読み込み
config();

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

// 基本的なミドルウェアの設定（CORSを最初に）
app.use(cors({
  origin: isDevelopment ? 'http://localhost:3000' : process.env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(isDevelopment ? 'dev' : 'combined'));
app.use(requestLogger);

// ヘルスチェックエンドポイントを最初に定義
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: isDevelopment ? 'development' : 'production',
    timestamp: new Date().toISOString()
  });
});

// ルートパスに対する基本的なレスポンス
app.get('/', (req, res) => {
  res.send('Welcome to the IT Ops System API');
});

// APIルーティングの設定
const apiRouter = express.Router();
apiRouter.use('/auth', authRouter);
apiRouter.use('/system', systemRouter);
apiRouter.use('/monitoring', monitoringRouter);
apiRouter.use('/security', securityRouter);
apiRouter.use('/ad', adRouter);
apiRouter.use('/m365', m365Router);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/metrics', metricsRouter);

// APIルーターをマウント
app.use('/api', apiRouter);

// エラーハンドリングミドルウェア（必ず他のミドルウェアの後に配置）
app.use(errorLogger);
app.use(errorHandler);

// サーバー起動
const PORT = process.env.PORT || 3002;
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