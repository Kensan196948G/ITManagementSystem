"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePassword = exports.securityConfig = exports.passwordPolicy = void 0;
exports.passwordPolicy = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // 90日
    preventReuse: 5 // 過去5つのパスワードを再利用禁止
};
exports.securityConfig = {
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15分
        max: 100, // 100リクエスト
        message: 'Too many requests from this IP, please try again later.'
    },
    session: {
        expiresIn: '24h',
        maxConcurrentSessions: 3 // 最大3つの同時セッション
    }
};
const validatePassword = (password) => {
    if (password.length < exports.passwordPolicy.minLength)
        return false;
    if (exports.passwordPolicy.requireUppercase && !/[A-Z]/.test(password))
        return false;
    if (exports.passwordPolicy.requireLowercase && !/[a-z]/.test(password))
        return false;
    if (exports.passwordPolicy.requireNumbers && !/[0-9]/.test(password))
        return false;
    if (exports.passwordPolicy.requireSpecialChars && !/[!@#$%^&*]/.test(password))
        return false;
    return true;
};
exports.validatePassword = validatePassword;
//# sourceMappingURL=security.js.map