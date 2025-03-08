interface UserRole {
    isGlobalAdmin: boolean;
    roles: string[];
    userGroups: string[];
}
interface MSPermission {
    id: string;
    type: string;
    name?: string;
}
interface MSPermissionResponse {
    status: string;
    permissions: MSPermission[];
    missingPermissions: string[];
    accountStatus: string;
    roles?: string[];
}
export declare class AuthService {
    private static instance;
    private graphClient;
    private readonly GLOBAL_ADMIN_ROLE_ID;
    private readonly RECOMMENDED_PERMISSIONS;
    private constructor();
    static getInstance(): AuthService;
    private initializeGraphClient;
    /**
     * ユーザーのロール情報を取得する
     * @param userEmail ユーザーのメールアドレス
     * @returns ユーザーのロール情報
     */
    getUserRoles(userEmail: string): Promise<UserRole>;
    /**
     * ユーザーがグローバル管理者かどうかを確認する
     * @param userEmail ユーザーのメールアドレス
     * @returns グローバル管理者かどうか
     */
    isGlobalAdmin(userEmail: string): Promise<boolean>;
    /**
     * 特定の権限に対するアクセス権を検証する
     * @param userEmail ユーザーのメールアドレス
     * @param requiredPermission 必要な権限
     * @returns アクセス権があるかどうか
     */
    validateAccess(userEmail: string, requiredPermission: string): Promise<boolean>;
    /**
     * ユーザーのMicrosoft Graph API権限を取得する
     * @param userEmail ユーザーのメールアドレス
     * @returns Microsoft権限情報
     */
    getMicrosoftPermissions(userEmail: string): Promise<MSPermissionResponse>;
}
export {};
//# sourceMappingURL=authService.d.ts.map