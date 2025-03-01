import LoggingService from './loggingService';
import { Database } from 'sqlite3';
import path from 'path';
import { DatabaseRecord, QueryParams, RunResult } from '../types/database';

const logger = LoggingService.getInstance();

export class SQLiteService {
  private static instance: SQLiteService;
  private db: Database | null = null;
  private operationsCount: number = 0;

  private constructor() {
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    try {
      const dbPath = path.join(process.cwd(), 'database.sqlite');
      this.db = new Database(dbPath, (err) => {
        if (err) throw err;
      });

      // 基本設定
      this.db.exec('PRAGMA journal_mode = DELETE; PRAGMA synchronous = NORMAL;');
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SQLiteService',
        message: 'データベース初期化エラー'
      });
      throw error;
    }
  }

  public static getInstance(): SQLiteService {
    if (!SQLiteService.instance) {
      SQLiteService.instance = new SQLiteService();
    }
    return SQLiteService.instance;
  }

  public getDb(): Database {
    if (!this.db) {
      throw new Error('Database is not initialized');
    }
    return this.db;
  }

  public async getOperationsCount(): Promise<number> {
    return this.operationsCount;
  }

  public async getPragmaValue(pragmaName: string): Promise<any> {
    try {
      if (!this.db) {
        throw new Error('Database is not initialized');
      }
      return new Promise((resolve, reject) => {
        this.db!.get(`PRAGMA ${pragmaName}`, (err, row: Record<string, any>) => {
          if (err) {
            logger.logError(err, {
              context: 'SQLiteService',
              message: `Failed to get pragma ${pragmaName}`
            });
            reject(err);
          } else {
            resolve(row ? row[pragmaName] : null);
          }
        });
      });
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SQLiteService',
        message: `Error getting pragma ${pragmaName}`
      });
      throw error;
    }
  }

  public async getMemoryUsage(): Promise<number> {
    try {
      const memoryUsed = await this.getPragmaValue('memory_used');
      return typeof memoryUsed === 'number' ? memoryUsed : 0;
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SQLiteService',
        message: 'Error getting memory usage'
      });
      return 0;
    }
  }

  public exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database is not initialized'));
        return;
      }
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public run(sql: string, params: QueryParams = []): Promise<RunResult> {
    this.operationsCount++;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database is not initialized'));
        return;
      }
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  public get<T extends DatabaseRecord = DatabaseRecord>(
    sql: string,
    params: QueryParams = []
  ): Promise<T | undefined> {
    this.operationsCount++;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database is not initialized'));
        return;
      }
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  public all<T extends DatabaseRecord = DatabaseRecord>(
    sql: string,
    params: QueryParams = []
  ): Promise<T[]> {
    this.operationsCount++;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database is not initialized'));
        return;
      }
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  public async each<T extends DatabaseRecord = DatabaseRecord>(
    sql: string,
    params: QueryParams = [],
    callback: (row: T) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database is not initialized'));
        return;
      }
      this.db.each(
        sql,
        params,
        (err, row) => {
          if (err) reject(err);
          else callback(row as T);
        },
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  public async map<T extends DatabaseRecord = DatabaseRecord, R = any>(
    sql: string,
    params: QueryParams = [],
    mapFn: (row: T) => R
  ): Promise<R[]> {
    const rows = await this.all<T>(sql, params);
    return rows.map(mapFn);
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.get('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  public close(): void {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SQLiteService',
        message: 'データベース接続のクローズに失敗'
      });
    }
  }
}