import { Request, Response } from 'express';
import { UserPayload } from '../types/custom';
export declare const mockRequest: (options?: Partial<Request>) => Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const mockResponse: () => Response<any, Record<string, any>>;
export declare const createTestToken: (payload?: Partial<UserPayload>) => string;
export declare const createTestUser: () => {
    id: string;
    username: string;
    displayName: string;
    email: string;
    groups: string[];
};
//# sourceMappingURL=setup.d.ts.map