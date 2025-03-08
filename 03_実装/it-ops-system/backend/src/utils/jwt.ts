import jwt from 'jsonwebtoken';
import { config } from '../config';

/**
 * JWTトークンを生成
 * @param payload トークンに含めるペイロード
 * @param expiresIn 有効期限（デフォルト: 1日）
 */
export const generateJwt = (
  payload: Record<string, any>,
  expiresIn: string = '1d'
): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn
  });
};

/**
 * JWTトークンを検証
 * @param token 検証するトークン
 */
export const verifyJwt = (token: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded as Record<string, any>);
      }
    });
  });
};

/**
 * JWTトークンからペイロードを取得（検証なし）
 * @param token トークン
 */
export const decodeJwt = (token: string): Record<string, any> | null => {
  try {
    const decoded = jwt.decode(token);
    return decoded as Record<string, any>;
  } catch (error) {
    return null;
  }
};

/**
 * JWTトークンの有効期限を確認
 * @param token トークン
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeJwt(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * JWTトークンの有効期限までの残り時間（秒）を取得
 * @param token トークン
 */
export const getTokenRemainingTime = (token: string): number => {
  try {
    const decoded = decodeJwt(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = decoded.exp - currentTime;
    
    return remainingTime > 0 ? remainingTime : 0;
  } catch (error) {
    return 0;
  }
};

/**
 * JWTトークンを更新
 * @param token 更新するトークン
 * @param expiresIn 新しい有効期限（デフォルト: 1日）
 */
export const refreshJwt = async (
  token: string,
  expiresIn: string = '1d'
): Promise<string> => {
  try {
    const payload = await verifyJwt(token);
    // 有効期限とiat（発行時刻）を削除
    delete payload.exp;
    delete payload.iat;
    
    // 新しいトークンを生成
    return generateJwt(payload, expiresIn);
  } catch (error) {
    throw new Error('Invalid token for refresh');
  }
};