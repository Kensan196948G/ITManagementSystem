import { Request, Response, NextFunction } from 'express';
/**
 * 二重権限チェックミドルウェア
 * フロントエンドとバックエンドの両方で権限チェックを行う
 */
export declare class DoubleAuthorization {
    /**
     * グローバル管理者権限を要求
     * フロントエンドでのチェックに加えて、バックエンドでも再検証
     */
    static requireGlobalAdmin(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
    /**
     * リソースに対する特定の権限を要求
     * @param resource リソース名
     * @param action アクション名
     */
    static requirePermission(resource: string, action: string): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * 自分自身のリソースへのアクセスか、グローバル管理者であることを要求
     * @param userIdParam リクエストパラメータ内のユーザーID名
     */
    static requireSelfOrAdmin(userIdParam?: string): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
    /**
     * クライアントIPアドレスの制限
     * @param allowedIps 許可されたIPアドレスの配列
     */
    static restrictIpAccess(allowedIps: string[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    /**
     * リクエスト元の検証（Referer, Origin）
     * @param allowedOrigins 許可されたオリジンの配列
     */
    static validateOrigin(allowedOrigins: string[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
}
export default DoubleAuthorization;
//# sourceMappingURL=doubleAuthorization.d.ts.map