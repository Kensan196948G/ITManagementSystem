"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const security_1 = __importDefault(require("./routes/security"));
const metrics_1 = __importDefault(require("./routes/metrics"));
const errorHandler_1 = require("./middleware/errorHandler");
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const prometheus_1 = require("./metrics/prometheus");
const securityMonitorService_1 = require("./services/securityMonitorService");
const redisService_1 = require("./services/redisService");
// 各サービスの初期化
securityMonitorService_1.SecurityMonitorService.getInstance();
redisService_1.RedisService.getInstance();
const app = (0, express_1.default)();
// セキュリティ設定
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true
}));
// レート制限
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100')
});
app.use('/api/', limiter);
// Prometheusメトリクスのエンドポイント
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', prometheus_1.Prometheus.register.contentType);
    const metrics = await prometheus_1.Prometheus.register.metrics();
    res.send(metrics);
});
// ミドルウェア
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// ルーター
app.use('/api/auth', auth_1.default);
app.use('/api/monitoring', monitoring_1.default);
app.use('/api/security', security_1.default);
app.use('/api/metrics', metrics_1.default);
// エラーハンドリング
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map