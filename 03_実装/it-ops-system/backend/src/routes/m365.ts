import express from 'express';
import { Client } from '@microsoft/microsoft-graph-client';
import { verifyToken } from './auth';
import {
  M365User,
  M365License,
  M365UserCreateDto,
  M365UserUpdateDto,
  M365LicenseCreateDto,
  M365LicenseUpdateDto,
  ServiceToggleDto,
  SystemError
} from '../types/system';

const router = express.Router();

// Microsoft Graph クライアント初期化
const getGraphClient = () => {
  return Client.init({
    authProvider: async (done) => {
      try {
        // アクセストークンの取得（実際の実装ではトークンキャッシュを使用）
        const accessToken = process.env.M365_ACCESS_TOKEN || '';
        if (!accessToken) {
          throw new Error('M365 access token not found');
        }
        done(null, accessToken);
      } catch (error) {
        done(error as Error, null);
      }
    }
  });
};

// エラーハンドラー
const handleM365Error = (error: any): SystemError => {
  const systemError: SystemError = new Error(error.message);
  systemError.code = error.code || 'M365_ERROR';
  systemError.details = error;
  return systemError;
};

// ユーザー一覧取得
router.get('/users', verifyToken, async (_req, res) => {
  try {
    const client = getGraphClient();
    const users = await client
      .api('/users')
      .select('id,displayName,userPrincipalName,accountEnabled,assignedLicenses')
      .get();

    const formattedUsers: M365User[] = users.value.map((user: any) => ({
      id: user.id,
      displayName: user.displayName,
      email: user.userPrincipalName,
      accountEnabled: user.accountEnabled,
      licenses: user.assignedLicenses.map((license: any) => license.skuId),
      assignedServices: [], // サービス情報は別途取得が必要
      lastSignIn: user.signInActivity?.lastSignInDateTime
    }));

    res.json({ status: 'success', data: formattedUsers });
  } catch (error) {
    const systemError = handleM365Error(error);
    res.status(500).json({
      status: 'error',
      message: systemError.message,
      code: systemError.code
    });
  }
});

// ユーザー作成
router.post('/users', verifyToken, async (req, res) => {
  try {
    const userData: M365UserCreateDto = req.body;
    const client = getGraphClient();

    const newUser = {
      accountEnabled: userData.accountEnabled,
      displayName: userData.displayName,
      userPrincipalName: userData.email,
      mailNickname: userData.email.split('@')[0],
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password: userData.password
      }
    };

    const createdUser = await client.api('/users').post(newUser);
    
    // ライセンスの割り当て
    if (userData.licenses.length > 0) {
      await client.api(`/users/${createdUser.id}/assignLicense`).post({
        addLicenses: userData.licenses.map(licenseId => ({ skuId: licenseId })),
        removeLicenses: []
      });
    }

    res.json({ status: 'success', message: 'User created successfully' });
  } catch (error) {
    const systemError = handleM365Error(error);
    res.status(500).json({
      status: 'error',
      message: systemError.message,
      code: systemError.code
    });
  }
});

// ユーザー更新
router.put('/users/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userData: M365UserUpdateDto = req.body;
    const client = getGraphClient();

    const updateData: any = {};
    if (userData.displayName) updateData.displayName = userData.displayName;
    if (userData.accountEnabled !== undefined) {
      updateData.accountEnabled = userData.accountEnabled;
    }

    await client.api(`/users/${id}`).patch(updateData);

    // ライセンスの更新
    if (userData.licenses) {
      const currentLicenses = await client
        .api(`/users/${id}/assignedLicenses`)
        .get();

      const removeLicenses = currentLicenses.value
        .map((license: any) => license.skuId)
        .filter((skuId: string) => !userData.licenses?.includes(skuId));

      const addLicenses = userData.licenses
        .filter(
          (licenseId) =>
            !currentLicenses.value.some((l: any) => l.skuId === licenseId)
        )
        .map((licenseId) => ({ skuId: licenseId }));

      await client.api(`/users/${id}/assignLicense`).post({
        addLicenses,
        removeLicenses
      });
    }

    res.json({ status: 'success', message: 'User updated successfully' });
  } catch (error) {
    const systemError = handleM365Error(error);
    res.status(500).json({
      status: 'error',
      message: systemError.message,
      code: systemError.code
    });
  }
});

// ライセンス一覧取得
router.get('/licenses', verifyToken, async (_req, res) => {
  try {
    const client = getGraphClient();
    const subscriptions = await client
      .api('/subscribedSkus')
      .select('skuId,skuPartNumber,consumedUnits,prepaidUnits')
      .get();

    const formattedLicenses: M365License[] = subscriptions.value.map(
      (sub: any) => ({
        id: sub.skuId,
        name: sub.skuPartNumber,
        totalQuantity: sub.prepaidUnits.enabled,
        consumedQuantity: sub.consumedUnits,
        skuId: sub.skuId,
        services: [] // サービス情報は別途取得が必要
      })
    );

    res.json({ status: 'success', data: formattedLicenses });
  } catch (error) {
    const systemError = handleM365Error(error);
    res.status(500).json({
      status: 'error',
      message: systemError.message,
      code: systemError.code
    });
  }
});

// サービス有効/無効化
router.post('/users/:userId/services/:serviceId', verifyToken, async (req, res) => {
  try {
    const { userId, serviceId } = req.params;
    const { enabled }: ServiceToggleDto = req.body;
    const client = getGraphClient();

    await client.api(`/users/${userId}/services/${serviceId}`).patch({
      status: enabled ? 'enabled' : 'disabled'
    });

    res.json({
      status: 'success',
      message: `Service ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    const systemError = handleM365Error(error);
    res.status(500).json({
      status: 'error',
      message: systemError.message,
      code: systemError.code
    });
  }
});

export default router;