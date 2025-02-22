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
import adminRouter from './routes/admin';  // 新しいルーターを追加

// 環境変数の読み込み
config();

const app = express();

// セキュリティ設定
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100 // IPあたりのリクエスト数
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

// CORS設定を先に適用
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression()); // レスポンス圧縮
app.use(express.json()); // JSONパーサー
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined')); // ログ出力
app.use(limiter); // レート制限

// リクエストロギングの有効化
app.use(requestLogger);

// ルートルーターの設定
app.use('/api/auth', authRouter);
app.use('/api/system', systemRouter);
app.use('/api/monitoring', monitoringRouter);
app.use('/api/security', securityRouter);
app.use('/api/ad', adRouter);
app.use('/api/m365', m365Router);
app.use('/api/admin', adminRouter);  // 新しいルーターを追加

// エラーハンドリングミドルウェアの設定（必ず他のミドルウェアの後に配置）
app.use(errorLogger);
app.use(errorHandler);

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// プロセスのエラーハンドリング
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;