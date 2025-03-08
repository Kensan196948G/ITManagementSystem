"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqliteService_1 = require("../sqliteService");
const sqlite3_1 = __importDefault(require("sqlite3"));
jest.mock('sqlite3', () => ({
    Database: jest.fn()
}));
describe('SQLiteService', () => {
    let sqliteService;
    let mockDb;
    beforeEach(() => {
        mockDb = {
            run: jest.fn(),
            all: jest.fn(),
            get: jest.fn(),
            exec: jest.fn(),
            close: jest.fn()
        };
        sqlite3_1.default.Database.mockImplementation((_, __, callback) => {
            callback?.(null);
            return mockDb;
        });
        sqliteService = sqliteService_1.SQLiteService.getInstance();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('getInstance', () => {
        it('シングルトンインスタンスを返すこと', () => {
            const instance1 = sqliteService_1.SQLiteService.getInstance();
            const instance2 = sqliteService_1.SQLiteService.getInstance();
            expect(instance1).toBe(instance2);
        });
    });
    describe('healthCheck', () => {
        it('データベース接続を初期化できること', async () => {
            await expect(sqliteService.healthCheck()).resolves.not.toThrow();
            expect(sqlite3_1.default.Database).toHaveBeenCalled();
        });
        it('データベース接続エラーを処理できること', async () => {
            mockDb.get.mockImplementationOnce((_, callback) => {
                callback?.(new Error('Connection failed'));
                return mockDb;
            });
            const isHealthy = await sqliteService.healthCheck();
            expect(isHealthy).toBe(false);
        });
    });
    describe('run', () => {
        it('SQLクエリを実行できること', async () => {
            mockDb.run.mockImplementation((_, __, callback) => {
                callback?.(null, { lastID: 1 });
                return mockDb;
            });
            const result = await sqliteService.run('INSERT INTO test VALUES (?)', ['value']);
            expect(result.lastID).toBe(1);
            expect(mockDb.run).toHaveBeenCalled();
        });
        it('クエリエラーを処理できること', async () => {
            mockDb.run.mockImplementation((_, __, callback) => {
                callback?.(new Error('Query failed'));
                return mockDb;
            });
            await expect(sqliteService.run('INVALID SQL')).rejects.toThrow('Query failed');
        });
    });
    describe('all', () => {
        it('複数の結果を返すクエリを実行できること', async () => {
            const mockRows = [{ id: 1 }, { id: 2 }];
            mockDb.all.mockImplementation((_, __, callback) => {
                callback?.(null, mockRows);
                return mockDb;
            });
            const results = await sqliteService.all('SELECT * FROM test');
            expect(results).toEqual(mockRows);
            expect(mockDb.all).toHaveBeenCalled();
        });
        it('クエリエラーを処理できること', async () => {
            mockDb.all.mockImplementation((_, __, callback) => {
                callback?.(new Error('Query failed'));
                return mockDb;
            });
            await expect(sqliteService.all('INVALID SQL')).rejects.toThrow('Query failed');
        });
    });
    describe('get', () => {
        it('単一の結果を返すクエリを実行できること', async () => {
            const mockRow = { id: 1 };
            mockDb.get.mockImplementation((_, __, callback) => {
                callback?.(null, mockRow);
                return mockDb;
            });
            const result = await sqliteService.get('SELECT * FROM test WHERE id = ?', [1]);
            expect(result).toEqual(mockRow);
            expect(mockDb.get).toHaveBeenCalled();
        });
        it('結果が見つからない場合にnullを返すこと', async () => {
            mockDb.get.mockImplementation((_, __, callback) => {
                callback?.(null, undefined);
                return mockDb;
            });
            const result = await sqliteService.get('SELECT * FROM test WHERE id = ?', [999]);
            expect(result).toBeNull();
        });
        it('クエリエラーを処理できること', async () => {
            mockDb.get.mockImplementation((_, __, callback) => {
                callback?.(new Error('Query failed'));
                return mockDb;
            });
            await expect(sqliteService.get('INVALID SQL')).rejects.toThrow('Query failed');
        });
    });
    describe('exec', () => {
        it('複数のSQLステートメントを実行できること', async () => {
            mockDb.exec.mockImplementation((_, callback) => {
                callback?.(null);
                return mockDb;
            });
            await expect(sqliteService.exec('CREATE TABLE test; INSERT INTO test VALUES (1);'))
                .resolves.not.toThrow();
            expect(mockDb.exec).toHaveBeenCalled();
        });
        it('実行エラーを処理できること', async () => {
            mockDb.exec.mockImplementation((_, callback) => {
                callback?.(new Error('Execution failed'));
                return mockDb;
            });
            await expect(sqliteService.exec('INVALID SQL')).rejects.toThrow('Execution failed');
        });
    });
    describe('healthCheck', () => {
        it('正常な状態を確認できること', async () => {
            mockDb.get.mockImplementation((_, callback) => {
                callback?.(null, { result: 1 });
                return mockDb;
            });
            const isHealthy = await sqliteService.healthCheck();
            expect(isHealthy).toBe(true);
            expect(mockDb.get).toHaveBeenCalledWith('SELECT 1 as result', expect.any(Function));
        });
        it('異常な状態を検出できること', async () => {
            mockDb.get.mockImplementation((_, callback) => {
                callback?.(new Error('Health check failed'));
                return mockDb;
            });
            const isHealthy = await sqliteService.healthCheck();
            expect(isHealthy).toBe(false);
        });
    });
});
//# sourceMappingURL=sqliteService.test.js.map