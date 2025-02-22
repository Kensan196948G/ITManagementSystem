import { PasswordPolicy, SecurityConfig } from '../types/system';

export const passwordPolicy: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90, // 90日
  preventReuse: 5 // 過去5つのパスワードを再利用禁止
};

export const securityConfig: SecurityConfig = {
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15分
    max: 100, // 100リクエスト
    message: 'Too many requests from this IP, please try again later.'
  },
  session: {
    expiresIn: '24h',
    maxConcurrentSessions: 3 // 最大3つの同時セッション
  }
};

export const validatePassword = (password: string): boolean => {
  if (password.length < passwordPolicy.minLength) return false;
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) return false;
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) return false;
  if (passwordPolicy.requireNumbers && !/[0-9]/.test(password)) return false;
  if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*]/.test(password)) return false;
  return true;
};