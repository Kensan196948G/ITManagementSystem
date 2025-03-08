"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteService = void 0;
const loggingService_1 = __importDefault(require("./loggingService"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const _20230915_create_permission_audit_logs_1 = require("../migrations/20230915_create_permission_audit_logs");
const logger = loggingService_1.default.getInstance();
const { Database } = sqlite3_1.default.verbose();
class SQLiteService {
    constructor() {
        this.db = null;
        this.operationsCount = 0;
        // コンストラクタでは非同期処理を直接扱えないため、
        // 初期化は getInstance() で行う
    }
    /**
     * データベースを初期化する
     * この関数は getInstance() から呼び出される
     */
    async initialize() {
        if (this.db)
            return; // 既に初期化済みの場合は何もしない
        await this.initializeDatabase();
    }
    /**
     * マイグレーションを実行する
     */
    async runMigrations() {
        try {
            // 権限監査ログテーブルの作成
            await (0, _20230915_create_permission_audit_logs_1.up)(this);
            logger.logInfo('マイグレーションが正常に実行されました');
        }
        catch (error) {
            logger.logError(error, {
                context: 'SQLiteService',
                message: 'マイグレーション実行中にエラーが発生しました'
            });
            throw error;
        }
    }
    async initializeDatabase() {
        try {
            const dbPath = path_1.default.join(process.cwd(), 'database.sqlite');
            // データベース接続を Promise でラップして非同期処理を同期的に扱う
            await new Promise((resolve, reject) => {
                this.db = new Database(dbPath, (err) => {
                    if (err) {
                        logger.logError(err, {
                            context: 'SQLiteService',
                            message: 'データベース接続エラー'
                        });
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
            // 基本設定（データベース接続が確立された後に実行）
            await this.exec('PRAGMA journal_mode = DELETE');
            await this.exec('PRAGMA synchronous = NORMAL');
            // データベース接続が成功したら、マイグレーションを実行
            await this.runMigrations();
            logger.logInfo({
                context: 'SQLiteService',
                message: 'データベースが正常に初期化されました'
            });
        }
        catch (error) {
            logger.logError(error, {
                context: 'SQLiteService',
                message: 'データベース初期化エラー'
            });
            throw error;
        }
    }
    static async getInstance() {
        if (!SQLiteService.instance) {
            SQLiteService.instance = new SQLiteService();
            await SQLiteService.instance.initialize();
        }
        return SQLiteService.instance;
    }
    /**
     * 同期的にインスタンスを取得する
     * 注意: このメソッドは初期化が完了していない可能性があります
     */
    static getInstanceSync() {
        if (!SQLiteService.instance) {
            SQLiteService.instance = new SQLiteService();
            // 非同期初期化をバックグラウンドで開始
            SQLiteService.instance.initialize().catch(err => {
                logger.logError(err, {
                    context: 'SQLiteService',
                    message: 'バックグラウンド初期化に失敗しました'
                });
            });
        }
        return SQLiteService.instance;
    }
    getDb() {
        if (!this.db) {
            throw new Error('Database is not initialized');
        }
        return this.db;
    }
    async getOperationsCount() {
        return this.operationsCount;
    }
    async getPragmaValue(pragmaName) {
        try {
            if (!this.db) {
                throw new Error('Database is not initialized');
            }
            return new Promise((resolve, reject) => {
                this.db.get(`PRAGMA ${pragmaName}`, (err, row) => {
                    if (err) {
                        logger.logError(err, {
                            context: 'SQLiteService',
                            message: `Failed to get pragma ${pragmaName}`
                        });
                        reject(err);
                    }
                    else {
                        resolve(row ? row[pragmaName] : null);
                    }
                });
            });
        }
        catch (error) {
            logger.logError(error, {
                context: 'SQLiteService',
                message: `Error getting pragma ${pragmaName}`
            });
            throw error;
        }
    }
    async getMemoryUsage() {
        try {
            const memoryUsed = await this.getPragmaValue('memory_used');
            return typeof memoryUsed === 'number' ? memoryUsed : 0;
        }
        catch (error) {
            logger.logError(error, {
                context: 'SQLiteService',
                message: 'Error getting memory usage'
            });
            return 0;
        }
    }
    exec(sql) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database is not initialized'));
                return;
            }
            this.db.exec(sql, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    run(sql, params = []) {
        this.operationsCount++;
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database is not initialized'));
                return;
            }
            this.db.run(sql, params, function (err) {
                if (err)
                    reject(err);
                else
                    resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }
    get(sql, params = []) {
        this.operationsCount++;
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database is not initialized'));
                return;
            }
            this.db.get(sql, params, (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
    }
    all(sql, params = []) {
        this.operationsCount++;
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database is not initialized'));
                return;
            }
            this.db.all(sql, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async each(sql, params = [], callback) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database is not initialized'));
                return;
            }
            this.db.each(sql, params, (err, row) => {
                if (err)
                    reject(err);
                else
                    callback(row);
            }, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async map(sql, params = [], mapFn) {
        const rows = await this.all(sql, params);
        return rows.map(mapFn);
    }
    async healthCheck() {
        try {
            if (!this.db) {
                this.initializeDatabase();
            }
            const result = await this.get('SELECT 1');
            return result !== undefined;
        }
        catch (error) {
            logger.logError(error, {
                context: 'SQLiteService',
                message: 'ヘルスチェックエラー'
            });
            return false;
        }
    }
    close() {
        try {
            if (this.db) {
                this.db.close();
                this.db = null;
            }
        }
        catch (error) {
            logger.logError(error, {
                context: 'SQLiteService',
                message: 'データベース接続のクローズに失敗'
            });
        }
    }
}
exports.SQLiteService = SQLiteService;
//# sourceMappingURL=sqliteService.js.map