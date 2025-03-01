import express from 'express';
import { AuthUser } from '../types/system';
declare const router: import("express-serve-static-core").Router;
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
export declare const verifyToken: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
export default router;
//# sourceMappingURL=auth.d.ts.map