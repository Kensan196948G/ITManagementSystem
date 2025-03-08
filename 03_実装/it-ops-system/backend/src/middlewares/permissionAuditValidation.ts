import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import LoggingService from '../services/loggingService';

const logger = LoggingService.getInstance();

// バリデーションスキーマの定義
const auditRecordFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  actorEmail: z.string().email().optional(),
  targetEmail: z.string().email().optional(),
  action: z.enum(['add', 'remove', 'modify']).optional(),
  resourceType: z.string().min(1).optional(),
});

const reviewSchema = z.object({
  approved: z.boolean(),
  comments: z.string().min(1).max(1000)
});

export const validateAuditFilter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = auditRecordFilterSchema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    logger.logError(error as Error, {
      context: 'AuditValidation',
      message: 'Invalid audit filter parameters',
      data: req.body
    });
    res.status(400).json({
      error: '無効なフィルターパラメータです',
      details: (error as z.ZodError).errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }
};

export const validateReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = reviewSchema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    logger.logError(error as Error, {
      context: 'AuditValidation',
      message: 'Invalid review data',
      data: req.body
    });
    res.status(400).json({
      error: '無効なレビューデータです',
      details: (error as z.ZodError).errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }
};

export const validateEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = z.string().email().parse(req.params.email);
    req.params.email = email;
    next();
  } catch (error) {
    logger.logError(error as Error, {
      context: 'AuditValidation',
      message: 'Invalid email parameter',
      email: req.params.email
    });
    res.status(400).json({
      error: '無効なメールアドレスです'
    });
  }
};