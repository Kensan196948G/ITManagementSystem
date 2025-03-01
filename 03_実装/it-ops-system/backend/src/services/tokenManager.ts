// @ts-ignore
import { TokenBlacklist } from '../types/system';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import { TokenRotationConfig, TokenVerificationResult } from '../types/auth';
import { Database } from 'sqlite3';
import LoggingService from './loggingService';
import { SQLiteService } from './sqliteService';

interface TokenMetadata {
  userId: string;
  issuedAt: number;
  rotationCount: number;
  lastRotation: number;
  clientInfo: {
    ip: string;
    userAgent: string;
  };
}

export class TokenManager {
  private static db: Database;
  private static logger = LoggingService.getInstance();
  private static readonly ROTATION_CONFIG: TokenRotationConfig = {
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    rotationWindow: 60 * 60 * 1000, // 1時間
    maxRotations: 24 // 最大24回のローテーション
  };

  static async initialize() {
    try {
      // SQLiteServiceからデータベース接続を取得
      this.db = SQLiteService.getInstance().getDb();
      
      // テーブル作成
      const createTablesSQL = `
        CREATE TABLE IF NOT EXISTS token_blacklist (
          token TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS user_sessions (
          user_id TEXT PRIMARY KEY,
          session_count INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS tokens (
          token TEXT PRIMARY KEY,
          metadata TEXT NOT NULL,
          expires_at INTEGER NOT NULL
        );
      `;
      
      // Promise経由でexecを実行
      await new Promise<void>((resolve, reject) => {
        this.db.exec(createTablesSQL, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      this.logger.logError(error as Error, {
        context: 'TokenManager',
        message: 'データベース初期化エラー'
      });
      throw error;
    }
  }

  static async blacklistToken(tokenData: TokenBlacklist): Promise<void> {
    return new Promise((resolve) => {
      const expiresAt = Math.ceil(tokenData.expiresAt.getTime());
      this.db.run(
        'INSERT INTO token_blacklist (token, data, expires_at) VALUES (?, ?, ?)',
        [tokenData.token, JSON.stringify(tokenData), expiresAt],
        (err) => {
          if (err) {
            this.logger.logError(err, {
              context: 'TokenManager',
              message: 'トークンのブラックリスト追加に失敗'
            });
            resolve();
          } else {
            resolve();
          }
        }
      );
    });
  }

  static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const now = Date.now();
      return new Promise((resolve) => {
        this.db.get(
          'SELECT COUNT(*) as count FROM token_blacklist WHERE token = ? AND expires_at > ?',
          [token, now],
          (err, row: { count: number }) => {
            if (err) {
              this.logger.logError(err, {
                context: 'TokenManager',
                message: 'トークンのブラックリスト確認に失敗'
              });
              resolve(false);
            } else {
              resolve(row.count > 0);
            }
          }
        );
      });
    } catch (error) {
      this.logger.logError(error as Error, {
        context: 'TokenManager',
        message: 'トークンのブラックリスト確認に失敗'
      });
      return false;
    }
  }

  static async getUserActiveSessions(userId: string): Promise<number> {
    return new Promise((resolve) => {
      this.db.get(
        'SELECT session_count FROM user_sessions WHERE user_id = ?',
        [userId],
        (err, row: { session_count: number } | undefined) => {
          if (err) {
            this.logger.logError(err, {
              context: 'TokenManager',
              message: 'アクティブセッション数の取得に失敗'
            });
            resolve(0);
          } else {
            resolve(row?.session_count ?? 0);
          }
        }
      );
    });
  }

  static async addUserSession(userId: string): Promise<void> {
    return new Promise((resolve) => {
      this.db.run(
        `INSERT INTO user_sessions (user_id, session_count)
         VALUES (?, 1)
         ON CONFLICT(user_id) DO UPDATE SET session_count = session_count + 1`,
        [userId],
        (err) => {
          if (err) {
            this.logger.logError(err, {
              context: 'TokenManager',
              message: 'セッション追加に失敗'
            });
            resolve();
          } else {
            resolve();
          }
        }
      );
    });
  }

  static async removeUserSession(userId: string): Promise<void> {
    return new Promise((resolve) => {
      this.db.run(
        `UPDATE user_sessions 
         SET session_count = CASE 
           WHEN session_count > 0 THEN session_count - 1 
           ELSE 0 
         END
         WHERE user_id = ?`,
        [userId],
        (err) => {
          if (err) {
            this.logger.logError(err, {
              context: 'TokenManager',
              message: 'セッション削除に失敗'
            });
            resolve(); // エラーの場合でもresolve
          } else {
            resolve();
          }
        }
      );
    });
  }

  static async createToken(userId: string, clientInfo: { ip: string; userAgent: string }): Promise<string> {
    const token = uuidv4();
    const metadata: TokenMetadata = {
      userId,
      issuedAt: Date.now(),
      rotationCount: 0,
      lastRotation: Date.now(),
      clientInfo
    };

    try {
      this.db.prepare(
        'INSERT INTO tokens (token, metadata, expires_at) VALUES (?, ?, ?)'
      ).run(
        token,
        JSON.stringify(metadata),
        Date.now() + this.ROTATION_CONFIG.maxAge
      );

      await this.addUserSession(userId);
      return token;
    } catch (error) {
      this.logger.logError(error as Error, {
        context: 'TokenManager',
        message: 'トークン作成に失敗'
      });
      throw error;
    }
  }

  static async invalidateAllUserSessions(userId: string): Promise<void> {
    return new Promise((resolve) => {
      this.db.run(
        'DELETE FROM user_sessions WHERE user_id = ?',
        [userId],
        (err) => {
          if (err) {
            this.logger.logError(err, {
              context: 'TokenManager',
              message: 'セッション無効化に失敗'
            });
            resolve();
          } else {
            resolve();
          }
        }
      );
    });
  }

  static async verifyToken(token: string): Promise<TokenVerificationResult> {
    try {
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return { valid: false, error: 'Token is blacklisted' };
      }

      return new Promise((resolve) => {
        this.db.get(
          'SELECT metadata FROM tokens WHERE token = ? AND expires_at > ?',
          [token, Date.now()],
          (err, row: { metadata: string } | undefined) => {
            if (err || !row) {
              resolve({
                valid: false,
                error: 'Token not found or expired'
              });
              return;
            }

            try {
              const metadata: TokenMetadata = JSON.parse(row.metadata);
              resolve({
                valid: true,
                userId: metadata.userId
              });
            } catch {
              resolve({
                valid: false,
                error: 'Invalid token metadata'
              });
            }
          }
        );
      });
    } catch (error) {
      return {
        valid: false,
        error: 'Token verification failed'
      };
    }
  }
}