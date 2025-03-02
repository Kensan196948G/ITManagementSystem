"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const prometheus_1 = require("./metrics/prometheus");
const securityMonitorService_1 = require("./services/securityMonitorService");
const redisService_1 = require("./services/redisService");
// 各サービスの初期化
securityMonitorService_1.SecurityMonitorService.getInstance();
redisService_1.RedisService.getInstance();
const app = (0, express_1.default)();
const isDevelopment = process.env.NODE_ENV === 'development';
// CORS設定（ヘルスチェック用に先に設定）
app.use((0, cors_1.default)({
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
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
}));
// JSONボディパーサーを追加
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// 環境に応じたレート制限の設定
const limiter = (0, express_rate_limit_1.default)({
    windowMs: isDevelopment ? 60000 : parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 開発環境では1分
    max: isDevelopment ? 1000 : parseInt(process.env.RATE_LIMIT_MAX || '100'), // 開発環境では1分あたり1000リクエスト
    message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again later.'
    }
});
// 認証エンドポイント用の緩和されたレート制限
const authLimiter = (0, express_rate_limit_1.default)({
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
    res.set('Content-Type', prometheus_1.Prometheus.register.contentType);
    const metrics = await prometheus_1.Prometheus.register.metrics();
    res.send(metrics);
});
exports.default = app;
//# sourceMappingURL=app.js.map