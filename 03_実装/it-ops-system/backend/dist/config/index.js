"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// 環境変数の読み込み
dotenv_1.default.config();
// 環境設定
const NODE_ENV = process.env.NODE_ENV || 'development';
// 環境ごとの.envファイルを読み込む
if (NODE_ENV === 'test') {
    dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env.test') });
}
/**
 * 設定オブジェクト
 */
exports.config = {
    // サーバー設定
    server: {
        port: parseInt(process.env.PORT || '3001', 10),
        env: NODE_ENV,
        logLevel: process.env.LOG_LEVEL || 'info',
        corsOrigin: process.env.CORS_ORIGIN || '*'
    },
    // データベース設定
    database: {
        path: process.env.DB_PATH || './database.sqlite',
        poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10)
    },
    // JWT設定
    jwt: {
        secret: process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    },
    // Graph API設定
    graphApi: {
        tenantId: process.env.TENANT_ID || '',
        clientId: process.env.CLIENT_ID || '',
        clientSecret: process.env.CLIENT_SECRET || ''
    },
    // ログ設定
    logging: {
        dir: process.env.LOG_DIR || './logs',
        maxSize: process.env.LOG_MAX_SIZE || '10m',
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10),
        securityLogEnabled: process.env.SECURITY_LOG_ENABLED !== 'false'
    },
    // 監視設定
    monitoring: {
        resourceCheckInterval: parseInt(process.env.RESOURCE_CHECK_INTERVAL || '60000', 10), // ミリ秒
        cpuThreshold: parseInt(process.env.CPU_THRESHOLD || '80', 10), // パーセント
        memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD || '80', 10), // パーセント
        diskThreshold: parseInt(process.env.DISK_THRESHOLD || '90', 10) // パーセント
    },
    // 自動復旧設定
    autoRecovery: {
        enabled: process.env.AUTO_RECOVERY_ENABLED !== 'false',
        maxRetries: parseInt(process.env.AUTO_RECOVERY_MAX_RETRIES || '3', 10),
        retryInterval: parseInt(process.env.AUTO_RECOVERY_RETRY_INTERVAL || '5000', 10) // ミリ秒
    },
    // 自動バックアップ設定
    autoBackup: {
        enabled: process.env.AUTO_BACKUP_ENABLED !== 'false',
        interval: parseInt(process.env.AUTO_BACKUP_INTERVAL || '86400000', 10), // ミリ秒 (デフォルト: 1日)
        maxBackups: parseInt(process.env.AUTO_BACKUP_MAX_COUNT || '7', 10),
        path: process.env.AUTO_BACKUP_PATH || './backups'
    },
    // 自動最適化設定
    autoOptimize: {
        enabled: process.env.AUTO_OPTIMIZE_ENABLED !== 'false',
        interval: parseInt(process.env.AUTO_OPTIMIZE_INTERVAL || '604800000', 10), // ミリ秒 (デフォルト: 1週間)
        vacuumThreshold: parseInt(process.env.AUTO_OPTIMIZE_VACUUM_THRESHOLD || '20', 10) // パーセント
    },
    // セキュリティ設定
    security: {
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '300000', 10), // ミリ秒 (デフォルト: 5分)
        passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
        passwordRequireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
        passwordRequireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
        passwordRequireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS !== 'false',
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000', 10) // ミリ秒 (デフォルト: 1時間)
    },
    // 通知設定
    notification: {
        enabled: process.env.NOTIFICATION_ENABLED !== 'false',
        wsPort: parseInt(process.env.WS_PORT || '3002', 10)
    }
};
exports.default = exports.config;
//# sourceMappingURL=index.js.map