import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
/**
 * 入力検証ミドルウェア
 * APIエンドポイントでの入力検証を一元管理
 */
export declare class InputValidation {
    /**
     * リクエストボディの検証
     * @param schema Joiスキーマ
     */
    static validateBody(schema: Joi.Schema): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    /**
     * リクエストパラメータの検証
     * @param schema Joiスキーマ
     */
    static validateParams(schema: Joi.Schema): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    /**
     * リクエストクエリの検証
     * @param schema Joiスキーマ
     */
    static validateQuery(schema: Joi.Schema): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    /**
     * リクエスト全体の検証（ボディ、パラメータ、クエリ）
     * @param schemas 各部分のJoiスキーマ
     */
    static validateRequest(schemas: {
        body?: Joi.Schema;
        params?: Joi.Schema;
        query?: Joi.Schema;
    }): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    /**
     * 共通の検証スキーマ
     */
    static schemas: {
        email: Joi.StringSchema<string>;
        id: Joi.StringSchema<string>;
        pagination: Joi.ObjectSchema<any>;
        dateRange: Joi.ObjectSchema<any>;
        graphPermission: Joi.ObjectSchema<any>;
    };
}
export default InputValidation;
//# sourceMappingURL=inputValidation.d.ts.map