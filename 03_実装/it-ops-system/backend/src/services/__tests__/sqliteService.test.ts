import { SQLiteService } from '../sqliteService';
import sqlite3 from 'sqlite3';

jest.mock('sqlite3', () => ({
  Database: jest.fn()
}));

describe('SQLiteService', () => {
  let sqliteService: SQLiteService;
  let mockDb: jest.Mocked<sqlite3.Database>;

  beforeEach(() => {
    mockDb = {
      run: jest.fn(),
      all: jest.fn(),
      get: jest.fn(),
      exec: jest.fn(),
      close: jest.fn()
    } as any;

    (sqlite3.Database as jest.Mock).mockImplementation((_, __, callback) => {
      callback?.(null);
      return mockDb;
    });

    sqliteService = SQLiteService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('シングルトンインスタンスを返すこと', () => {
      const instance1 = SQLiteService.getInstance();
      const instance2 = SQLiteService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('データベース接続を初期化できること', async () => {
      await expect(sqliteService.initialize()).resolves.not.toThrow();
      expect(sqlite3.Database).toHaveBeenCalled();
    });

    it('データベース接続エラーを処理できること', async () => {
      (sqlite3.Database as jest.Mock).mockImplementationOnce((_, __, callback) => {
        callback?.(new Error('Connection failed'));
        return mockDb;
      });

      await expect(sqliteService.initialize()).rejects.toThrow('Connection failed');
    });
  });

  describe('run', () => {
    it('SQLクエリを実行できること', async () => {
      mockDb.run.mockImplementation((_, __, callback) => {
        callback?.(null, { lastID: 1 });
      });

      const result = await sqliteService.run('INSERT INTO test VALUES (?)', ['value']);
      expect(result.lastID).toBe(1);
      expect(mockDb.run).toHaveBeenCalled();
    });

    it('クエリエラーを処理できること', async () => {
      mockDb.run.mockImplementation((_, __, callback) => {
        callback?.(new Error('Query failed'));
      });

      await expect(sqliteService.run('INVALID SQL')).rejects.toThrow('Query failed');
    });
  });

  describe('all', () => {
    it('複数の結果を返すクエリを実行できること', async () => {
      const mockRows = [{ id: 1 }, { id: 2 }];
      mockDb.all.mockImplementation((_, __, callback) => {
        callback?.(null, mockRows);
      });

      const results = await sqliteService.all('SELECT * FROM test');
      expect(results).toEqual(mockRows);
      expect(mockDb.all).toHaveBeenCalled();
    });

    it('クエリエラーを処理できること', async () => {
      mockDb.all.mockImplementation((_, __, callback) => {
        callback?.(new Error('Query failed'));
      });

      await expect(sqliteService.all('INVALID SQL')).rejects.toThrow('Query failed');
    });
  });

  describe('get', () => {
    it('単一の結果を返すクエリを実行できること', async () => {
      const mockRow = { id: 1 };
      mockDb.get.mockImplementation((_, __, callback) => {
        callback?.(null, mockRow);
      });

      const result = await sqliteService.get('SELECT * FROM test WHERE id = ?', [1]);
      expect(result).toEqual(mockRow);
      expect(mockDb.get).toHaveBeenCalled();
    });

    it('結果が見つからない場合にnullを返すこと', async () => {
      mockDb.get.mockImplementation((_, __, callback) => {
        callback?.(null, undefined);
      });

      const result = await sqliteService.get('SELECT * FROM test WHERE id = ?', [999]);
      expect(result).toBeNull();
    });

    it('クエリエラーを処理できること', async () => {
      mockDb.get.mockImplementation((_, __, callback) => {
        callback?.(new Error('Query failed'));
      });

      await expect(sqliteService.get('INVALID SQL')).rejects.toThrow('Query failed');
    });
  });

  describe('exec', () => {
    it('複数のSQLステートメントを実行できること', async () => {
      mockDb.exec.mockImplementation((_, callback) => {
        callback?.(null);
      });

      await expect(sqliteService.exec('CREATE TABLE test; INSERT INTO test VALUES (1);'))
        .resolves.not.toThrow();
      expect(mockDb.exec).toHaveBeenCalled();
    });

    it('実行エラーを処理できること', async () => {
      mockDb.exec.mockImplementation((_, callback) => {
        callback?.(new Error('Execution failed'));
      });

      await expect(sqliteService.exec('INVALID SQL')).rejects.toThrow('Execution failed');
    });
  });

  describe('healthCheck', () => {
    it('正常な状態を確認できること', async () => {
      mockDb.get.mockImplementation((_, callback) => {
        callback?.(null, { result: 1 });
      });

      const isHealthy = await sqliteService.healthCheck();
      expect(isHealthy).toBe(true);
      expect(mockDb.get).toHaveBeenCalledWith('SELECT 1 as result', expect.any(Function));
    });

    it('異常な状態を検出できること', async () => {
      mockDb.get.mockImplementation((_, callback) => {
        callback?.(new Error('Health check failed'));
      });

      const isHealthy = await sqliteService.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });
});