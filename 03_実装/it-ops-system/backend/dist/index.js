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
// ルーターのインポート
const auth_1 = __importDefault(require("./routes/auth"));
const system_1 = __importDefault(require("./routes/system"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const security_1 = __importDefault(require("./routes/security"));
const ad_1 = __importDefault(require("./routes/ad"));
const m365_1 = __importDefault(require("./routes/m365"));
// 環境変数の読み込み
(0, dotenv_1.config)();
const app = (0, express_1.default)();
// セキュリティ設定
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100 // IPあたりのリクエスト数
});
// ミドルウェアの設定
app.use((0, helmet_1.default)()); // セキュリティヘッダーの設定
app.use((0, cors_1.default)()); // CORS設定
app.use((0, compression_1.default)()); // レスポンス圧縮
app.use(express_1.default.json()); // JSONパーサー
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('combined')); // ログ出力
app.use(limiter); // レート制限
// ルートルーターの設定
app.use('/api/auth', auth_1.default);
app.use('/api/system', system_1.default);
app.use('/api/monitoring', monitoring_1.default);
app.use('/api/security', security_1.default);
app.use('/api/ad', ad_1.default);
app.use('/api/m365', m365_1.default);
// エラーハンドリング
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Internal Server Error'
    });
});
// 404ハンドリング
app.use((req, res) => {
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
exports.default = app;
//# sourceMappingURL=index.js.map