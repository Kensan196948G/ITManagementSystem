interface RecoveryResult {
    success: boolean;
    message: string;
    recoveryTime?: number;
}
export declare function runRecovery(): Promise<RecoveryResult>;
export declare function executeRecovery(): Promise<void>;
export {};
//# sourceMappingURL=autoRecover.d.ts.map