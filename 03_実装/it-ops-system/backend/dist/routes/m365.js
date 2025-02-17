"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const microsoft_graph_client_1 = require("@microsoft/microsoft-graph-client");
const auth_1 = require("./auth");
const router = express_1.default.Router();
// Microsoft Graph クライアント初期化
const getGraphClient = () => {
    return microsoft_graph_client_1.Client.init({
        authProvider: async (done) => {
            try {
                // アクセストークンの取得（実際の実装ではトークンキャッシュを使用）
                const accessToken = process.env.M365_ACCESS_TOKEN || '';
                if (!accessToken) {
                    throw new Error('M365 access token not found');
                }
                done(null, accessToken);
            }
            catch (error) {
                done(error, null);
            }
        }
    });
};
// エラーハンドラー
const handleM365Error = (error) => {
    const systemError = new Error(error.message);
    systemError.code = error.code || 'M365_ERROR';
    systemError.details = error;
    return systemError;
};
// ユーザー一覧取得
router.get('/users', auth_1.verifyToken, async (_req, res) => {
    try {
        const client = getGraphClient();
        const users = await client
            .api('/users')
            .select('id,displayName,userPrincipalName,accountEnabled,assignedLicenses')
            .get();
        const formattedUsers = users.value.map((user) => ({
            id: user.id,
            displayName: user.displayName,
            email: user.userPrincipalName,
            accountEnabled: user.accountEnabled,
            licenses: user.assignedLicenses.map((license) => license.skuId),
            assignedServices: [], // サービス情報は別途取得が必要
            lastSignIn: user.signInActivity?.lastSignInDateTime
        }));
        res.json({ status: 'success', data: formattedUsers });
    }
    catch (error) {
        const systemError = handleM365Error(error);
        res.status(500).json({
            status: 'error',
            message: systemError.message,
            code: systemError.code
        });
    }
});
// ユーザー作成
router.post('/users', auth_1.verifyToken, async (req, res) => {
    try {
        const userData = req.body;
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
    }
    catch (error) {
        const systemError = handleM365Error(error);
        res.status(500).json({
            status: 'error',
            message: systemError.message,
            code: systemError.code
        });
    }
});
// ユーザー更新
router.put('/users/:id', auth_1.verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userData = req.body;
        const client = getGraphClient();
        const updateData = {};
        if (userData.displayName)
            updateData.displayName = userData.displayName;
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
                .map((license) => license.skuId)
                .filter((skuId) => !userData.licenses?.includes(skuId));
            const addLicenses = userData.licenses
                .filter((licenseId) => !currentLicenses.value.some((l) => l.skuId === licenseId))
                .map((licenseId) => ({ skuId: licenseId }));
            await client.api(`/users/${id}/assignLicense`).post({
                addLicenses,
                removeLicenses
            });
        }
        res.json({ status: 'success', message: 'User updated successfully' });
    }
    catch (error) {
        const systemError = handleM365Error(error);
        res.status(500).json({
            status: 'error',
            message: systemError.message,
            code: systemError.code
        });
    }
});
// ライセンス一覧取得
router.get('/licenses', auth_1.verifyToken, async (_req, res) => {
    try {
        const client = getGraphClient();
        const subscriptions = await client
            .api('/subscribedSkus')
            .select('skuId,skuPartNumber,consumedUnits,prepaidUnits')
            .get();
        const formattedLicenses = subscriptions.value.map((sub) => ({
            id: sub.skuId,
            name: sub.skuPartNumber,
            totalQuantity: sub.prepaidUnits.enabled,
            consumedQuantity: sub.consumedUnits,
            skuId: sub.skuId,
            services: [] // サービス情報は別途取得が必要
        }));
        res.json({ status: 'success', data: formattedLicenses });
    }
    catch (error) {
        const systemError = handleM365Error(error);
        res.status(500).json({
            status: 'error',
            message: systemError.message,
            code: systemError.code
        });
    }
});
// サービス有効/無効化
router.post('/users/:userId/services/:serviceId', auth_1.verifyToken, async (req, res) => {
    try {
        const { userId, serviceId } = req.params;
        const { enabled } = req.body;
        const client = getGraphClient();
        await client.api(`/users/${userId}/services/${serviceId}`).patch({
            status: enabled ? 'enabled' : 'disabled'
        });
        res.json({
            status: 'success',
            message: `Service ${enabled ? 'enabled' : 'disabled'} successfully`
        });
    }
    catch (error) {
        const systemError = handleM365Error(error);
        res.status(500).json({
            status: 'error',
            message: systemError.message,
            code: systemError.code
        });
    }
});
exports.default = router;
//# sourceMappingURL=m365.js.map