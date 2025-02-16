import express from 'express';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ActiveDirectory from 'activedirectory2';
import { config } from 'dotenv';

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
    ad.authenticate(username, password, async (err, auth) => {
      if (err) {
        console.error('AD Authentication error:', err);
        return res.status(401).json({
          status: 'error',
          message: 'Authentication failed'
        });
      }

      if (!auth) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials'
        });
      }

      // ユーザー情報の取得
      ad.findUser(username, (err, user) => {
        if (err) {
          console.error('Error finding user:', err);
          return res.status(500).json({
            status: 'error',
            message: 'Error retrieving user information'
          });
        }

        if (!user) {
          return res.status(404).json({
            status: 'error',
            message: 'User not found'
          });
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
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// トークン検証ミドルウェア
export const verifyToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
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