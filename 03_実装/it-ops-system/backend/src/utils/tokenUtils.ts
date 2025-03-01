import jwt from 'jsonwebtoken';
import { TokenVerificationResult } from '../types/auth';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

export function validateToken(token: string): TokenVerificationResult {
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as { userId: string };
    return {
      valid: true,
      userId: decoded.userId
    };
  } catch (error) {
    return {
      valid: false,
      error: (error as Error).message
    };
  }
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, SECRET_KEY, {
    expiresIn: '24h'
  });
}