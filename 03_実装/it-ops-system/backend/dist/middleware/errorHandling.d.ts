import { Request, Response, NextFunction } from 'express';
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const errorLogger: (err: Error, req: Request, res: Response, next: NextFunction) => void;
export declare const errorHandler: (err: Error, req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandling.d.ts.map