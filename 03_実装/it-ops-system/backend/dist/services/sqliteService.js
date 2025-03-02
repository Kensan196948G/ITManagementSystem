"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteService = void 0;
const loggingService_1 = __importDefault(require("./loggingService"));
const sqlite3_1 = require("sqlite3");
const path_1 = __importDefault(require("path"));
const logger = loggingService_1.default.getInstance();
class SQLiteService {
    constructor() {
        this.db = null;
        this.operationsCount = 0;
        this.initializeDatabase();
    }
    initializeDatabase() {
        try {
            const dbPath = path_1.default.join(process.cwd(), 'database.sqlite');
            this.db = new sqlite3_1.Database(dbPath, (err) => {
                if (err)
                    throw err;
            });
            // 基本設定
            this.db.exec('PRAGMA journal_mode = DELETE; PRAGMA synchronous = NORMAL;');
        }
        catch (error) {
            logger.logError(error, {
                context: 'SQLiteService',
                message: 'データベース初期化エラー'
            });
            throw error;
        }
    }
    static getInstance() {
        if (!SQLiteService.instance) {
            SQLiteService.instance = new SQLiteService();
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
                await this.initialize();
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