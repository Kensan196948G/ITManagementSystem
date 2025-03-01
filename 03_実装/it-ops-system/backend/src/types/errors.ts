export const ErrorCode = {
  // 認証関連エラー (1000-1999)
  AUTH_INVALID_CREDENTIALS: 1001,
  AUTH_TOKEN_EXPIRED: 1002,
  AUTH_TOKEN_INVALID: 1003,
  AUTH_TOKEN_MISSING: 1004,
  AUTH_SESSION_LIMIT: 1005,
  AUTH_INSUFFICIENT_PERMISSIONS: 1006,

  // Active Directory関連エラー (2000-2999)
  AD_CONNECTION_ERROR: 2001,
  AD_USER_NOT_FOUND: 2002,
  AD_GROUP_NOT_FOUND: 2003,
  AD_OPERATION_FAILED: 2004,

  // M365関連エラー (3000-3999)
  M365_API_ERROR: 3001,
  M365_LICENSE_NOT_AVAILABLE: 3002,
  M365_USER_NOT_FOUND: 3003,
  M365_OPERATION_FAILED: 3004,

  // データベース関連エラー (4000-4999)
  DB_CONNECTION_ERROR: 4001,
  DB_QUERY_FAILED: 4002,
  DB_RECORD_NOT_FOUND: 4003,
  DB_DUPLICATE_ENTRY: 4004,

  // バリデーションエラー (5000-5999)
  VALIDATION_FAILED: 5001,
  INVALID_PARAMETER: 5002,
  MISSING_REQUIRED_FIELD: 5003,
  INVALID_FORMAT: 5004,

  // システム監視エラー (6000-6999)
  MONITORING_SERVICE_ERROR: 6001,
  METRICS_COLLECTION_ERROR: 6002,
  ALERT_PROCESSING_ERROR: 6003,
  LOG_PROCESSING_ERROR: 6004,

  // 外部サービス連携エラー (7000-7999)
  EXTERNAL_SERVICE_ERROR: 7001,
  API_RATE_LIMIT_EXCEEDED: 7002,
  NETWORK_ERROR: 7003,
  TIMEOUT_ERROR: 7004,

  // その他のシステムエラー (9000-9999)
  INTERNAL_SERVER_ERROR: 9001,
  UNEXPECTED_ERROR: 9999
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

export interface AppError extends Error {
  code: ErrorCodeType;
  statusCode: number;
  details?: any;
  source?: string;
  timestamp: Date;
}

export class ApplicationError extends Error implements AppError {
  code: ErrorCodeType;
  statusCode: number;
  details?: any;
  source?: string;
  timestamp: Date;

  constructor(code: ErrorCodeType, message: string, statusCode: number = 500, details?: any) {
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
  code: ErrorCodeType,
  message?: string,
  statusCode?: number,
  details?: any
): ApplicationError => {
  const defaultMessages: Record<ErrorCodeType, string> = {
    [ErrorCode.AUTH_INVALID_CREDENTIALS]: '認証情報が無効です',
    [ErrorCode.AUTH_TOKEN_EXPIRED]: 'トークンの有効期限が切れています',
    [ErrorCode.AUTH_TOKEN_INVALID]: '無効なトークンです',
    [ErrorCode.AUTH_TOKEN_MISSING]: 'トークンが見つかりません',
    [ErrorCode.AUTH_SESSION_LIMIT]: 'セッション数の制限に達しました',
    [ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: '権限が不足しています',
    [ErrorCode.AD_CONNECTION_ERROR]: 'Active Directoryへの接続エラー',
    [ErrorCode.AD_USER_NOT_FOUND]: 'ユーザーが見つかりません',
    [ErrorCode.AD_GROUP_NOT_FOUND]: 'グループが見つかりません',
    [ErrorCode.AD_OPERATION_FAILED]: 'Active Directory操作に失敗しました',
    [ErrorCode.M365_API_ERROR]: 'Microsoft 365 APIエラー',
    [ErrorCode.M365_LICENSE_NOT_AVAILABLE]: 'ライセンスが利用できません',
    [ErrorCode.M365_USER_NOT_FOUND]: 'ユーザーが見つかりません',
    [ErrorCode.M365_OPERATION_FAILED]: 'Microsoft 365操作に失敗しました',
    [ErrorCode.DB_CONNECTION_ERROR]: 'データベース接続エラー',
    [ErrorCode.DB_QUERY_FAILED]: 'クエリ実行エラー',
    [ErrorCode.DB_RECORD_NOT_FOUND]: 'レコードが見つかりません',
    [ErrorCode.DB_DUPLICATE_ENTRY]: '重複するエントリが存在します',
    [ErrorCode.VALIDATION_FAILED]: '入力値の検証に失敗しました',
    [ErrorCode.INVALID_PARAMETER]: '無効なパラメータです',
    [ErrorCode.MISSING_REQUIRED_FIELD]: '必須フィールドが欠けています',
    [ErrorCode.INVALID_FORMAT]: '無効なフォーマットです',
    [ErrorCode.MONITORING_SERVICE_ERROR]: '監視サービスエラー',
    [ErrorCode.METRICS_COLLECTION_ERROR]: 'メトリクス収集エラー',
    [ErrorCode.ALERT_PROCESSING_ERROR]: 'アラート処理エラー',
    [ErrorCode.LOG_PROCESSING_ERROR]: 'ログ処理エラー',
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: '外部サービスエラー',
    [ErrorCode.API_RATE_LIMIT_EXCEEDED]: 'APIレート制限を超過しました',
    [ErrorCode.NETWORK_ERROR]: 'ネットワークエラー',
    [ErrorCode.TIMEOUT_ERROR]: 'タイムアウトエラー',
    [ErrorCode.INTERNAL_SERVER_ERROR]: '内部サーバーエラー',
    [ErrorCode.UNEXPECTED_ERROR]: '予期しないエラーが発生しました'
  };

  return new ApplicationError(
    code,
    message || defaultMessages[code],
    statusCode,
    details
  );
};