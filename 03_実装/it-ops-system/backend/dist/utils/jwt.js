"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshJwt = exports.getTokenRemainingTime = exports.isTokenExpired = exports.decodeJwt = exports.verifyJwt = exports.generateJwt = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
// configモジュールをインポート
// @ts-ignore - configモジュールの型定義が見つからない場合の対処
const config_1 = require("../config");
/**
 * JWTトークンを生成
 * @param payload トークンに含めるペイロード
 * @param expiresIn 有効期限（デフォルト: 1日）
 */
const generateJwt = (payload, expiresIn = '1d') => {
    // SignOptionsを定義
    const signOptions = {
        algorithm: 'HS256',
        issuer: 'it-ops-system',
        audience: 'localhost',
        subject: payload.email || payload.userId || 'user',
        jwtid: crypto_1.default.randomUUID?.() || Date.now().toString()
    };
    // expiresInが文字列または数値の場合は設定
    if (expiresIn) {
        signOptions.expiresIn = expiresIn;
    }
    return jsonwebtoken_1.default.sign(payload, config_1.config.jwt.secret, signOptions);
};
exports.generateJwt = generateJwt;
/**
 * JWTトークンを検証
 * @param token 検証するトークン
 */
const verifyJwt = (token) => {
    return new Promise((resolve, reject) => {
        jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret, (err, decoded) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(decoded);
            }
        });
    });
};
exports.verifyJwt = verifyJwt;
/**
 * JWTトークンからペイロードを取得（検証なし）
 * @param token トークン
 */
const decodeJwt = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        return decoded;
    }
    catch (error) {
        return null;
    }
};
exports.decodeJwt = decodeJwt;
/**
 * JWTトークンの有効期限を確認
 * @param token トークン
 */
const isTokenExpired = (token) => {
    try {
        const decoded = (0, exports.decodeJwt)(token);
        if (!decoded || !decoded.exp) {
            return true;
        }
        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
    }
    catch (error) {
        return true;
    }
};
exports.isTokenExpired = isTokenExpired;
/**
 * JWTトークンの有効期限までの残り時間（秒）を取得
 * @param token トークン
 */
const getTokenRemainingTime = (token) => {
    try {
        const decoded = (0, exports.decodeJwt)(token);
        if (!decoded || !decoded.exp) {
            return 0;
        }
        const currentTime = Math.floor(Date.now() / 1000);
        const remainingTime = decoded.exp - currentTime;
        return remainingTime > 0 ? remainingTime : 0;
    }
    catch (error) {
        return 0;
    }
};
exports.getTokenRemainingTime = getTokenRemainingTime;
/**
 * JWTトークンを更新
 * @param token 更新するトークン
 * @param expiresIn 新しい有効期限（デフォルト: 1日）
 */
const refreshJwt = async (token, expiresIn = '1d') => {
    try {
        const payload = await (0, exports.verifyJwt)(token);
        // 有効期限とiat（発行時刻）を削除
        delete payload.exp;
        delete payload.iat;
        // 新しいトークンを生成
        return (0, exports.generateJwt)(payload, expiresIn);
    }
    catch (error) {
        throw new Error('Invalid token for refresh');
    }
};
exports.refreshJwt = refreshJwt;
//# sourceMappingURL=jwt.js.map