import { Request, Response, NextFunction } from 'express';
import { AuthorizationLevel } from '../types/authorization';
/**
 * 特定の権限レベルを要求するミドルウェア
 * @param level 必要な権限レベル
 */
export declare const requireAuthLevel: (level: AuthorizationLevel) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 特定のリソースへのアクセス権を確認するミドルウェア
 * @param resource リソース名
 * @param action アクション（read, write, adminなど）
 */
export declare const requirePermission: (resource: string, action: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * グローバル管理者専用の機能へのアクセスを制限するミドルウェア
 */
export declare const requireGlobalAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * ユーザーのMicrosoft権限情報をリクエストに追加するミドルウェア
 * パフォーマンスを考慮して、必要な場合にのみ使用してください
 */
export declare const attachMicrosoftPermissions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=authorization.d.ts.map