import { AuthUser } from './custom';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}