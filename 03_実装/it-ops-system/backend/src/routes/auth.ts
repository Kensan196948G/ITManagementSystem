import express from 'express';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ActiveDirectory from 'activedirectory2';
import { config } from 'dotenv';
import { AuthUser } from '../types/system';
import { TokenManager } from '../services/tokenManager';
import { validatePassword, passwordPolicy, securityConfig } from '../config/security';
import { ApplicationError, ErrorCode, createError } from '../types/errors';
import rateLimit from 'express-rate-limit';
import { PermissionService } from '../services/permissionService';
import { AuthService } from '../services/authService';
import LoggingService from '../services/loggingService';

// 環境変数の読み込み
config();

const router = express.Router();
const logger = LoggingService.getInstance();
const permissionService = PermissionService.getInstance();
const authService = AuthService.getInstance();

// ADの設定
const adConfig = {
  url: process.env.AD_URL,
  baseDN: process.env.AD_BASE_DN,
  username: process.env.AD_USERNAME,
  password: process.env.AD_PASSWORD
};

const ad = new ActiveDirectory(adConfig);

// 開発環境用のレート制限設定
const devLoginLimiter = rateLimit({
  windowMs: 60000, // 1分
  max: 10000, // 1分あたり10000リクエストまで（実質制限なし）
  message: {
    status: 'error',
    message: 'Too many login attempts from this IP, please try again after a minute'
  },
  standardHeaders: true, // X-RateLimit-* ヘッダーを返す
  legacyHeaders: false, // X-RateLimit-* ヘッダーを使用しない
  skipSuccessfulRequests: true, // 成功したリクエストはカウントしない
});

// 本番環境用のレート制限設定
const prodLoginLimiter = rateLimit({
  windowMs: securityConfig.rateLimit.windowMs,
  max: securityConfig.rateLimit.max,
  message: {
    status: 'error',
    message: securityConfig.rateLimit.message
  }
});

// 環境に応じたレート制限を適用
const loginLimiter = process.env.NODE_ENV === 'development' ? devLoginLimiter : prodLoginLimiter;

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
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw createError(
        ErrorCode.MISSING_REQUIRED_FIELD,
        'Username and password are required',
        400
      );
    }

    // パスワードポリシーの検証
    if (!validatePassword(password)) {
      throw createError(
        ErrorCode.VALIDATION_FAILED,
        'Password does not meet security requirements',
        400,
        { requirements: passwordPolicy }
      );
    }

    // AD認証
    return new Promise<void>((resolve, reject) => {
      ad.authenticate(username, password, async (err, auth) => {
        if (err) {
          reject(createError(
            ErrorCode.AD_CONNECTION_ERROR,
            'Authentication failed',
            401,
            { originalError: err }
          ));
          return;
        }

        if (!auth) {
          reject(createError(
            ErrorCode.AUTH_INVALID_CREDENTIALS,
            'Invalid credentials',
            401
          ));
          return;
        }

        // ユーザー情報の取得
        ad.findUser(username, async (findErr, user) => {
          if (findErr) {
            reject(createError(
              ErrorCode.AD_OPERATION_FAILED,
              'Error retrieving user information',
              500,
              { originalError: findErr }
            ));
            return;
          }

          if (!user) {
            reject(createError(
              ErrorCode.AD_USER_NOT_FOUND,
              'User not found',
              404
            ));
            return;
          }

          try {
            // セッション数の確認
            const activeSessions = await TokenManager.getUserActiveSessions(user.id);
            if (activeSessions >= securityConfig.session.maxConcurrentSessions) {
              reject(createError(
                ErrorCode.AUTH_SESSION_LIMIT,
                'Maximum number of concurrent sessions reached',
                400
              ));
              return;
            }

            // JWTトークンの生成
            const token = generateToken(user);

            // セッションの追加
            await TokenManager.addUserSession(user.id);

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
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

// モック認証用エンドポイント（開発環境のみ）
router.post('/dev/login', devLoginLimiter, async (req, res, next) => {
  try {
    // 開発環境およびDEV_LOGIN_ENABLEDが有効でない場合は404を返す
    if (process.env.NODE_ENV !== 'development' && process.env.AUTH_MODE !== 'mock' && process.env.DEV_LOGIN_ENABLED !== 'true') {
      return res.status(404).json({
        status: 'error',
        message: 'Development login endpoint is not available or disabled'
      });
    }

    const { username, password } = req.body;

    // モックユーザーの認証情報を検証
    if (username !== 'mockuser' || password !== 'mockpass') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    const mockUser = {
      id: 'mock-user-001',
      username: 'mockuser',
      displayName: 'Mock User',
      email: 'mockuser@example.com',
      roles: ['admin', 'user'],
      memberOf: ['IT-Ops-Alert-Readers', 'IT-Ops-Metrics-Viewers']
    };

    const token = generateToken(mockUser);

    // セッション管理を追加
    await TokenManager.addUserSession(mockUser.id);

    // レスポンスを返す - 通常のログインエンドポイントと同じ形式で返す
    res.json({
      status: 'success',
      data: {
        token,
        user: {
          id: mockUser.id,
          username: mockUser.username,
          displayName: mockUser.displayName,
          email: mockUser.email,
          groups: mockUser.memberOf,
          roles: mockUser.roles
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// トークン検証ミドルウェア
export const verifyToken = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    next(createError(
      ErrorCode.AUTH_TOKEN_MISSING,
      'No token provided',
      401
    ));
    return;
  }

  try {
    // トークンがブラックリストにあるか確認
    const isBlacklisted = await TokenManager.isTokenBlacklisted(token);
    if (isBlacklisted) {
      next(createError(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Token has been invalidated',
        401
      ));
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(createError(
        ErrorCode.AUTH_TOKEN_EXPIRED,
        'Token has expired',
        401
      ));
    } else {
      next(createError(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Invalid token',
        401
      ));
    }
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
router.post('/logout', verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token && req.user) {
      // トークンをブラックリストに追加
      await TokenManager.blacklistToken({
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間
        userId: req.user.id,
        reason: 'logout'
      });

      // セッション数を減らす
      await TokenManager.removeUserSession(req.user.id);
    }

    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error during logout'
    });
  }
});

// パスワードリセット（強制ログアウト）
router.post('/force-logout', verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }

    // ユーザーの全セッションを無効化
    await TokenManager.invalidateAllUserSessions(userId);

    res.json({
      status: 'success',
      message: 'All sessions have been terminated'
    });
  } catch (error) {
    console.error('Force logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error during force logout'
    });
  }
});

router.post('/check-permission', async (req, res) => {
  try {
    const { userEmail, check } = req.body;
    const hasPermission = await permissionService.checkPermission(userEmail, check);
    res.json({ hasPermission });
  } catch (error) {
    logger.logError(error as Error, {
      context: 'PermissionAPI',
      message: '権限チェックエラー'
    });
    res.status(500).json({ error: '権限チェック中にエラーが発生しました' });
  }
});

router.get('/user-roles/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const roles = await authService.getUserRoles(email);
    res.json(roles);
  } catch (error) {
    logger.logError(error as Error, {
      context: 'PermissionAPI',
      message: 'ユーザーロール取得エラー'
    });
    res.status(500).json({ error: 'ユーザーロールの取得中にエラーが発生しました' });
  }
});

router.post('/validate-access', async (req, res) => {
  try {
    const { userEmail, permission } = req.body;
    const hasAccess = await authService.validateAccess(userEmail, permission);
    res.json({ hasAccess });
  } catch (error) {
    logger.logError(error as Error, {
      context: 'PermissionAPI',
      message: 'アクセス検証エラー'
    });
    res.status(500).json({ error: 'アクセス検証中にエラーが発生しました' });
  }
});

// エラーハンドリングの適用
import { errorLogger, errorHandler } from '../middleware/errorHandling';
router.use(errorLogger);
router.use(errorHandler);

export default router;
