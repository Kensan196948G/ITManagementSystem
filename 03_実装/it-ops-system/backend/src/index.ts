import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from 'dotenv';
import rateLimit from 'express-rate-limit';

// ルーターのインポート
import authRouter from './routes/auth';
import systemRouter from './routes/system';
import monitoringRouter from './routes/monitoring';
import securityRouter from './routes/security';
import adRouter from './routes/ad';
import m365Router from './routes/m365';

// 環境変数の読み込み
config();

const app = express();

// セキュリティ設定
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100 // IPあたりのリクエスト数
});

// ミドルウェアの設定
app.use(helmet()); // セキュリティヘッダーの設定
app.use(cors()); // CORS設定
app.use(compression()); // レスポンス圧縮
app.use(express.json()); // JSONパーサー
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined')); // ログ出力
app.use(limiter); // レート制限

// ルートルーターの設定
app.use('/api/auth', authRouter);
app.use('/api/system', systemRouter);
app.use('/api/monitoring', monitoringRouter);
app.use('/api/security', securityRouter);
app.use('/api/ad', adRouter);
app.use('/api/m365', m365Router);

// エラーハンドリング
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error'
  });
});

// 404ハンドリング
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Not Found'
  });
});

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