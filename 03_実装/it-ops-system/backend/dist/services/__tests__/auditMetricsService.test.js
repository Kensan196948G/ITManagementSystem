"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auditMetricsService_1 = require("../auditMetricsService");
const sqliteService_1 = require("../sqliteService");
jest.mock('../sqliteService');
describe('AuditMetricsService', () => {
    let metricsService;
    let mockSQLite;
    beforeEach(async () => {
        jest.clearAllMocks();
        mockSQLite = {
            run: jest.fn().mockResolvedValue({ lastID: 1 }),
            all: jest.fn().mockResolvedValue([]),
            get: jest.fn().mockResolvedValue(null),
            exec: jest.fn().mockResolvedValue(undefined),
            getInstance: jest.fn().mockReturnThis(),
            initialize: jest.fn().mockResolvedValue(undefined)
        };
        sqliteService_1.SQLiteService.getInstance = jest.fn().mockReturnValue(mockSQLite);
        metricsService = auditMetricsService_1.AuditMetricsService.getInstance();
    });
    describe('recordMetric', () => {
        it('メトリクスを正常に記録できること', async () => {
            const result = await metricsService.recordMetric('test_metric', 1.5, {
                label1: 'value1',
                label2: 'value2'
            });
            expect(result).toBe(1);
            expect(mockSQLite.run).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([
                expect.any(String),
                1.5,
                JSON.stringify({ label1: 'value1', label2: 'value2' })
            ]));
        });
        it('ラベルなしでメトリクスを記録できること', async () => {
            await metricsService.recordMetric('test_metric', 1.0);
            expect(mockSQLite.run).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([expect.any(String), 1.0, '{}']));
        });
        it('エラー時に例外をスローすること', async () => {
            mockSQLite.run.mockRejectedValueOnce(new Error('Database error'));
            await expect(metricsService.recordMetric('test_metric', 1.0))
                .rejects.toThrow('Database error');
        });
    });
    describe('getMetrics', () => {
        it('指定された期間のメトリクスを取得できること', async () => {
            const mockMetrics = [
                {
                    timestamp: '2024-01-01T00:00:00.000Z',
                    metric_name: 'test_metric',
                    metric_value: 1.5,
                    metric_labels: '{"label1":"value1"}'
                }
            ];
            mockSQLite.all.mockResolvedValueOnce(mockMetrics);
            const result = await metricsService.getMetrics('test_metric', {
                startTime: new Date('2024-01-01'),
                endTime: new Date('2024-01-02')
            });
            expect(result).toHaveLength(1);
            expect(result[0].value).toBe(1.5);
            expect(result[0].labels).toEqual({ label1: 'value1' });
        });
        it('期間指定なしでメトリクスを取得できること', async () => {
            await metricsService.getMetrics('test_metric');
            expect(mockSQLite.all).toHaveBeenCalled();
        });
    });
    describe('getAggregatedMetrics', () => {
        it('メトリクスの集計を実行できること', async () => {
            const mockAggregation = [
                { value: 10, count: 5, avg: 2.0, min: 1.0, max: 3.0 }
            ];
            mockSQLite.all.mockResolvedValueOnce(mockAggregation);
            const result = await metricsService.getAggregatedMetrics('test_metric', {
                startTime: new Date('2024-01-01'),
                endTime: new Date('2024-01-02')
            });
            expect(result).toBeDefined();
            expect(result).toEqual(mockAggregation[0]);
        });
        it('ラベルフィルターで集計できること', async () => {
            await metricsService.getAggregatedMetrics('test_metric', {
                labelFilters: { label1: 'value1' }
            });
            expect(mockSQLite.all).toHaveBeenCalledWith(expect.stringContaining('metric_labels LIKE'), expect.arrayContaining(['%"label1":"value1"%']));
        });
    });
});
//# sourceMappingURL=auditMetricsService.test.js.map