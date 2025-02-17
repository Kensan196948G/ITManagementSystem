"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestUser = exports.createTestToken = exports.mockResponse = exports.mockRequest = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// テスト環境のセットアップ
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-secret';
// グローバルなモック設定
jest.setTimeout(10000);
// テストヘルパー関数
const mockRequest = (options = {}) => {
    const req = {
        body: {},
        query: {},
        params: {},
        headers: {},
        ...options
    };
    return req;
};
exports.mockRequest = mockRequest;
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    return res;
};
exports.mockResponse = mockResponse;
const createTestToken = (payload = {}) => {
    const defaultPayload = {
        id: 'test-user-id',
        username: 'testuser',
        roles: ['user'],
        ...payload
    };
    return jsonwebtoken_1.default.sign(defaultPayload, process.env.JWT_SECRET || 'test-secret');
};
exports.createTestToken = createTestToken;
const createTestUser = () => ({
    id: 'test-user-id',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    groups: ['users']
});
exports.createTestUser = createTestUser;
//# sourceMappingURL=setup.js.map