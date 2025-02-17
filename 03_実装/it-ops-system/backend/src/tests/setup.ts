import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types/custom';

// テスト環境のセットアップ
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-secret';

// グローバルなモック設定
jest.setTimeout(10000);

// テストヘルパー関数
export const mockRequest = (options: Partial<Request> = {}) => {
  const req = {
    body: {},
    query: {},
    params: {},
    headers: {},
    ...options
  } as Request;
  return req;
};

export const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

export const createTestToken = (payload: Partial<UserPayload> = {}) => {
  const defaultPayload = {
    id: 'test-user-id',
    username: 'testuser',
    roles: ['user'],
    ...payload
  };
  return jwt.sign(defaultPayload, process.env.JWT_SECRET || 'test-secret');
};

export const createTestUser = () => ({
  id: 'test-user-id',
  username: 'testuser',
  displayName: 'Test User',
  email: 'test@example.com',
  groups: ['users']
});