import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types/custom';
import { jest } from '@jest/globals';

// テスト環境のセットアップ
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-secret';
process.env.SQLITE_DB_PATH = ':memory:';
process.env.REDIS_URL = 'mock://localhost:6379';

// グローバルなモック設定
jest.setTimeout(30000);

// メール送信モックの設定
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mocked-message-id' }),
    verify: jest.fn().mockResolvedValue(true)
  })
}));

// Slackクライアントモックの設定
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    chat: {
      postMessage: jest.fn().mockResolvedValue({ ok: true })
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
  } catch (error) {
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
    jest.clearAllMocks();
  } catch (error) {
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
  } catch (error) {
    console.error('Database cleanup failed:', error);
  }
});

// テストヘルパー関数
export const mockRequest = (options: Partial<Request> = {}) => ({
  body: {},
  query: {},
  params: {},
  headers: {},
  ...options
} as Request);

export const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

export const createTestToken = (payload: Partial<UserPayload> = {}) => {
  const defaultPayload = {
    id: 'test-user-id',
    username: 'testuser',
    roles: ['user'],
    ...payload
  };
  return jwt.sign(defaultPayload, process.env.JWT_SECRET || 'test-secret');
};

export const createTestUser = () => ({
  id: 'test-user-id',
  username: 'testuser',
  displayName: 'Test User',
  email: 'test@example.com',
  groups: ['users']
});