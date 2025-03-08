"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = require("dotenv");
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const errorHandling_1 = require("./middleware/errorHandling");
const websocket_1 = require("./routes/websocket");
const auth_1 = __importDefault(require("./routes/auth"));
const system_1 = __importDefault(require("./routes/system"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const security_1 = __importDefault(require("./routes/security"));
const ad_1 = __importDefault(require("./routes/ad"));
const m365_1 = __importDefault(require("./routes/m365"));
const admin_1 = __importDefault(require("./routes/admin"));
const metrics_1 = __importDefault(require("./routes/metrics"));
const graphPermissions_1 = __importDefault(require("./routes/graphPermissions"));
const sqliteService_1 = require("./services/sqliteService");
const tokenManager_1 = require("./services/tokenManager");
const app_1 = __importDefault(require("./app"));
// 環境変数の読み込み
(0, dotenv_1.config)();
const isDevelopment = process.env.NODE_ENV === 'development';
// 開発モードの場合のメッセージ
if (isDevelopment) {
    console.log('Starting server in development mode');
    console.log('Some features may be disabled if services are not available');
}
// データベースの初期化
(async () => {
    try {
        await sqliteService_1.SQLiteService.getInstance();
        tokenManager_1.TokenManager.initialize();
        console.log('Database initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize SQLite database:', error);
        process.exit(1);
    }
})();
// 基本的なミドルウェアの設定（CORSを最初に）
app_1.default.use((0, cors_1.default)({
    origin: isDevelopment ? 'http://localhost:3000' : process.env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app_1.default.use((0, compression_1.default)());
app_1.default.use(express_1.default.json());
app_1.default.use(express_1.default.urlencoded({ extended: true }));
app_1.default.use((0, morgan_1.default)(isDevelopment ? 'dev' : 'combined'));
app_1.default.use(errorHandling_1.requestLogger);
// ヘルスチェックエンドポイントを最初に定義
// app.tsで既に定義しているのでコメントアウト
/*
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: isDevelopment ? 'development' : 'production',
    timestamp: new Date().toISOString()
  });
});
*/
// ルートパスに対する基本的なレスポンス
app_1.default.get('/', (req, res) => {
    res.send('Welcome to the IT Ops System API');
});
// APIルーティングの設定
const apiRouter = express_1.default.Router();
apiRouter.use('/auth', auth_1.default);
apiRouter.use('/system', system_1.default);
apiRouter.use('/monitoring', monitoring_1.default);
apiRouter.use('/security', security_1.default);
apiRouter.use('/ad', ad_1.default);
apiRouter.use('/m365', m365_1.default);
apiRouter.use('/admin', admin_1.default);
apiRouter.use('/metrics', metrics_1.default);
apiRouter.use('/graph-permissions', graphPermissions_1.default);
// APIルーターをマウント
app_1.default.use('/api', apiRouter);
// 直接マウントしたルートも追加（フロントエンドの/apiプレフィックスを維持する場合）
app_1.default.use('/auth', auth_1.default);
// 開発用ログインエンドポイント用のルートも追加
app_1.default.use('/auth/dev', auth_1.default);
// エラーハンドリングミドルウェア（必ず他のミドルウェアの後に配置）
app_1.default.use(errorHandling_1.errorLogger);
app_1.default.use(errorHandling_1.errorHandler);
// HTTPサーバーを作成
const PORT = process.env.PORT || 3002;
const server = http_1.default.createServer(app_1.default);
// WebSocketハンドラーの初期化
const wsHandler = websocket_1.WebSocketHandler.getInstance();
wsHandler.initialize(server);
// システム状態の定期送信を開始
const statusInterval = (0, websocket_1.startSystemStatusUpdates)(wsHandler);
// サーバー終了時にWebSocketリソースをクリーンアップ
process.on('SIGTERM', () => {
    if (statusInterval) {
        clearInterval(statusInterval);
    }
    wsHandler.cleanup();
});
// サーバーを起動
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API documentation available at http://localhost:${PORT}/api/health`);
    console.log(`WebSocket server is running at ws://localhost:${PORT}/ws`);
});
// SQLiteServiceのインスタンスを保持する変数
let sqliteInstance;
// 初期化時にインスタンスを取得
sqliteService_1.SQLiteService.getInstance().then(instance => {
    sqliteInstance = instance;
}).catch(err => {
    console.error('Failed to get SQLiteService instance:', err);
});
// グレースフルシャットダウン
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    if (sqliteInstance) {
        sqliteInstance.close();
    }
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    if (sqliteInstance) {
        sqliteInstance.close();
    }
    if (!isDevelopment) {
        process.exit(1);
    }
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    if (!isDevelopment) {
        if (sqliteInstance) {
            sqliteInstance.close();
        }
        process.exit(1);
    }
});
exports.default = app_1.default;
//# sourceMappingURL=index.js.map