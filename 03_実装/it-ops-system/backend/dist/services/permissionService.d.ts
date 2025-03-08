import { UserRole } from '../types/system';
import { AuthorizationLevel } from '../types/authorization';
export declare const ResourcePermissions: {
    DASHBOARD: {
        VIEW: string;
        EDIT: string;
        ADMIN: string;
    };
    METRICS: {
        VIEW: string;
        EDIT: string;
        ADMIN: string;
    };
    SECURITY: {
        VIEW: string;
        EDIT: string;
        ADMIN: string;
    };
    USERS: {
        VIEW: string;
        EDIT: string;
        ADMIN: string;
    };
    SYSTEM: {
        VIEW: string;
        EDIT: string;
        ADMIN: string;
    };
};
export declare class PermissionService {
    private static instance;
    private sqlite;
    private authService;
    private constructor();
    static getInstance(): PermissionService;
    /**
     * ユーザー情報を取得する
     * @param userId ユーザーID
     * @returns ユーザー情報（メールアドレス、ユーザー名、ロール）
     */
    getUserInfo(userId: string): Promise<{
        email: string;
        username: string;
        roles: string[];
    } | null>;
    /**
     * 必要なグループの所属を検証する
     * @param email ユーザーのメールアドレス
     * @returns グループ所属が有効かどうか
     */
    validateRequiredGroups(email: string): Promise<boolean>;
    /**
     * 特定のリソースとアクションに対する権限をチェックする
     * @param userId ユーザーIDまたはメールアドレス
     * @param resource リソース名
     * @param action アクション（read, write, admin）
     * @returns 権限があるかどうか
     */
    checkPermission(userId: string, resource: string, action: string): Promise<boolean>;
    /**
     * ユーザーが特定の権限レベルを満たしているかチェック
     * @param userId ユーザーIDまたはメールアドレス
     * @param level 必要な権限レベル
     * @returns 権限レベルを満たしているかどうか
     */
    checkAuthorizationLevel(userId: string, level: AuthorizationLevel): Promise<boolean>;
    /**
     * 特定の権限に必要なグループを取得
     * @param permissionKey 権限キー（例: "dashboard:read"）
     * @returns 必要なグループのリスト
     */
    private getRequiredGroups;
    /**
     * ユーザーのロール情報を取得
     * @param userId ユーザーID
     * @returns ユーザーのロール情報
     */
    getUserRoles(userId: string): Promise<UserRole | null>;
    /**
     * 権限マッピングを同期する（メモリ内のマッピングとDBを同期）
     */
    syncPermissionMappings(): Promise<void>;
}
//# sourceMappingURL=permissionService.d.ts.map