import { Database } from 'sqlite3';
import { DatabaseRecord, QueryParams, RunResult } from '../types/database';
export declare class SQLiteService {
    private static instance;
    private db;
    private operationsCount;
    private constructor();
    private initializeDatabase;
    static getInstance(): SQLiteService;
    getDb(): Database;
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