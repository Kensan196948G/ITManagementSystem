import LoggingService from './loggingService';
import sqlite3 from 'sqlite3';
import path from 'path';
import { DatabaseRecord, QueryParams, RunResult } from '../types/database';
import { up as createPermissionAuditLogs } from '../migrations/20230915_create_permission_audit_logs';

const logger = LoggingService.getInstance();
const { Database } = sqlite3.verbose();

export class SQLiteService {
  private static instance: SQLiteService;
  private db: sqlite3.Database | null = null;
  private operationsCount: number = 0;

  private constructor() {
    // コンストラクタでは非同期処理を直接扱えないため、
    // 初期化は getInstance() で行う
  }

  /**
   * データベースを初期化する
   * この関数は getInstance() から呼び出される
   */
  public async initialize(): Promise<void> {
    if (this.db) return; // 既に初期化済みの場合は何もしない
    await this.initializeDatabase();
  }

  /**
   * マイグレーションを実行する
   */
  private async runMigrations(): Promise<void> {
    try {
      // 権限監査ログテーブルの作成
      await createPermissionAuditLogs(this);
      
      logger.logInfo('マイグレーションが正常に実行されました');
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SQLiteService',
        message: 'マイグレーション実行中にエラーが発生しました'
      });
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const dbPath = path.join(process.cwd(), 'database.sqlite');
      
      // データベース接続を Promise でラップして非同期処理を同期的に扱う
      await new Promise<void>((resolve, reject) => {
        this.db = new Database(dbPath, (err: Error | null) => {
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
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SQLiteService',
        message: 'データベース初期化エラー'
      });
      throw error;
    }
  }

  public static async getInstance(): Promise<SQLiteService> {
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
  public static getInstanceSync(): SQLiteService {
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

  public getDb(): sqlite3.Database {
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
      if (!this.db) {
        this.initializeDatabase();
      }
      const result = await this.get('SELECT 1');
      return result !== undefined;
    } catch (error) {
      logger.logError(error as Error, {
        context: 'SQLiteService',
        message: 'ヘルスチェックエラー'
      });
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