"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = require("dotenv");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const errorHandling_1 = require("./middleware/errorHandling");
// ルーターのインポート
const auth_1 = __importDefault(require("./routes/auth"));
const system_1 = __importDefault(require("./routes/system"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const security_1 = __importDefault(require("./routes/security"));
const ad_1 = __importDefault(require("./routes/ad"));
const m365_1 = __importDefault(require("./routes/m365"));
const admin_1 = __importDefault(require("./routes/admin"));
const sqliteService_1 = require("./services/sqliteService");
const tokenManager_1 = require("./services/tokenManager");
// 環境変数の読み込み
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const isDevelopment = process.env.NODE_ENV === 'development';
// 開発モードの場合のメッセージ
if (isDevelopment) {
    console.log('Starting server in development mode');
    console.log('Some features may be disabled if services are not available');
}
// データベースの初期化
try {
    sqliteService_1.SQLiteService.getInstance();
    tokenManager_1.TokenManager.initialize();
}
catch (error) {
    console.error('Failed to initialize SQLite database:', error);
    process.exit(1);
}
// セキュリティ設定
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100
});
// ミドルウェアの設定
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('combined'));
app.use(limiter);
app.use(errorHandling_1.requestLogger);
// 基本的なヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', mode: isDevelopment ? 'development' : 'production' });
});
// ルートパスに対する基本的なレスポンス
app.get('/', (req, res) => {
    res.send('Welcome to the IT Ops System API');
});
// API ルート
app.use('/api/auth', auth_1.default);
app.use('/api/system', system_1.default);
app.use('/api/monitoring', monitoring_1.default);
app.use('/api/security', security_1.default);
app.use('/api/ad', ad_1.default);
app.use('/api/m365', m365_1.default);
app.use('/api/admin', admin_1.default);
app.use(errorHandling_1.errorLogger);
app.use(errorHandling_1.errorHandler);
// サーバー起動
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API documentation available at http://localhost:${PORT}/api/health`);
});
// グレースフルシャットダウン
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    sqliteService_1.SQLiteService.getInstance().close();
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    sqliteService_1.SQLiteService.getInstance().close();
    if (!isDevelopment) {
        process.exit(1);
    }
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    if (!isDevelopment) {
        sqliteService_1.SQLiteService.getInstance().close();
        process.exit(1);
    }
});
exports.default = app;
//# sourceMappingURL=index.js.map