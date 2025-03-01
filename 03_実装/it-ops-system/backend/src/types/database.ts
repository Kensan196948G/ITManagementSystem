// SQLiteの共通型定義
export interface DatabaseRecord {
  id?: number | string;
  [key: string]: any;
}

export interface QueryResult extends DatabaseRecord {
  value?: string;
  count?: number;
  session_count?: number;
}

export interface RunResult {
  lastID: number;
  changes: number;
}

export interface DatabaseError extends Error {
  code?: string;
  errno?: number;
}

// クエリパラメータの型
export type QueryParams = any[] | Record<string, any>;

// トランザクション関連の型
export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  run(sql: string, params?: QueryParams): Promise<RunResult>;
  get<T extends DatabaseRecord = DatabaseRecord>(sql: string, params?: QueryParams): Promise<T | undefined>;
  all<T extends DatabaseRecord = DatabaseRecord>(sql: string, params?: QueryParams): Promise<T[]>;
}