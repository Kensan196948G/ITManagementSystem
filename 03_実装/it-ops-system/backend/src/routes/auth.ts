import express from 'express';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ActiveDirectory from 'activedirectory2';
import { config } from 'dotenv';
import { AuthUser } from '../types/system';

// 環境変数の読み込み
config();

const router = express.Router();

// ADの設定
const adConfig = {
  url: process.env.AD_URL,
  baseDN: process.env.AD_BASE_DN,
  username: process.env.AD_USERNAME,
  password: process.env.AD_PASSWORD
};

const ad = new ActiveDirectory(adConfig);

// JWTトークン生成関数
const generateToken = (user: any): string => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      roles: user.roles
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

// カスタムリクエスト型の拡張
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// AD認証とJWTトークン生成
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Username and password are required'
      });
    }

    // AD認証
    return new Promise<void>((resolve) => {
      ad.authenticate(username, password, async (err, auth) => {
        if (err) {
          console.error('AD Authentication error:', err);
          res.status(401).json({
            status: 'error',
            message: 'Authentication failed'
          });
          return resolve();
        }

        if (!auth) {
          res.status(401).json({
            status: 'error',
            message: 'Invalid credentials'
          });
          return resolve();
        }

        // ユーザー情報の取得
        ad.findUser(username, (findErr, user) => {
          if (findErr) {
            console.error('Error finding user:', findErr);
            res.status(500).json({
              status: 'error',
              message: 'Error retrieving user information'
            });
            return resolve();
          }

          if (!user) {
            res.status(404).json({
              status: 'error',
              message: 'User not found'
            });
            return resolve();
          }

          // JWTトークンの生成
          const token = generateToken(user);

          // レスポンス
          res.json({
            status: 'success',
            data: {
              token,
              user: {
                username: user.sAMAccountName,
                displayName: user.displayName,
                email: user.mail,
                groups: user.memberOf
              }
            }
          });
          resolve();
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// トークン検証ミドルウェア
export const verifyToken = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({
      status: 'error',
      message: 'No token provided'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
    return;
  }
};

// ユーザー情報取得
router.get('/me', verifyToken, (req, res) => {
  res.json({
    status: 'success',
    data: {
      user: req.user
    }
  });
});

// ログアウト
router.post('/logout', verifyToken, (req, res) => {
  res.json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

export default router;