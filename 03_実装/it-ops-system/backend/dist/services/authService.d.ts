interface UserRole {
    isGlobalAdmin: boolean;
    roles: string[];
    userGroups: string[];
}
export declare class AuthService {
    private static instance;
    private graphClient;
    private constructor();
    static getInstance(): AuthService;
    private initializeGraphClient;
    getUserRoles(userEmail: string): Promise<UserRole>;
    validateAccess(userEmail: string, requiredPermission: string): Promise<boolean>;
}
export {};
//# sourceMappingURL=authService.d.ts.map