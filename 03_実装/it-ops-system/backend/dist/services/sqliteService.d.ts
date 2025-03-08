import sqlite3 from 'sqlite3';
import { DatabaseRecord, QueryParams, RunResult } from '../types/database';
export declare class SQLiteService {
    private static instance;
    private db;
    private operationsCount;
    private constructor();
    /**
     * データベースを初期化する
     * この関数は getInstance() から呼び出される
     */
    initialize(): Promise<void>;
    /**
     * マイグレーションを実行する
     */
    private runMigrations;
    private initializeDatabase;
    static getInstance(): Promise<SQLiteService>;
    /**
     * 同期的にインスタンスを取得する
     * 注意: このメソッドは初期化が完了していない可能性があります
     */
    static getInstanceSync(): SQLiteService;
    getDb(): sqlite3.Database;
    getOperationsCount(): Promise<number>;
    getPragmaValue(pragmaName: string): Promise<any>;
    getMemoryUsage(): Promise<number>;
    exec(sql: string): Promise<void>;
    run(sql: string, params?: QueryParams): Promise<RunResult>;
    get<T extends DatabaseRecord = DatabaseRecord>(sql: string, params?: QueryParams): Promise<T | undefined>;
    all<T extends DatabaseRecord = DatabaseRecord>(sql: string, params?: QueryParams): Promise<T[]>;
    each<T extends DatabaseRecord = DatabaseRecord>(sql: string, params: QueryParams | undefined, callback: (row: T) => void): Promise<void>;
    map<T extends DatabaseRecord = DatabaseRecord, R = any>(sql: string, params: QueryParams | undefined, mapFn: (row: T) => R): Promise<R[]>;
    healthCheck(): Promise<boolean>;
    close(): void;
}
//# sourceMappingURL=sqliteService.d.ts.map