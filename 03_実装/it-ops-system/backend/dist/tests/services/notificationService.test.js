"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const notificationService_1 = require("../../services/notificationService");
const nodemailer_1 = __importDefault(require("nodemailer"));
jest.mock('nodemailer');
describe('NotificationService', () => {
    let notificationService;
    beforeEach(() => {
        // テスト用のトランスポーターをモック
        nodemailer_1.default.createTransport.mockReturnValue({
            sendMail: jest.fn().mockResolvedValue({
                messageId: 'test-message-id'
            })
        });
        notificationService = notificationService_1.NotificationService.getInstance();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('sendAlertEmail', () => {
        it('アラートメールを正常に送信できること', async () => {
            const alert = {
                id: 'test-alert-1',
                type: 'critical',
                source: 'test-monitor',
                message: 'Test alert message',
                timestamp: new Date(),
                acknowledged: false
            };
            process.env.ALERT_EMAIL_RECIPIENTS = 'test1@example.com,test2@example.com';
            process.env.SMTP_FROM = 'alert@example.com';
            await notificationService.sendAlertEmail(alert);
            const transporter = nodemailer_1.default.createTransport();
            expect(transporter.sendMail).toHaveBeenCalledWith({
                from: 'alert@example.com',
                to: 'test1@example.com,test2@example.com',
                subject: expect.stringContaining('[CRITICAL]'),
                html: expect.stringContaining('Test alert message')
            });
        });
        it('受信者が設定されていない場合は送信をスキップすること', async () => {
            const alert = {
                id: 'test-alert-2',
                type: 'warning',
                source: 'test-monitor',
                message: 'Test warning message',
                timestamp: new Date(),
                acknowledged: false
            };
            process.env.ALERT_EMAIL_RECIPIENTS = '';
            await notificationService.sendAlertEmail(alert);
            const transporter = nodemailer_1.default.createTransport();
            expect(transporter.sendMail).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=notificationService.test.js.map