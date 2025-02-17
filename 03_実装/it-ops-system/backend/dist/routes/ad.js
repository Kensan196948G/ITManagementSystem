"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("./auth");
const activedirectory2_1 = __importDefault(require("activedirectory2"));
const router = express_1.default.Router();
// Active Directory設定
const config = {
    url: process.env.AD_URL,
    baseDN: process.env.AD_BASE_DN,
    username: process.env.AD_USERNAME,
    password: process.env.AD_PASSWORD,
    attributes: {
        user: [
            'sAMAccountName', 'displayName', 'mail', 'department',
            'title', 'manager', 'userAccountControl', 'whenCreated',
            'whenChanged', 'lastLogon', 'pwdLastSet', 'memberOf'
        ],
        group: ['cn', 'description', 'groupType', 'member']
    }
};
const ad = new activedirectory2_1.default(config);
// エラーハンドラー
const handleADError = (error) => {
    const systemError = new Error(error.message);
    systemError.code = error.code || 'AD_ERROR';
    systemError.details = error;
    return systemError;
};
// ユーザー一覧取得
router.get('/users', auth_1.verifyToken, async (_req, res) => {
    try {
        ad.findUsers({}, (err, users) => {
            if (err) {
                throw handleADError(err);
            }
            res.json({ status: 'success', data: users });
        });
    }
    catch (error) {
        const systemError = handleADError(error);
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
        ad.createUser(userData, (err) => {
            if (err) {
                throw handleADError(err);
            }
            res.json({ status: 'success', message: 'User created successfully' });
        });
    }
    catch (error) {
        const systemError = handleADError(error);
        res.status(500).json({
            status: 'error',
            message: systemError.message,
            code: systemError.code
        });
    }
});
// ユーザー更新
router.put('/users/:samAccountName', auth_1.verifyToken, async (req, res) => {
    try {
        const { samAccountName } = req.params;
        const userData = req.body;
        ad.updateUser(samAccountName, userData, (err) => {
            if (err) {
                throw handleADError(err);
            }
            res.json({ status: 'success', message: 'User updated successfully' });
        });
    }
    catch (error) {
        const systemError = handleADError(error);
        res.status(500).json({
            status: 'error',
            message: systemError.message,
            code: systemError.code
        });
    }
});
// ユーザー有効/無効化
router.post('/users/:samAccountName/toggle', auth_1.verifyToken, async (req, res) => {
    try {
        const { samAccountName } = req.params;
        const { enabled } = req.body;
        const method = enabled ? 'enableUser' : 'disableUser';
        ad[method](samAccountName, (err) => {
            if (err) {
                throw handleADError(err);
            }
            res.json({
                status: 'success',
                message: `User ${enabled ? 'enabled' : 'disabled'} successfully`
            });
        });
    }
    catch (error) {
        const systemError = handleADError(error);
        res.status(500).json({
            status: 'error',
            message: systemError.message,
            code: systemError.code
        });
    }
});
// グループ一覧取得
router.get('/groups', auth_1.verifyToken, async (_req, res) => {
    try {
        ad.findGroups({}, (err, groups) => {
            if (err) {
                throw handleADError(err);
            }
            res.json({ status: 'success', data: groups });
        });
    }
    catch (error) {
        const systemError = handleADError(error);
        res.status(500).json({
            status: 'error',
            message: systemError.message,
            code: systemError.code
        });
    }
});
// グループ作成
router.post('/groups', auth_1.verifyToken, async (req, res) => {
    try {
        const groupData = req.body;
        ad.createGroup(groupData, (err) => {
            if (err) {
                throw handleADError(err);
            }
            res.json({ status: 'success', message: 'Group created successfully' });
        });
    }
    catch (error) {
        const systemError = handleADError(error);
        res.status(500).json({
            status: 'error',
            message: systemError.message,
            code: systemError.code
        });
    }
});
// グループ更新
router.put('/groups/:name', auth_1.verifyToken, async (req, res) => {
    try {
        const { name } = req.params;
        const groupData = req.body;
        ad.updateGroup(name, groupData, (err) => {
            if (err) {
                throw handleADError(err);
            }
            res.json({ status: 'success', message: 'Group updated successfully' });
        });
    }
    catch (error) {
        const systemError = handleADError(error);
        res.status(500).json({
            status: 'error',
            message: systemError.message,
            code: systemError.code
        });
    }
});
// グループメンバー管理
router.post('/groups/:name/members', auth_1.verifyToken, async (req, res) => {
    try {
        const { name } = req.params;
        const { action, members } = req.body;
        const method = action === 'add' ? 'addUsersToGroup' : 'removeUsersFromGroup';
        ad[method](name, members, (err) => {
            if (err) {
                throw handleADError(err);
            }
            res.json({
                status: 'success',
                message: `Members ${action === 'add' ? 'added to' : 'removed from'} group successfully`
            });
        });
    }
    catch (error) {
        const systemError = handleADError(error);
        res.status(500).json({
            status: 'error',
            message: systemError.message,
            code: systemError.code
        });
    }
});
exports.default = router;
//# sourceMappingURL=ad.js.map