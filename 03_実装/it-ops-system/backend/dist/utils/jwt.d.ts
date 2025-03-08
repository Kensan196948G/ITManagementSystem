import { JwtPayload } from 'jsonwebtoken';
/**
 * JWTトークンを生成
 * @param payload トークンに含めるペイロード
 * @param expiresIn 有効期限（デフォルト: 1日）
 */
export declare const generateJwt: (payload: Record<string, any>, expiresIn?: string | number) => string;
/**
 * JWTトークンを検証
 * @param token 検証するトークン
 */
export declare const verifyJwt: (token: string) => Promise<JwtPayload | Record<string, any>>;
/**
 * JWTトークンからペイロードを取得（検証なし）
 * @param token トークン
 */
export declare const decodeJwt: (token: string) => Record<string, any> | null;
/**
 * JWTトークンの有効期限を確認
 * @param token トークン
 */
export declare const isTokenExpired: (token: string) => boolean;
/**
 * JWTトークンの有効期限までの残り時間（秒）を取得
 * @param token トークン
 */
export declare const getTokenRemainingTime: (token: string) => number;
/**
 * JWTトークンを更新
 * @param token 更新するトークン
 * @param expiresIn 新しい有効期限（デフォルト: 1日）
 */
export declare const refreshJwt: (token: string, expiresIn?: string) => Promise<string>;
//# sourceMappingURL=jwt.d.ts.map