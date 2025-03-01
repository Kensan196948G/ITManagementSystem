"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionService = void 0;
const sqliteService_1 = require("./sqliteService");
const loggingService_1 = __importDefault(require("./loggingService"));
const logger = loggingService_1.default.getInstance();
class PermissionService {
    constructor() {
        this.sqlite = sqliteService_1.SQLiteService.getInstance();
    }
    static getInstance() {
        if (!PermissionService.instance) {
            PermissionService.instance = new PermissionService();
        }
        return PermissionService.instance;
    }
    async getUserInfo(userId) {
        try {
            const userInfo = await this.sqlite.get('SELECT email, username, roles FROM users WHERE id = ?', [userId]);
            if (!userInfo) {
                logger.logAccess({
                    userId,
                    action: 'getUserInfo',
                    resource: 'users',
                    result: 'failure',
                    ip: '',
                    userAgent: '',
                    details: { reason: 'User not found' }
                });
                return null;
            }
            let roles = [];
            try {
                roles = JSON.parse(userInfo.roles);
            }
            catch (parseError) {
                logger.logError(parseError, {
                    context: 'PermissionService',
                    message: 'Failed to parse user roles',
                    userId
                });
            }
            return {
                email: userInfo.email,
                username: userInfo.username,
                roles
            };
        }
        catch (error) {
            logger.logError(error, {
                context: 'PermissionService',
                message: 'Failed to fetch user info',
                userId
            });
            return null;
        }
    }
    async validateRequiredGroups(email) {
        try {
            const groups = await this.sqlite.get('SELECT COUNT(*) as count FROM user_groups WHERE user_email = ?', [email]);
            if (!groups || groups.count === 0) {
                logger.logSecurity({
                    userId: email,
                    event: 'validateRequiredGroups',
                    severity: 'low',
                    details: { message: 'User is not part of any groups' }
                });
                return false;
            }
            return true;
        }
        catch (error) {
            logger.logError(error, {
                context: 'PermissionService',
                message: 'Group validation error',
                email
            });
            return false;
        }
    }
    async checkPermission(userId, resource, action) {
        try {
            const userRoles = await this.getUserRoles(userId);
            if (!userRoles) {
                logger.logSecurity({
                    userId,
                    event: 'checkPermission',
                    severity: 'medium',
                    details: { message: 'No roles found', resource, action }
                });
                return false;
            }
            if (userRoles.isGlobalAdmin) {
                return true;
            }
            const permissionKey = `${resource}:${action}`;
            const requiredGroups = await this.getRequiredGroups(permissionKey);
            if (requiredGroups.length === 0) {
                logger.logSecurity({
                    userId,
                    event: 'checkPermission',
                    severity: 'medium',
                    details: { message: 'No required groups found', permissionKey }
                });
                return false;
            }
            const hasPermission = requiredGroups.some(group => userRoles.permissions.includes(group));
            if (!hasPermission) {
                logger.logSecurity({
                    userId,
                    event: 'checkPermission',
                    severity: 'high',
                    details: { message: 'Permission denied', resource, action }
                });
            }
            return hasPermission;
        }
        catch (error) {
            logger.logError(error, {
                context: 'PermissionService',
                message: 'Permission check error',
                userId,
                resource,
                action
            });
            return false;
        }
    }
    async getRequiredGroups(permissionKey) {
        try {
            const result = await this.sqlite.get('SELECT groups FROM permission_mappings WHERE permission_key = ?', [permissionKey]);
            if (!result) {
                logger.logSecurity({
                    userId: 'system',
                    event: 'getRequiredGroups',
                    severity: 'low',
                    details: { message: 'No permission mapping found', permissionKey }
                });
                return [];
            }
            try {
                return JSON.parse(result.groups);
            }
            catch (parseError) {
                logger.logError(parseError, {
                    context: 'PermissionService',
                    message: 'Failed to parse required groups',
                    permissionKey
                });
                return [];
            }
        }
        catch (error) {
            logger.logError(error, {
                context: 'PermissionService',
                message: 'Failed to fetch required groups',
                permissionKey
            });
            return [];
        }
    }
    async getUserRoles(userId) {
        try {
            const result = await this.sqlite.get('SELECT is_global_admin, permissions FROM user_roles WHERE user_id = ?', [userId]);
            if (!result) {
                logger.logSecurity({
                    userId,
                    event: 'getUserRoles',
                    severity: 'medium',
                    details: { message: 'No roles found' }
                });
                return null;
            }
            let permissions = [];
            try {
                permissions = JSON.parse(result.permissions);
            }
            catch (parseError) {
                logger.logError(parseError, {
                    context: 'PermissionService',
                    message: 'Failed to parse user permissions',
                    userId
                });
            }
            return {
                isGlobalAdmin: result.is_global_admin === 1,
                permissions
            };
        }
        catch (error) {
            logger.logError(error, {
                context: 'PermissionService',
                message: 'Failed to fetch user roles',
                userId
            });
            return null;
        }
    }
}
exports.PermissionService = PermissionService;
//# sourceMappingURL=permissionService.js.map