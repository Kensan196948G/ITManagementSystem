import express from 'express';
import { verifyToken } from './auth';
import { AuthService } from '../services/authService';
import { Client } from '@microsoft/microsoft-graph-client';
import LoggingService from '../services/loggingService';

const router = express.Router();
const logger = LoggingService.getInstance();
const authService = AuthService.getInstance();

// グローバル管理者チェックエンドポイント
router.get('/check-global-admin', verifyToken, async (req, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({
        status: 'error',
        message: 'ユーザーメールアドレスが見つかりません'
      });
    }

    const { isGlobalAdmin } = await authService.getUserRoles(req.user.email);
    res.json({ 
      status: 'success',
      isGlobalAdmin 
    });
  } catch (error) {
    logger.logError(error as Error, {
      context: 'AdminCheck',
      message: '管理者権限チェックエラー'
    });
    res.status(500).json({
      status: 'error',
      message: '管理者権限の確認中にエラーが発生しました'
    });
  }
});

// Graph APIパーミッション確認エンドポイント
router.get('/graph-permissions', verifyToken, async (req, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({
        status: 'error',
        message: 'ユーザーメールアドレスが見つかりません'
      });
    }

    // まずグローバル管理者かチェック
    const { isGlobalAdmin } = await authService.getUserRoles(req.user.email);
    if (!isGlobalAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'この操作にはグローバル管理者権限が必要です'
      });
    }

    const client = Client.init({
      authProvider: async (done) => {
        try {
          const accessToken = process.env.MS_ACCESS_TOKEN;
          done(null, accessToken!);
        } catch (error) {
          done(error as Error, null);
        }
      }
    });

    // アプリケーションの現在のパーミッションを取得
    const app = await client
      .api('/applications')
      .filter(`appId eq '${process.env.MS_CLIENT_ID}'`)
      .get();

    const currentPermissions = app.value[0].requiredResourceAccess || [];

    res.json({
      status: 'success',
      data: {
        currentPermissions,
        recommendedPermissions: [
          'Directory.Read.All',
          'User.Read.All',
          'GroupMember.Read.All',
          'Application.ReadWrite.All',
          'RoleManagement.ReadWrite.Directory',
          'Organization.Read.All'
        ]
      }
    });
  } catch (error) {
    logger.logError(error as Error, {
      context: 'GraphPermissions',
      message: 'Graph APIパーミッション確認エラー'
    });
    res.status(500).json({
      status: 'error',
      message: 'Graph APIパーミッションの確認中にエラーが発生しました'
    });
  }
});

export default router;