"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateToken = validateToken;
exports.generateToken = generateToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';
function validateToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, SECRET_KEY);
        return {
            valid: true,
            userId: decoded.userId
        };
    }
    catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}
function generateToken(userId) {
    return jsonwebtoken_1.default.sign({ userId }, SECRET_KEY, {
        expiresIn: '24h'
    });
}
//# sourceMappingURL=tokenUtils.js.map