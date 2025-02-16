import express from 'express';
import { verifyToken } from './auth';
import { ADUser, ADGroup, ADUserCreateDto, ADUserUpdateDto, ADGroupCreateDto, ADGroupUpdateDto } from '../types/system';
import ActiveDirectory from 'activedirectory2';
import { SystemError } from '../types/custom';

const router = express.Router();

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

const ad = new ActiveDirectory(config);

// エラーハンドラー
const handleADError = (error: any): SystemError => {
  const systemError: SystemError = new Error(error.message);
  systemError.code = error.code || 'AD_ERROR';
  systemError.details = error;
  return systemError;
};

// ユーザー一覧取得
router.get('/users', verifyToken, async (_req, res) => {
  try {
    ad.findUsers({}, (err: Error | null, users: ADUser[]) => {
      if (err) {
        throw handleADError(err);
      }
      res.json({ status: 'success', data: users });
    });
  } catch (error) {
    const systemError = handleADError(error);
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
    const userData: ADUserCreateDto = req.body;
    ad.createUser(userData, (err: Error | null) => {
      if (err) {
        throw handleADError(err);
      }
      res.json({ status: 'success', message: 'User created successfully' });
    });
  } catch (error) {
    const systemError = handleADError(error);
    res.status(500).json({
      status: 'error',
      message: systemError.message,
      code: systemError.code
    });
  }
});

// ユーザー更新
router.put('/users/:samAccountName', verifyToken, async (req, res) => {
  try {
    const { samAccountName } = req.params;
    const userData: ADUserUpdateDto = req.body;

    ad.updateUser(samAccountName, userData, (err: Error | null) => {
      if (err) {
        throw handleADError(err);
      }
      res.json({ status: 'success', message: 'User updated successfully' });
    });
  } catch (error) {
    const systemError = handleADError(error);
    res.status(500).json({
      status: 'error',
      message: systemError.message,
      code: systemError.code
    });
  }
});

// ユーザー有効/無効化
router.post('/users/:samAccountName/toggle', verifyToken, async (req, res) => {
  try {
    const { samAccountName } = req.params;
    const { enabled } = req.body;

    const method = enabled ? 'enableUser' : 'disableUser';
    ad[method](samAccountName, (err: Error | null) => {
      if (err) {
        throw handleADError(err);
      }
      res.json({
        status: 'success',
        message: `User ${enabled ? 'enabled' : 'disabled'} successfully`
      });
    });
  } catch (error) {
    const systemError = handleADError(error);
    res.status(500).json({
      status: 'error',
      message: systemError.message,
      code: systemError.code
    });
  }
});

// グループ一覧取得
router.get('/groups', verifyToken, async (_req, res) => {
  try {
    ad.findGroups({}, (err: Error | null, groups: ADGroup[]) => {
      if (err) {
        throw handleADError(err);
      }
      res.json({ status: 'success', data: groups });
    });
  } catch (error) {
    const systemError = handleADError(error);
    res.status(500).json({
      status: 'error',
      message: systemError.message,
      code: systemError.code
    });
  }
});

// グループ作成
router.post('/groups', verifyToken, async (req, res) => {
  try {
    const groupData: ADGroupCreateDto = req.body;
    ad.createGroup(groupData, (err: Error | null) => {
      if (err) {
        throw handleADError(err);
      }
      res.json({ status: 'success', message: 'Group created successfully' });
    });
  } catch (error) {
    const systemError = handleADError(error);
    res.status(500).json({
      status: 'error',
      message: systemError.message,
      code: systemError.code
    });
  }
});

// グループ更新
router.put('/groups/:name', verifyToken, async (req, res) => {
  try {
    const { name } = req.params;
    const groupData: ADGroupUpdateDto = req.body;

    ad.updateGroup(name, groupData, (err: Error | null) => {
      if (err) {
        throw handleADError(err);
      }
      res.json({ status: 'success', message: 'Group updated successfully' });
    });
  } catch (error) {
    const systemError = handleADError(error);
    res.status(500).json({
      status: 'error',
      message: systemError.message,
      code: systemError.code
    });
  }
});

// グループメンバー管理
router.post('/groups/:name/members', verifyToken, async (req, res) => {
  try {
    const { name } = req.params;
    const { action, members } = req.body;

    const method = action === 'add' ? 'addUsersToGroup' : 'removeUsersFromGroup';
    ad[method](name, members, (err: Error | null) => {
      if (err) {
        throw handleADError(err);
      }
      res.json({
        status: 'success',
        message: `Members ${action === 'add' ? 'added to' : 'removed from'} group successfully`
      });
    });
  } catch (error) {
    const systemError = handleADError(error);
    res.status(500).json({
      status: 'error',
      message: systemError.message,
      code: systemError.code
    });
  }
});

export default router;