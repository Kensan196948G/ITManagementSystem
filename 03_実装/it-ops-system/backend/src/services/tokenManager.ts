import { TokenBlacklist } from '../types/system';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { TokenRotationConfig } from '../types/auth';

interface TokenMetadata {
  userId: string;
  issuedAt: number;
  rotationCount: number;
  lastRotation: number;
  clientInfo: {
    ip: string;
    userAgent: string;
  };
}

// Redisクライアントの初期化
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

export class TokenManager {
  private static redis: Redis;
  private static readonly TOKEN_PREFIX = 'token:blacklist:';
  private static readonly USER_SESSION_PREFIX = 'user:sessions:';
  private static readonly PREFIX = 'token:';
  private static readonly ROTATION_CONFIG: TokenRotationConfig = {
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    rotationWindow: 60 * 60 * 1000, // 1時間
    maxRotations: 24 // 最大24回のローテーション
  };

  static async initialize() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
  }

  // トークンをブラックリストに追加
  static async blacklistToken(tokenData: TokenBlacklist): Promise<void> {
    const key = `${this.TOKEN_PREFIX}${tokenData.token}`;
    await redis.setex(
      key,
      Math.ceil((tokenData.expiresAt.getTime() - Date.now()) / 1000),
      JSON.stringify(tokenData)
    );
  }

  // トークンがブラックリストにあるか確認
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `${this.TOKEN_PREFIX}${token}`;
    return await redis.exists(key) === 1;
  }

  // ユーザーのアクティブセッション数を取得
  static async getUserActiveSessions(userId: string): Promise<number> {
    const key = `${this.USER_SESSION_PREFIX}${userId}`;
    const count = await redis.get(key);
    return count ? parseInt(count) : 0;
  }

  // ユーザーのセッションを追加
  static async addUserSession(userId: string): Promise<void> {
    const key = `${this.USER_SESSION_PREFIX}${userId}`;
    await redis.incr(key);
  }

  // ユーザーのセッションを削除
  static async removeUserSession(userId: string): Promise<void> {
    const key = `${this.USER_SESSION_PREFIX}${userId}`;
    await redis.decr(key);
  }

  // 指定されたユーザーの全セッションを無効化
  static async invalidateAllUserSessions(userId: string): Promise<void> {
    const key = `${this.USER_SESSION_PREFIX}${userId}`;
    await redis.del(key);
  }

  static async createToken(userId: string, clientInfo: { ip: string; userAgent: string }): Promise<string> {
    const token = uuidv4();
    const metadata: TokenMetadata = {
      userId,
      issuedAt: Date.now(),
      rotationCount: 0,
      lastRotation: Date.now(),
      clientInfo
    };

    await this.redis.set(
      `${this.PREFIX}${token}`,
      JSON.stringify(metadata),
      'EX',
      this.ROTATION_CONFIG.maxAge / 1000
    );

    await this.trackTokenUsage(token, metadata);
    return token;
  }

  static async rotateToken(oldToken: string): Promise<string | null> {
    const metadata = await this.getTokenMetadata(oldToken);
    if (!metadata) return null;

    if (!this.canRotateToken(metadata)) {
      return null;
    }

    const newToken = uuidv4();
    const updatedMetadata: TokenMetadata = {
      ...metadata,
      rotationCount: metadata.rotationCount + 1,
      lastRotation: Date.now()
    };

    // トランザクションでトークンの更新を行う
    const multi = this.redis.multi();
    multi.set(
      `${this.PREFIX}${newToken}`,
      JSON.stringify(updatedMetadata),
      'EX',
      this.ROTATION_CONFIG.maxAge / 1000
    );
    multi.del(`${this.PREFIX}${oldToken}`);

    await multi.exec();
    await this.trackTokenRotation(oldToken, newToken, updatedMetadata);
    return newToken;
  }

  private static async trackTokenUsage(token: string, metadata: TokenMetadata) {
    const now = new Date().toISOString();
    await this.redis.xadd(
      'token:audit:usage',
      '*',
      'token', token,
      'userId', metadata.userId,
      'ip', metadata.clientInfo.ip,
      'userAgent', metadata.clientInfo.userAgent,
      'timestamp', now,
      'action', 'created'
    );
  }

  private static async trackTokenRotation(oldToken: string, newToken: string, metadata: TokenMetadata) {
    const now = new Date().toISOString();
    await this.redis.xadd(
      'token:audit:rotations',
      '*',
      'oldToken', oldToken,
      'newToken', newToken,
      'userId', metadata.userId,
      'rotationCount', metadata.rotationCount.toString(),
      'timestamp', now
    );
  }

  private static canRotateToken(metadata: TokenMetadata): boolean {
    const now = Date.now();
    const age = now - metadata.issuedAt;
    const timeSinceLastRotation = now - metadata.lastRotation;

    return (
      age < this.ROTATION_CONFIG.maxAge &&
      timeSinceLastRotation >= this.ROTATION_CONFIG.rotationWindow &&
      metadata.rotationCount < this.ROTATION_CONFIG.maxRotations
    );
  }

  static async getTokenMetadata(token: string): Promise<TokenMetadata | null> {
    const data = await this.redis.get(`${this.PREFIX}${token}`);
    return data ? JSON.parse(data) : null;
  }

  static async invalidateToken(token: string): Promise<void> {
    await this.redis.del(`${this.PREFIX}${token}`);
  }

  static async isTokenValid(token: string): Promise<boolean> {
    return !!(await this.getTokenMetadata(token));
  }
}