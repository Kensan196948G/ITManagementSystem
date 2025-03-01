import { TokenBlacklist } from '../types/system';
import { TokenVerificationResult } from '../types/auth';
export declare class TokenManager {
    private static db;
    private static logger;
    private static readonly ROTATION_CONFIG;
    static initialize(): Promise<void>;
    static blacklistToken(tokenData: TokenBlacklist): Promise<void>;
    static isTokenBlacklisted(token: string): Promise<boolean>;
    static getUserActiveSessions(userId: string): Promise<number>;
    static addUserSession(userId: string): Promise<void>;
    static removeUserSession(userId: string): Promise<void>;
    static createToken(userId: string, clientInfo: {
        ip: string;
        userAgent: string;
    }): Promise<string>;
    static invalidateAllUserSessions(userId: string): Promise<void>;
    static verifyToken(token: string): Promise<TokenVerificationResult>;
}
//# sourceMappingURL=tokenManager.d.ts.map