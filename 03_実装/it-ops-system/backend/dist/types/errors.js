"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.errorCodes = exports.AuthenticationError = exports.PermissionError = exports.ApplicationError = exports.ErrorCode = void 0;
exports.ErrorCode = {
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
};
class ApplicationError extends Error {
    constructor(code, message, statusCode = 500, details) {
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
exports.ApplicationError = ApplicationError;
class PermissionError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'PermissionError';
    }
}
exports.PermissionError = PermissionError;
class AuthenticationError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
exports.errorCodes = {
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    GRAPH_API_ERROR: 'GRAPH_API_ERROR',
    INVALID_SCOPE: 'INVALID_SCOPE'
};
const createError = (code, message, statusCode, details) => {
    const defaultMessages = {
        [exports.ErrorCode.AUTH_INVALID_CREDENTIALS]: '認証情報が無効です',
        [exports.ErrorCode.AUTH_TOKEN_EXPIRED]: 'トークンの有効期限が切れています',
        [exports.ErrorCode.AUTH_TOKEN_INVALID]: '無効なトークンです',
        [exports.ErrorCode.AUTH_TOKEN_MISSING]: 'トークンが見つかりません',
        [exports.ErrorCode.AUTH_SESSION_LIMIT]: 'セッション数の制限に達しました',
        [exports.ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: '権限が不足しています',
        [exports.ErrorCode.AD_CONNECTION_ERROR]: 'Active Directoryへの接続エラー',
        [exports.ErrorCode.AD_USER_NOT_FOUND]: 'ユーザーが見つかりません',
        [exports.ErrorCode.AD_GROUP_NOT_FOUND]: 'グループが見つかりません',
        [exports.ErrorCode.AD_OPERATION_FAILED]: 'Active Directory操作に失敗しました',
        [exports.ErrorCode.M365_API_ERROR]: 'Microsoft 365 APIエラー',
        [exports.ErrorCode.M365_LICENSE_NOT_AVAILABLE]: 'ライセンスが利用できません',
        [exports.ErrorCode.M365_USER_NOT_FOUND]: 'ユーザーが見つかりません',
        [exports.ErrorCode.M365_OPERATION_FAILED]: 'Microsoft 365操作に失敗しました',
        [exports.ErrorCode.DB_CONNECTION_ERROR]: 'データベース接続エラー',
        [exports.ErrorCode.DB_QUERY_FAILED]: 'クエリ実行エラー',
        [exports.ErrorCode.DB_RECORD_NOT_FOUND]: 'レコードが見つかりません',
        [exports.ErrorCode.DB_DUPLICATE_ENTRY]: '重複するエントリが存在します',
        [exports.ErrorCode.VALIDATION_FAILED]: '入力値の検証に失敗しました',
        [exports.ErrorCode.INVALID_PARAMETER]: '無効なパラメータです',
        [exports.ErrorCode.MISSING_REQUIRED_FIELD]: '必須フィールドが欠けています',
        [exports.ErrorCode.INVALID_FORMAT]: '無効なフォーマットです',
        [exports.ErrorCode.MONITORING_SERVICE_ERROR]: '監視サービスエラー',
        [exports.ErrorCode.METRICS_COLLECTION_ERROR]: 'メトリクス収集エラー',
        [exports.ErrorCode.ALERT_PROCESSING_ERROR]: 'アラート処理エラー',
        [exports.ErrorCode.LOG_PROCESSING_ERROR]: 'ログ処理エラー',
        [exports.ErrorCode.EXTERNAL_SERVICE_ERROR]: '外部サービスエラー',
        [exports.ErrorCode.API_RATE_LIMIT_EXCEEDED]: 'APIレート制限を超過しました',
        [exports.ErrorCode.NETWORK_ERROR]: 'ネットワークエラー',
        [exports.ErrorCode.TIMEOUT_ERROR]: 'タイムアウトエラー',
        [exports.ErrorCode.INTERNAL_SERVER_ERROR]: '内部サーバーエラー',
        [exports.ErrorCode.UNEXPECTED_ERROR]: '予期しないエラーが発生しました'
    };
    return new ApplicationError(code, message || defaultMessages[code], statusCode, details);
};
exports.createError = createError;
//# sourceMappingURL=errors.js.map