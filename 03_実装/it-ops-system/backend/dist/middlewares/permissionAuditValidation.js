"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEmail = exports.validateReview = exports.validateAuditFilter = void 0;
const zod_1 = require("zod");
const loggingService_1 = __importDefault(require("../services/loggingService"));
const logger = loggingService_1.default.getInstance();
// バリデーションスキーマの定義
const auditRecordFilterSchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    actorEmail: zod_1.z.string().email().optional(),
    targetEmail: zod_1.z.string().email().optional(),
    action: zod_1.z.enum(['add', 'remove', 'modify']).optional(),
    resourceType: zod_1.z.string().min(1).optional(),
});
const reviewSchema = zod_1.z.object({
    approved: zod_1.z.boolean(),
    comments: zod_1.z.string().min(1).max(1000)
});
const validateAuditFilter = async (req, res, next) => {
    try {
        const validatedData = auditRecordFilterSchema.parse(req.body);
        req.body = validatedData;
        next();
    }
    catch (error) {
        logger.logError(error, {
            context: 'AuditValidation',
            message: 'Invalid audit filter parameters',
            data: req.body
        });
        res.status(400).json({
            error: '無効なフィルターパラメータです',
            details: error.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message
            }))
        });
    }
};
exports.validateAuditFilter = validateAuditFilter;
const validateReview = async (req, res, next) => {
    try {
        const validatedData = reviewSchema.parse(req.body);
        req.body = validatedData;
        next();
    }
    catch (error) {
        logger.logError(error, {
            context: 'AuditValidation',
            message: 'Invalid review data',
            data: req.body
        });
        res.status(400).json({
            error: '無効なレビューデータです',
            details: error.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message
            }))
        });
    }
};
exports.validateReview = validateReview;
const validateEmail = async (req, res, next) => {
    try {
        const email = zod_1.z.string().email().parse(req.params.email);
        req.params.email = email;
        next();
    }
    catch (error) {
        logger.logError(error, {
            context: 'AuditValidation',
            message: 'Invalid email parameter',
            email: req.params.email
        });
        res.status(400).json({
            error: '無効なメールアドレスです'
        });
    }
};
exports.validateEmail = validateEmail;
//# sourceMappingURL=permissionAuditValidation.js.map