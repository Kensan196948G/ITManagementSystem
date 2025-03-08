"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const monitoringService_1 = require("../monitoringService");
const metricsService_1 = require("../metricsService");
const loggingService_1 = require("../loggingService");
const notificationService_1 = require("../notificationService");
jest.mock('../metricsService');
jest.mock('../loggingService');
jest.mock('../notificationService');
describe('MonitoringService', () => {
    let monitoringService;
    let mockMetrics;
    let mockLogger;
    let mockNotification;
    beforeEach(() => {
        mockMetrics = {
            createHistogram: jest.fn(),
            createCounter: jest.fn(),
            createGauge: jest.fn(),
            observeHistogram: jest.fn(),
            getInstance: jest.fn().mockReturnThis()
        };
        mockLogger = {
            logError: jest.fn(),
            logInfo: jest.fn(),
            logWarn: jest.fn(),
            getInstance: jest.fn().mockReturnThis()
        };
        mockNotification = {
            sendAlert: jest.fn().mockResolvedValue(true),
            sendNotification: jest.fn().mockResolvedValue(true),
            getInstance: jest.fn().mockReturnThis()
        };
        metricsService_1.MetricsService.getInstance = jest.fn().mockReturnValue(mockMetrics);
        loggingService_1.LoggingService.getInstance = jest.fn().mockReturnValue(mockLogger);
        notificationService_1.NotificationService.getInstance = jest.fn().mockReturnValue(mockNotification);
        monitoringService = monitoringService_1.MonitoringService.getInstance();
    });
    describe('システム状態監視', () => {
        it('システムの健全性チェックを実行できること', async () => {
            const healthChecks = [
                {
                    name: 'database',
                    check: jest.fn().mockResolvedValue(true)
                },
                {
                    name: 'cache',
                    check: jest.fn().mockResolvedValue(true)
                }
            ];
            const results = await monitoringService.runHealthChecks(healthChecks);
            expect(results.every(r => r.status === 'healthy')).toBe(true);
            expect(mockLogger.logInfo).toHaveBeenCalled();
        });
        it('異常を検知して通知できること', async () => {
            const healthChecks = [
                {
                    name: 'database',
                    check: jest.fn().mockRejectedValue(new Error('Connection failed'))
                }
            ];
            const results = await monitoringService.runHealthChecks(healthChecks);
            expect(results[0].status).toBe('unhealthy');
            expect(mockNotification.sendAlert).toHaveBeenCalled();
            expect(mockLogger.logError).toHaveBeenCalled();
        });
        it('部分的な障害を処理できること', async () => {
            const healthChecks = [
                {
                    name: 'database',
                    check: jest.fn().mockResolvedValue(true)
                },
                {
                    name: 'cache',
                    check: jest.fn().mockRejectedValue(new Error('Cache error'))
                }
            ];
            const results = await monitoringService.runHealthChecks(healthChecks);
            expect(results[0].status).toBe('healthy');
            expect(results[1].status).toBe('unhealthy');
            expect(mockLogger.logWarn).toHaveBeenCalled();
        });
    });
    describe('パフォーマンスモニタリング', () => {
        it('レスポンスタイムを計測できること', async () => {
            const timer = monitoringService.startResponseTimer();
            await new Promise(resolve => setTimeout(resolve, 100));
            const duration = timer();
            expect(duration).toBeGreaterThanOrEqual(100);
            expect(mockMetrics.observeHistogram).toHaveBeenCalled();
        });
        it('しきい値超過を検知できること', async () => {
            monitoringService.setThreshold('responseTime', 1000);
            const slowResponse = 1500;
            await monitoringService.checkThreshold('responseTime', slowResponse);
            expect(mockNotification.sendAlert).toHaveBeenCalled();
        });
        it('リソース使用率を監視できること', async () => {
            const metrics = {
                cpu: 80,
                memory: 90,
                disk: 70
            };
            await monitoringService.monitorResources(metrics);
            expect(mockMetrics.createGauge).toHaveBeenCalledTimes(3);
            expect(mockLogger.logInfo).toHaveBeenCalled();
        });
    });
    describe('異常検知', () => {
        it('連続失敗を検知できること', async () => {
            const failures = Array(5).fill({
                type: 'login',
                userId: 'test-user',
                timestamp: Date.now()
            });
            await monitoringService.detectFailurePattern(failures);
            expect(mockNotification.sendAlert).toHaveBeenCalled();
        });
        it('異常なアクセスパターンを検知できること', async () => {
            const accessPattern = Array(10).fill({
                userId: 'test-user',
                resource: 'sensitive-data',
                timestamp: Date.now()
            });
            await monitoringService.detectAnomalousAccess(accessPattern);
            expect(mockLogger.logWarn).toHaveBeenCalled();
            expect(mockNotification.sendAlert).toHaveBeenCalled();
        });
        it('カスタムパターンを検知できること', async () => {
            const pattern = {
                type: 'multiple_permission_changes',
                threshold: 5,
                timeWindow: 300
            };
            const events = Array(6).fill({
                type: 'permission_change',
                userId: 'admin',
                timestamp: Date.now()
            });
            await monitoringService.detectCustomPattern(events, pattern);
            expect(mockNotification.sendAlert).toHaveBeenCalled();
        });
    });
    describe('監視データの集計', () => {
        it('期間ごとの統計を計算できること', async () => {
            const events = Array(10).fill({
                type: 'access',
                timestamp: Date.now(),
                duration: 100
            });
            const stats = await monitoringService.calculateStatistics(events, {
                period: '1h'
            });
            expect(stats).toHaveProperty('totalCount');
            expect(stats).toHaveProperty('averageDuration');
            expect(mockLogger.logInfo).toHaveBeenCalled();
        });
        it('異常値を除外して集計できること', async () => {
            const events = [
                ...Array(9).fill({ duration: 100 }),
                { duration: 10000 } // 異常値
            ];
            const stats = await monitoringService.calculateStatistics(events, {
                period: '1h',
                excludeOutliers: true
            });
            expect(stats.totalCount).toBe(9);
            expect(mockLogger.logInfo).toHaveBeenCalled();
        });
    });
    describe('アラート管理', () => {
        it('重複アラートを抑制できること', async () => {
            const alert = {
                type: 'high_cpu',
                severity: 'warning',
                timestamp: Date.now()
            };
            // 最初のアラート
            await monitoringService.processAlert(alert);
            expect(mockNotification.sendAlert).toHaveBeenCalled();
            // 重複するアラート（抑制される）
            mockNotification.sendAlert.mockClear();
            await monitoringService.processAlert(alert);
            expect(mockNotification.sendAlert).not.toHaveBeenCalled();
        });
        it('アラートをエスカレーションできること', async () => {
            const alert = {
                type: 'service_down',
                severity: 'critical',
                timestamp: Date.now(),
                count: 3
            };
            await monitoringService.processAlert(alert);
            expect(mockNotification.sendAlert).toHaveBeenCalledWith(expect.objectContaining({
                severity: 'critical',
                escalated: true
            }));
        });
        it('アラートの自動解決を処理できること', async () => {
            const alert = {
                id: 'test-alert',
                type: 'high_memory',
                timestamp: Date.now()
            };
            // アラート発生
            await monitoringService.processAlert(alert);
            expect(mockNotification.sendAlert).toHaveBeenCalled();
            // 状態が正常に戻った場合
            await monitoringService.resolveAlert(alert.id);
            expect(mockNotification.sendNotification).toHaveBeenCalledWith(expect.objectContaining({
                type: 'alert_resolved'
            }));
        });
    });
});
//# sourceMappingURL=monitoringService.test.js.map