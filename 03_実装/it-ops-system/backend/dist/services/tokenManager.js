"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenManager = void 0;
const uuid_1 = require("uuid");
const loggingService_1 = __importDefault(require("./loggingService"));
const sqliteService_1 = require("./sqliteService");
class TokenManager {
    static async initialize() {
        try {
            // SQLiteServiceからデータベース接続を取得
            this.db = sqliteService_1.SQLiteService.getInstance().getDb();
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
            await new Promise((resolve, reject) => {
                this.db.exec(createTablesSQL, (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        }
        catch (error) {
            this.logger.logError(error, {
                context: 'TokenManager',
                message: 'データベース初期化エラー'
            });
            throw error;
        }
    }
    static async blacklistToken(tokenData) {
        return new Promise((resolve) => {
            const expiresAt = Math.ceil(tokenData.expiresAt.getTime());
            this.db.run('INSERT INTO token_blacklist (token, data, expires_at) VALUES (?, ?, ?)', [tokenData.token, JSON.stringify(tokenData), expiresAt], (err) => {
                if (err) {
                    this.logger.logError(err, {
                        context: 'TokenManager',
                        message: 'トークンのブラックリスト追加に失敗'
                    });
                    resolve();
                }
                else {
                    resolve();
                }
            });
        });
    }
    static async isTokenBlacklisted(token) {
        try {
            const now = Date.now();
            return new Promise((resolve) => {
                this.db.get('SELECT COUNT(*) as count FROM token_blacklist WHERE token = ? AND expires_at > ?', [token, now], (err, row) => {
                    if (err) {
                        this.logger.logError(err, {
                            context: 'TokenManager',
                            message: 'トークンのブラックリスト確認に失敗'
                        });
                        resolve(false);
                    }
                    else {
                        resolve(row.count > 0);
                    }
                });
            });
        }
        catch (error) {
            this.logger.logError(error, {
                context: 'TokenManager',
                message: 'トークンのブラックリスト確認に失敗'
            });
            return false;
        }
    }
    static async getUserActiveSessions(userId) {
        return new Promise((resolve) => {
            this.db.get('SELECT session_count FROM user_sessions WHERE user_id = ?', [userId], (err, row) => {
                if (err) {
                    this.logger.logError(err, {
                        context: 'TokenManager',
                        message: 'アクティブセッション数の取得に失敗'
                    });
                    resolve(0);
                }
                else {
                    resolve(row?.session_count ?? 0);
                }
            });
        });
    }
    static async addUserSession(userId) {
        return new Promise((resolve) => {
            this.db.run(`INSERT INTO user_sessions (user_id, session_count)
         VALUES (?, 1)
         ON CONFLICT(user_id) DO UPDATE SET session_count = session_count + 1`, [userId], (err) => {
                if (err) {
                    this.logger.logError(err, {
                        context: 'TokenManager',
                        message: 'セッション追加に失敗'
                    });
                    resolve();
                }
                else {
                    resolve();
                }
            });
        });
    }
    static async removeUserSession(userId) {
        return new Promise((resolve) => {
            this.db.run(`UPDATE user_sessions 
         SET session_count = CASE 
           WHEN session_count > 0 THEN session_count - 1 
           ELSE 0 
         END
         WHERE user_id = ?`, [userId], (err) => {
                if (err) {
                    this.logger.logError(err, {
                        context: 'TokenManager',
                        message: 'セッション削除に失敗'
                    });
                    resolve(); // エラーの場合でもresolve
                }
                else {
                    resolve();
                }
            });
        });
    }
    static async createToken(userId, clientInfo) {
        const token = (0, uuid_1.v4)();
        const metadata = {
            userId,
            issuedAt: Date.now(),
            rotationCount: 0,
            lastRotation: Date.now(),
            clientInfo
        };
        try {
            this.db.prepare('INSERT INTO tokens (token, metadata, expires_at) VALUES (?, ?, ?)').run(token, JSON.stringify(metadata), Date.now() + this.ROTATION_CONFIG.maxAge);
            await this.addUserSession(userId);
            return token;
        }
        catch (error) {
            this.logger.logError(error, {
                context: 'TokenManager',
                message: 'トークン作成に失敗'
            });
            throw error;
        }
    }
    static async invalidateAllUserSessions(userId) {
        return new Promise((resolve) => {
            this.db.run('DELETE FROM user_sessions WHERE user_id = ?', [userId], (err) => {
                if (err) {
                    this.logger.logError(err, {
                        context: 'TokenManager',
                        message: 'セッション無効化に失敗'
                    });
                    resolve();
                }
                else {
                    resolve();
                }
            });
        });
    }
    static async verifyToken(token) {
        try {
            const isBlacklisted = await this.isTokenBlacklisted(token);
            if (isBlacklisted) {
                return { valid: false, error: 'Token is blacklisted' };
            }
            return new Promise((resolve) => {
                this.db.get('SELECT metadata FROM tokens WHERE token = ? AND expires_at > ?', [token, Date.now()], (err, row) => {
                    if (err || !row) {
                        resolve({
                            valid: false,
                            error: 'Token not found or expired'
                        });
                        return;
                    }
                    try {
                        const metadata = JSON.parse(row.metadata);
                        resolve({
                            valid: true,
                            userId: metadata.userId
                        });
                    }
                    catch {
                        resolve({
                            valid: false,
                            error: 'Invalid token metadata'
                        });
                    }
                });
            });
        }
        catch (error) {
            return {
                valid: false,
                error: 'Token verification failed'
            };
        }
    }
}
exports.TokenManager = TokenManager;
TokenManager.logger = loggingService_1.default.getInstance();
TokenManager.ROTATION_CONFIG = {
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    rotationWindow: 60 * 60 * 1000, // 1時間
    maxRotations: 24 // 最大24回のローテーション
};
//# sourceMappingURL=tokenManager.js.map