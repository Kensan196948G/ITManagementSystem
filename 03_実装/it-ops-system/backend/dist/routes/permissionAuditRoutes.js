"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const permissionAuditService_1 = require("../services/permissionAuditService");
const authService_1 = require("../services/authService");
const permissionAuditValidation_1 = require("../middlewares/permissionAuditValidation");
const router = (0, express_1.Router)();
const auditService = permissionAuditService_1.PermissionAuditService.getInstance();
const authService = authService_1.AuthService.getInstance();
/**
 * 権限変更履歴の取得
 */
router.post('/records', permissionAuditValidation_1.validateAuditFilter, async (req, res) => {
    try {
        const { startDate, endDate, actorEmail, targetEmail, action, resourceType } = req.body;
        // アクセス権限の確認
        const user = await authService.getCurrentUser(req);
        if (!user || !await authService.hasPermission(user.id, 'audit.read')) {
            return res.status(403).json({ error: '権限がありません' });
        }
        const records = await auditService.searchAuditRecords({
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            actorEmail,
            targetEmail,
            action,
            resourceType
        });
        res.json(records);
    }
    catch (error) {
        res.status(500).json({ error: '権限変更履歴の取得に失敗しました' });
    }
});
/**
 * 権限変更統計の取得
 */
router.get('/statistics', async (req, res) => {
    try {
        // アクセス権限の確認
        const user = await authService.getCurrentUser(req);
        if (!user || !await authService.hasPermission(user.id, 'audit.read')) {
            return res.status(403).json({ error: '権限がありません' });
        }
        const statistics = await auditService.getChangeStatistics({});
        res.json(statistics);
    }
    catch (error) {
        res.status(500).json({ error: '統計情報の取得に失敗しました' });
    }
});
/**
 * 権限変更レビューの登録
 */
router.post('/review/:recordId', permissionAuditValidation_1.validateReview, async (req, res) => {
    try {
        const recordId = parseInt(req.params.recordId);
        const { approved, comments } = req.body;
        // アクセス権限の確認
        const user = await authService.getCurrentUser(req);
        if (!user || !await authService.hasPermission(user.id, 'audit.review')) {
            return res.status(403).json({ error: '権限がありません' });
        }
        await auditService.recordReview(recordId, user.id, user.email, approved, comments);
        res.json({ message: 'レビューが保存されました' });
    }
    catch (error) {
        res.status(500).json({ error: 'レビューの保存に失敗しました' });
    }
});
/**
 * ユーザー別の権限変更履歴の取得
 */
router.get('/user-history/:email', permissionAuditValidation_1.validateEmail, async (req, res) => {
    try {
        const { email } = req.params;
        // アクセス権限の確認
        const user = await authService.getCurrentUser(req);
        if (!user || !await authService.hasPermission(user.id, 'audit.read')) {
            return res.status(403).json({ error: '権限がありません' });
        }
        const history = await auditService.getUserPermissionHistory(email);
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: '権限変更履歴の取得に失敗しました' });
    }
});
exports.default = router;
//# sourceMappingURL=permissionAuditRoutes.js.map