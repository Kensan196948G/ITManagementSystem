import { UserRole } from '../types/system';
export declare class PermissionService {
    private static instance;
    private sqlite;
    private constructor();
    static getInstance(): PermissionService;
    getUserInfo(userId: string): Promise<{
        email: string;
        username: string;
        roles: string[];
    } | null>;
    validateRequiredGroups(email: string): Promise<boolean>;
    checkPermission(userId: string, resource: string, action: string): Promise<boolean>;
    private getRequiredGroups;
    getUserRoles(userId: string): Promise<UserRole | null>;
}
//# sourceMappingURL=permissionService.d.ts.map