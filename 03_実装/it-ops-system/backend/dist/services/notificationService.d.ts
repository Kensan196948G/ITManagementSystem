import { Alert } from '../types/system';
export declare class NotificationService {
    private static instance;
    private graphClient;
    private credential;
    private readonly RETRY_ATTEMPTS;
    private isMockMode;
    private constructor();
    private initializeGraphClient;
    private validateAuth;
    static getInstance(): NotificationService;
    sendAlertEmail(alert: Alert): Promise<void>;
    private generateAlertEmailTemplate;
    private getAlertColor;
    private getAlertTypeInJapanese;
}
//# sourceMappingURL=notificationService.d.ts.map