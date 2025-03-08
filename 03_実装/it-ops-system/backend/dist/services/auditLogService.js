"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = exports.AuditLogType = void 0;
const sqliteService_1 = require("./sqliteService");
const loggingService_1 = __importDefault(require("./loggingService"));
// 監査ログのタイプ
var AuditLogType;
(function (AuditLogType) {
    AuditLogType["PERMISSION_CHANGE"] = "PERMISSION_CHANGE";
    AuditLogType["ROLE_ASSIGNMENT"] = "ROLE_ASSIGNMENT";
    AuditLogType["ROLE_REMOVAL"] = "ROLE_REMOVAL";
    AuditLogType["API_PERMISSION_CHANGE"] = "API_PERMISSION_CHANGE";
    AuditLogType["GLOBAL_ADMIN_ACTION"] = "GLOBAL_ADMIN_ACTION";
    AuditLogType["SYSTEM_CONFIG_CHANGE"] = "SYSTEM_CONFIG_CHANGE";
    AuditLogType["SECURITY_POLICY_CHANGE"] = "SECURITY_POLICY_CHANGE";
})(AuditLogType || (exports.AuditLogType = AuditLogType = {}));
// 監査ログサービス
class AuditLogService {
    constructor() {
        // SQLiteServiceは非同期で初期化するため、getInstanceSyncを使用
        this.sqlite = sqliteService_1.SQLiteService.getInstanceSync();
        this.logger = loggingService_1.default.getInstance();
        // 初期化は非同期で行うため、コンストラクタでは呼び出さない
    }
    /**
     * シングルトンインスタンスを取得
     */
    static async getInstance() {
        if (!AuditLogService.instance) {
            AuditLogService.instance = new AuditLogService();
            // SQLiteServiceが初期化されるのを待ってから初期化
            await AuditLogService.instance.initialize();
        }
        return AuditLogService.instance;
    }
    /**
     * 同期的にインスタンスを取得（初期化が完了していない可能性あり）
     */
    static getInstanceSync() {
        if (!AuditLogService.instance) {
            AuditLogService.instance = new AuditLogService();
            // 非同期初期化をバックグラウンドで開始
            AuditLogService.instance.initialize().catch(err => {
                console.error('AuditLogService初期化エラー:', err);
            });
        }
        return AuditLogService.instance;
    }
    /**
     * サービスを初期化
     */
    async initialize() {
        try {
            // SQLiteServiceが初期化されるのを待つ
            await this.sqlite.initialize();
            // データベースを初期化
            await this.initializeDatabase();
        }
        catch (error) {
            this.logger.logError(error, {
                context: 'AuditLogService',
                message: 'サービスの初期化に失敗しました'
            });
            throw error;
        }
    }
    async initializeDatabase() {
        try {
            // 監査ログテーブルの作成
            await this.sqlite.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT NOT NULL,
          target_user_id TEXT,
          action TEXT NOT NULL,
          type TEXT NOT NULL,
          details TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT
        )
      `);
            // インデックスの作成（検索パフォーマンス向上のため）
            await this.sqlite.run(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)
      `);
            // typeカラムが存在するか確認してからインデックスを作成
            try {
                // まずテーブル情報を取得
                const tableInfo = await this.sqlite.all(`PRAGMA table_info(audit_logs)`);
                const hasTypeColumn = tableInfo.some((column) => column.name === 'type');
                if (hasTypeColumn) {
                    await this.sqlite.run(`
            CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON audit_logs(type)
          `);
                }
                else {
                    // typeカラムが存在しない場合は、カラムを追加
                    this.logger.logInfo({
                        message: 'audit_logsテーブルにtypeカラムが存在しないため、追加します',
                        context: 'AuditLogService'
                    });
                    await this.sqlite.run(`ALTER TABLE audit_logs ADD COLUMN type TEXT DEFAULT 'SYSTEM_CONFIG_CHANGE'`);
                    // カラム追加後にインデックスを作成
                    await this.sqlite.run(`
            CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON audit_logs(type)
          `);
                }
            }
            catch (error) {
                this.logger.logError(error, {
                    context: 'AuditLogService',
                    message: 'typeカラムのインデックス作成に失敗しました'
                });
            }
            await this.sqlite.run(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)
      `);
        }
        catch (error) {
            this.logger.logError(error, {
                context: 'AuditLogService',
                message: '監査ログテーブルの初期化に失敗しました'
            });
        }
    }
    /**
     * 情報ログを記録する
     * @param data ログデータ
     */
    logInfo(data) {
        this.logger.logInfo(data);
    }
    /**
     * エラーログを記録する
     * @param error エラーオブジェクト
     * @param data 追加データ
     */
    logError(error, data) {
        this.logger.logError(error, data);
    }
    /**
     * セキュリティログを記録する
     * @param data セキュリティログデータ
     */
    logSecurity(data) {
        this.logger.logSecurity(data);
    }
    /**
     * 監査ログを記録する
     * @param entry 監査ログエントリ
     * @returns 作成された監査ログのID
     */
    async log(entry) {
        try {
            const result = await this.sqlite.run(`
        INSERT INTO audit_logs 
          (user_id, target_user_id, action, type, details, ip_address, user_agent)
        VALUES 
          (?, ?, ?, ?, ?, ?, ?)
      `, [
                entry.userId,
                entry.targetUserId || null,
                entry.action,
                entry.type,
                JSON.stringify(entry.details),
                entry.ipAddress || null,
                entry.userAgent || null
            ]);
            this.logger.logInfo({
                message: '監査ログが記録されました',
                details: {
                    type: entry.type,
                    action: entry.action,
                    userId: entry.userId
                }
            });
            return result.lastID;
        }
        catch (error) {
            this.logger.logError(error, {
                context: 'AuditLogService',
                message: '監査ログの記録に失敗しました',
                details: entry
            });
            throw error;
        }
    }
    /**
     * 監査ログを検索する
     * @param filters フィルター条件
     * @param limit 取得件数制限
     * @param offset ページネーション用オフセット
     * @returns 監査ログエントリの配列
     */
    async search(filters, limit = 100, offset = 0) {
        try {
            let query = 'SELECT * FROM audit_logs WHERE 1=1';
            const params = [];
            if (filters.userId) {
                query += ' AND user_id = ?';
                params.push(filters.userId);
            }
            if (filters.targetUserId) {
                query += ' AND target_user_id = ?';
                params.push(filters.targetUserId);
            }
            if (filters.type) {
                query += ' AND type = ?';
                params.push(filters.type);
            }
            if (filters.action) {
                query += ' AND action = ?';
                params.push(filters.action);
            }
            if (filters.startDate) {
                query += ' AND timestamp >= ?';
                params.push(filters.startDate);
            }
            if (filters.endDate) {
                query += ' AND timestamp <= ?';
                params.push(filters.endDate);
            }
            query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            const results = await this.sqlite.all(query, params);
            // 結果を適切な形式に変換
            return results.map((row) => ({
                id: row.id,
                timestamp: row.timestamp,
                userId: row.user_id,
                targetUserId: row.target_user_id,
                action: row.action,
                type: row.type,
                details: JSON.parse(row.details),
                ipAddress: row.ip_address,
                userAgent: row.user_agent
            }));
        }
        catch (error) {
            this.logger.logError(error, {
                context: 'AuditLogService',
                message: '監査ログの検索に失敗しました',
                filters
            });
            throw error;
        }
    }
    /**
     * 特定の監査ログエントリを取得する
     * @param id 監査ログID
     * @returns 監査ログエントリ、存在しない場合はnull
     */
    async getById(id) {
        try {
            const row = await this.sqlite.get('SELECT * FROM audit_logs WHERE id = ?', [id]);
            if (!row)
                return null;
            return {
                id: row.id,
                timestamp: row.timestamp,
                userId: row.user_id,
                targetUserId: row.target_user_id,
                action: row.action,
                type: row.type,
                details: JSON.parse(row.details),
                ipAddress: row.ip_address,
                userAgent: row.user_agent
            };
        }
        catch (error) {
            this.logger.logError(error, {
                context: 'AuditLogService',
                message: '監査ログの取得に失敗しました',
                id
            });
            return null;
        }
    }
    /**
     * 特定のユーザーに対する監査ログを取得する
     * @param userId ユーザーID
     * @param limit 取得件数制限
     * @returns 監査ログエントリの配列
     */
    async getUserLogs(userId, limit = 50) {
        try {
            const results = await this.sqlite.all(`SELECT * FROM audit_logs 
         WHERE user_id = ? OR target_user_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`, [userId, userId, limit]);
            return results.map((row) => ({
                id: row.id,
                timestamp: row.timestamp,
                userId: row.user_id,
                targetUserId: row.target_user_id,
                action: row.action,
                type: row.type,
                details: JSON.parse(row.details),
                ipAddress: row.ip_address,
                userAgent: row.user_agent
            }));
        }
        catch (error) {
            this.logger.logError(error, {
                context: 'AuditLogService',
                message: 'ユーザー監査ログの取得に失敗しました',
                userId
            });
            return [];
        }
    }
    /**
     * 特定の種類の最新の監査ログを取得する
     * @param type 監査ログタイプ
     * @param limit 取得件数制限
     * @returns 監査ログエントリの配列
     */
    async getLatestByType(type, limit = 10) {
        try {
            const results = await this.sqlite.all(`SELECT * FROM audit_logs 
         WHERE type = ?
         ORDER BY timestamp DESC
         LIMIT ?`, [type, limit]);
            return results.map((row) => ({
                id: row.id,
                timestamp: row.timestamp,
                userId: row.user_id,
                targetUserId: row.target_user_id,
                action: row.action,
                type: row.type,
                details: JSON.parse(row.details),
                ipAddress: row.ip_address,
                userAgent: row.user_agent
            }));
        }
        catch (error) {
            this.logger.logError(error, {
                context: 'AuditLogService',
                message: '特定タイプの監査ログの取得に失敗しました',
                type
            });
            return [];
        }
    }
}
exports.AuditLogService = AuditLogService;
exports.default = AuditLogService;
//# sourceMappingURL=auditLogService.js.map