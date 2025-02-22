export enum ErrorCode {
  // 認証関連エラー (1000-1999)
  AUTH_INVALID_CREDENTIALS = 1001,
  AUTH_TOKEN_EXPIRED = 1002,
  AUTH_TOKEN_INVALID = 1003,
  AUTH_TOKEN_MISSING = 1004,
  AUTH_SESSION_LIMIT = 1005,
  AUTH_INSUFFICIENT_PERMISSIONS = 1006,

  // Active Directory関連エラー (2000-2999)
  AD_CONNECTION_ERROR = 2001,
  AD_USER_NOT_FOUND = 2002,
  AD_GROUP_NOT_FOUND = 2003,
  AD_OPERATION_FAILED = 2004,

  // M365関連エラー (3000-3999)
  M365_API_ERROR = 3001,
  M365_LICENSE_NOT_AVAILABLE = 3002,
  M365_USER_NOT_FOUND = 3003,
  M365_OPERATION_FAILED = 3004,

  // データベース関連エラー (4000-4999)
  DB_CONNECTION_ERROR = 4001,
  DB_QUERY_FAILED = 4002,
  DB_RECORD_NOT_FOUND = 4003,
  DB_DUPLICATE_ENTRY = 4004,

  // バリデーションエラー (5000-5999)
  VALIDATION_FAILED = 5001,
  INVALID_PARAMETER = 5002,
  MISSING_REQUIRED_FIELD = 5003,
  INVALID_FORMAT = 5004,

  // システム監視エラー (6000-6999)
  MONITORING_SERVICE_ERROR = 6001,
  METRICS_COLLECTION_ERROR = 6002,
  ALERT_PROCESSING_ERROR = 6003,
  LOG_PROCESSING_ERROR = 6004,

  // 外部サービス連携エラー (7000-7999)
  EXTERNAL_SERVICE_ERROR = 7001,
  API_RATE_LIMIT_EXCEEDED = 7002,
  NETWORK_ERROR = 7003,
  TIMEOUT_ERROR = 7004,

  // その他のシステムエラー (9000-9999)
  INTERNAL_SERVER_ERROR = 9001,
  UNEXPECTED_ERROR = 9999
}

export interface AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: any;
  source?: string;
  timestamp: Date;
}

export class ApplicationError extends Error implements AppError {
  code: ErrorCode;
  statusCode: number;
  details?: any;
  source?: string;
  timestamp: Date;

  constructor(code: ErrorCode, message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
    this.source = new Error().stack;
  }

  toJSON() {
    return {
      status: 'error',
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

export class PermissionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export const errorCodes = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  GRAPH_API_ERROR: 'GRAPH_API_ERROR',
  INVALID_SCOPE: 'INVALID_SCOPE'
} as const;

export type ErrorCode = typeof errorCodes[keyof typeof errorCodes];

export const createError = (
  code: ErrorCode,
  message?: string,
  statusCode?: number,
  details?: any
): ApplicationError => {
  const defaultMessages: { [key in ErrorCode]: string } = {
    // 認証関連エラー (1000-1999)
    [ErrorCode.AUTH_INVALID_CREDENTIALS]: '認証情報が無効です',
    [ErrorCode.AUTH_TOKEN_EXPIRED]: 'トークンの有効期限が切れています',
    [ErrorCode.AUTH_TOKEN_INVALID]: '無効なトークンです',
    [ErrorCode.AUTH_TOKEN_MISSING]: 'トークンが必要です',
    [ErrorCode.AUTH_SESSION_LIMIT]: 'セッション数の上限に達しました',
    [ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: '権限が不足しています',

    // Active Directory関連エラー (2000-2999)
    [ErrorCode.AD_CONNECTION_ERROR]: 'Active Directoryへの接続に失敗しました',
    [ErrorCode.AD_USER_NOT_FOUND]: 'ユーザーが見つかりません',
    [ErrorCode.AD_GROUP_NOT_FOUND]: 'グループが見つかりません',
    [ErrorCode.AD_OPERATION_FAILED]: 'Active Directory操作に失敗しました',

    // M365関連エラー (3000-3999)
    [ErrorCode.M365_API_ERROR]: 'Microsoft 365 APIエラーが発生しました',
    [ErrorCode.M365_LICENSE_NOT_AVAILABLE]: 'ライセンスが利用できません',
    [ErrorCode.M365_USER_NOT_FOUND]: 'M365ユーザーが見つかりません',
    [ErrorCode.M365_OPERATION_FAILED]: 'M365操作に失敗しました',

    // データベース関連エラー (4000-4999)
    [ErrorCode.DB_CONNECTION_ERROR]: 'データベース接続エラーが発生しました',
    [ErrorCode.DB_QUERY_FAILED]: 'クエリの実行に失敗しました',
    [ErrorCode.DB_RECORD_NOT_FOUND]: 'レコードが見つかりません',
    [ErrorCode.DB_DUPLICATE_ENTRY]: '重複するエントリが存在します',

    // バリデーションエラー (5000-5999)
    [ErrorCode.VALIDATION_FAILED]: '入力値の検証に失敗しました',
    [ErrorCode.INVALID_PARAMETER]: 'パラメータが無効です',
    [ErrorCode.MISSING_REQUIRED_FIELD]: '必須フィールドが不足しています',
    [ErrorCode.INVALID_FORMAT]: 'フォーマットが無効です',

    // システム監視エラー (6000-6999)
    [ErrorCode.MONITORING_SERVICE_ERROR]: '監視サービスでエラーが発生しました',
    [ErrorCode.METRICS_COLLECTION_ERROR]: 'メトリクス収集に失敗しました',
    [ErrorCode.ALERT_PROCESSING_ERROR]: 'アラート処理に失敗しました',
    [ErrorCode.LOG_PROCESSING_ERROR]: 'ログ処理に失敗しました',

    // 外部サービス連携エラー (7000-7999)
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: '外部サービスでエラーが発生しました',
    [ErrorCode.API_RATE_LIMIT_EXCEEDED]: 'APIレート制限を超えました',
    [ErrorCode.NETWORK_ERROR]: 'ネットワークエラーが発生しました',
    [ErrorCode.TIMEOUT_ERROR]: 'タイムアウトが発生しました',

    // その他のシステムエラー (9000-9999)
    [ErrorCode.INTERNAL_SERVER_ERROR]: '内部サーバーエラーが発生しました',
    [ErrorCode.UNEXPECTED_ERROR]: '予期しないエラーが発生しました'
  };

  return new ApplicationError(
    code,
    message || defaultMessages[code] || 'エラーが発生しました',
    statusCode,
    details
  );
};