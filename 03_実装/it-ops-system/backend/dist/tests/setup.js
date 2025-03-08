"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestUser = exports.createTestToken = exports.mockResponse = exports.mockRequest = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const globals_1 = require("@jest/globals");
// テスト環境のセットアップ
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-secret';
process.env.SQLITE_DB_PATH = ':memory:';
process.env.REDIS_URL = 'mock://localhost:6379';
// グローバルなモック設定
globals_1.jest.setTimeout(30000);
// メール送信モックの設定
globals_1.jest.mock('nodemailer', () => ({
    createTransport: globals_1.jest.fn().mockReturnValue({
        sendMail: globals_1.jest.fn().mockResolvedValue({ messageId: 'mocked-message-id' }),
        verify: globals_1.jest.fn().mockResolvedValue(true)
    })
}));
// Slackクライアントモックの設定
globals_1.jest.mock('@slack/web-api', () => ({
    WebClient: globals_1.jest.fn().mockImplementation(() => ({
        chat: {
            postMessage: globals_1.jest.fn().mockResolvedValue({ ok: true })
        }
    }))
}));
// テスト環境の初期化を保証
beforeAll(async () => {
    try {
        // テスト用データベースの初期化
        const { SQLiteService } = require('../services/sqliteService');
        const db = SQLiteService.getInstance();
        await db.initialize();
        // テスト用のテーブルを作成
        await db.exec(`
      DROP TABLE IF EXISTS permission_audit_reviews;
      DROP TABLE IF EXISTS permission_audit;
    `);
        await db.exec(`
      CREATE TABLE IF NOT EXISTS permission_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_email TEXT NOT NULL,
        target_id TEXT NOT NULL,
        target_email TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_name TEXT NOT NULL,
        reason TEXT,
        permission_before TEXT,
        permission_after TEXT,
        ip_address TEXT,
        user_agent TEXT,
        application_id TEXT
      )
    `);
        await db.exec(`
      CREATE TABLE IF NOT EXISTS permission_audit_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        audit_id INTEGER NOT NULL,
        reviewer_id TEXT NOT NULL,
        reviewer_email TEXT NOT NULL,
        reviewed_at TEXT NOT NULL,
        approved INTEGER NOT NULL,
        comments TEXT,
        FOREIGN KEY (audit_id) REFERENCES permission_audit (id)
      )
    `);
        // インデックスの作成
        await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_permission_audit_actor_email 
      ON permission_audit (actor_email);
      CREATE INDEX IF NOT EXISTS idx_permission_audit_target_email 
      ON permission_audit (target_email);
      CREATE INDEX IF NOT EXISTS idx_permission_audit_timestamp 
      ON permission_audit (timestamp);
    `);
        console.log('Test database initialized successfully');
    }
    catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
});
// 各テスト実行前にテーブルをクリーンアップ
beforeEach(async () => {
    try {
        const { SQLiteService } = require('../services/sqliteService');
        const db = SQLiteService.getInstance();
        await db.exec('DELETE FROM permission_audit_reviews');
        await db.exec('DELETE FROM permission_audit');
        // モックのリセット
        globals_1.jest.clearAllMocks();
    }
    catch (error) {
        console.error('Table cleanup failed:', error);
        throw error;
    }
});
afterAll(async () => {
    try {
        // テスト用データベースのクリーンアップ
        const { SQLiteService } = require('../services/sqliteService');
        const db = SQLiteService.getInstance();
        await db.exec('DROP TABLE IF EXISTS audit_review');
        await db.exec('DROP TABLE IF EXISTS permission_audit');
    }
    catch (error) {
        console.error('Database cleanup failed:', error);
    }
});
// テストヘルパー関数
const mockRequest = (options = {}) => ({
    body: {},
    query: {},
    params: {},
    headers: {},
    ...options
});
exports.mockRequest = mockRequest;
const mockResponse = () => {
    const res = {};
    res.status = globals_1.jest.fn().mockReturnThis();
    res.json = globals_1.jest.fn().mockReturnThis();
    return res;
};
exports.mockResponse = mockResponse;
const createTestToken = (payload = {}) => {
    const defaultPayload = {
        id: 'test-user-id',
        username: 'testuser',
        roles: ['user'],
        ...payload
    };
    return jsonwebtoken_1.default.sign(defaultPayload, process.env.JWT_SECRET || 'test-secret');
};
exports.createTestToken = createTestToken;
const createTestUser = () => ({
    id: 'test-user-id',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    groups: ['users']
});
exports.createTestUser = createTestUser;
//# sourceMappingURL=setup.js.map