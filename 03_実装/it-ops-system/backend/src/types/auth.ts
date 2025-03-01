import { Request } from 'express';
import { AuthUser } from './system';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface TokenRotationConfig {
  maxAge: number;
  rotationWindow: number;
  maxRotations: number;
}

export interface TokenData {
  userId: string;
  issuedAt: number;
  expiresAt: number;
  metadata?: any;
}

export interface TokenVerificationResult {
  valid: boolean;
  userId?: string;
  error?: string;
}

export interface TokenBlacklist {
  token: string;
  expiresAt: Date;
  userId: string;
  reason: 'logout' | 'password_change' | 'security_breach';
}