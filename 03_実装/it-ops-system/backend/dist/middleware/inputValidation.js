"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputValidation = void 0;
const joi_1 = __importDefault(require("joi"));
const loggingService_1 = __importDefault(require("../services/loggingService"));
const logger = loggingService_1.default.getInstance();
/**
 * 入力検証ミドルウェア
 * APIエンドポイントでの入力検証を一元管理
 */
class InputValidation {
    /**
     * リクエストボディの検証
     * @param schema Joiスキーマ
     */
    static validateBody(schema) {
        return (req, res, next) => {
            const { error, value } = schema.validate(req.body, {
                abortEarly: false,
                stripUnknown: true,
                allowUnknown: false
            });
            if (error) {
                const errorDetails = error.details.map(detail => ({
                    message: detail.message,
                    path: detail.path,
                    type: detail.type
                }));
                logger.logError(error, {
                    context: 'InputValidation',
                    message: '入力検証エラー',
                    path: req.path,
                    method: req.method,
                    body: req.body,
                    errors: errorDetails
                });
                return res.status(400).json({
                    status: 'error',
                    message: '入力データが無効です',
                    errors: errorDetails,
                    code: 'VALIDATION_ERROR'
                });
            }
            // 検証済みの値をリクエストに設定
            req.body = value;
            next();
        };
    }
    /**
     * リクエストパラメータの検証
     * @param schema Joiスキーマ
     */
    static validateParams(schema) {
        return (req, res, next) => {
            const { error, value } = schema.validate(req.params, {
                abortEarly: false,
                stripUnknown: true,
                allowUnknown: false
            });
            if (error) {
                const errorDetails = error.details.map(detail => ({
                    message: detail.message,
                    path: detail.path,
                    type: detail.type
                }));
                logger.logError(error, {
                    context: 'InputValidation',
                    message: 'パラメータ検証エラー',
                    path: req.path,
                    method: req.method,
                    params: req.params,
                    errors: errorDetails
                });
                return res.status(400).json({
                    status: 'error',
                    message: 'URLパラメータが無効です',
                    errors: errorDetails,
                    code: 'VALIDATION_ERROR'
                });
            }
            // 検証済みの値をリクエストに設定
            req.params = value;
            next();
        };
    }
    /**
     * リクエストクエリの検証
     * @param schema Joiスキーマ
     */
    static validateQuery(schema) {
        return (req, res, next) => {
            const { error, value } = schema.validate(req.query, {
                abortEarly: false,
                stripUnknown: true,
                allowUnknown: false
            });
            if (error) {
                const errorDetails = error.details.map(detail => ({
                    message: detail.message,
                    path: detail.path,
                    type: detail.type
                }));
                logger.logError(error, {
                    context: 'InputValidation',
                    message: 'クエリ検証エラー',
                    path: req.path,
                    method: req.method,
                    query: req.query,
                    errors: errorDetails
                });
                return res.status(400).json({
                    status: 'error',
                    message: 'クエリパラメータが無効です',
                    errors: errorDetails,
                    code: 'VALIDATION_ERROR'
                });
            }
            // 検証済みの値をリクエストに設定
            req.query = value;
            next();
        };
    }
    /**
     * リクエスト全体の検証（ボディ、パラメータ、クエリ）
     * @param schemas 各部分のJoiスキーマ
     */
    static validateRequest(schemas) {
        return (req, res, next) => {
            // ボディの検証
            if (schemas.body) {
                const { error: bodyError, value: bodyValue } = schemas.body.validate(req.body, {
                    abortEarly: false,
                    stripUnknown: true,
                    allowUnknown: false
                });
                if (bodyError) {
                    const errorDetails = bodyError.details.map(detail => ({
                        message: detail.message,
                        path: detail.path,
                        type: detail.type,
                        location: 'body'
                    }));
                    logger.logError(bodyError, {
                        context: 'InputValidation',
                        message: '入力検証エラー',
                        path: req.path,
                        method: req.method,
                        body: req.body,
                        errors: errorDetails
                    });
                    return res.status(400).json({
                        status: 'error',
                        message: '入力データが無効です',
                        errors: errorDetails,
                        code: 'VALIDATION_ERROR'
                    });
                }
                req.body = bodyValue;
            }
            // パラメータの検証
            if (schemas.params) {
                const { error: paramsError, value: paramsValue } = schemas.params.validate(req.params, {
                    abortEarly: false,
                    stripUnknown: true,
                    allowUnknown: false
                });
                if (paramsError) {
                    const errorDetails = paramsError.details.map(detail => ({
                        message: detail.message,
                        path: detail.path,
                        type: detail.type,
                        location: 'params'
                    }));
                    logger.logError(paramsError, {
                        context: 'InputValidation',
                        message: 'パラメータ検証エラー',
                        path: req.path,
                        method: req.method,
                        params: req.params,
                        errors: errorDetails
                    });
                    return res.status(400).json({
                        status: 'error',
                        message: 'URLパラメータが無効です',
                        errors: errorDetails,
                        code: 'VALIDATION_ERROR'
                    });
                }
                req.params = paramsValue;
            }
            // クエリの検証
            if (schemas.query) {
                const { error: queryError, value: queryValue } = schemas.query.validate(req.query, {
                    abortEarly: false,
                    stripUnknown: true,
                    allowUnknown: false
                });
                if (queryError) {
                    const errorDetails = queryError.details.map(detail => ({
                        message: detail.message,
                        path: detail.path,
                        type: detail.type,
                        location: 'query'
                    }));
                    logger.logError(queryError, {
                        context: 'InputValidation',
                        message: 'クエリ検証エラー',
                        path: req.path,
                        method: req.method,
                        query: req.query,
                        errors: errorDetails
                    });
                    return res.status(400).json({
                        status: 'error',
                        message: 'クエリパラメータが無効です',
                        errors: errorDetails,
                        code: 'VALIDATION_ERROR'
                    });
                }
                req.query = queryValue;
            }
            next();
        };
    }
}
exports.InputValidation = InputValidation;
/**
 * 共通の検証スキーマ
 */
InputValidation.schemas = {
    // メールアドレス検証
    email: joi_1.default.string().email().required().messages({
        'string.email': 'メールアドレスの形式が正しくありません',
        'string.empty': 'メールアドレスは必須です',
        'any.required': 'メールアドレスは必須です'
    }),
    // ID検証
    id: joi_1.default.string().required().messages({
        'string.empty': 'IDは必須です',
        'any.required': 'IDは必須です'
    }),
    // ページネーション検証
    pagination: joi_1.default.object({
        limit: joi_1.default.number().integer().min(1).max(100).default(20).messages({
            'number.base': 'limitは数値である必要があります',
            'number.integer': 'limitは整数である必要があります',
            'number.min': 'limitは1以上である必要があります',
            'number.max': 'limitは100以下である必要があります'
        }),
        offset: joi_1.default.number().integer().min(0).default(0).messages({
            'number.base': 'offsetは数値である必要があります',
            'number.integer': 'offsetは整数である必要があります',
            'number.min': 'offsetは0以上である必要があります'
        })
    }),
    // 日付範囲検証
    dateRange: joi_1.default.object({
        startDate: joi_1.default.date().iso().messages({
            'date.base': '開始日は有効な日付である必要があります',
            'date.format': '開始日はISO形式である必要があります'
        }),
        endDate: joi_1.default.date().iso().min(joi_1.default.ref('startDate')).messages({
            'date.base': '終了日は有効な日付である必要があります',
            'date.format': '終了日はISO形式である必要があります',
            'date.min': '終了日は開始日以降である必要があります'
        })
    }),
    // Graph APIパーミッション検証
    graphPermission: joi_1.default.object({
        permission: joi_1.default.string().required().messages({
            'string.empty': 'パーミッションは必須です',
            'any.required': 'パーミッションは必須です'
        }),
        scope: joi_1.default.string().valid('Delegated', 'Application').required().messages({
            'string.empty': 'スコープは必須です',
            'any.required': 'スコープは必須です',
            'any.only': 'スコープは "Delegated" または "Application" である必要があります'
        })
    })
};
exports.default = InputValidation;
//# sourceMappingURL=inputValidation.js.map