"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const metricsService_1 = require("../metricsService");
const prom_client_1 = require("prom-client");
jest.mock('prom-client', () => ({
    register: {
        clear: jest.fn(),
        metrics: jest.fn(),
        getSingleMetric: jest.fn(),
        removeSingleMetric: jest.fn()
    },
    Histogram: jest.fn(),
    Counter: jest.fn(),
    Gauge: jest.fn()
}));
describe('MetricsService', () => {
    let metricsService;
    let mockHistogram;
    let mockCounter;
    let mockGauge;
    beforeEach(() => {
        mockHistogram = {
            observe: jest.fn(),
            startTimer: jest.fn().mockReturnValue(() => 1),
            reset: jest.fn()
        };
        mockCounter = {
            inc: jest.fn(),
            reset: jest.fn()
        };
        mockGauge = {
            set: jest.fn(),
            reset: jest.fn()
        };
        prom_client_1.Histogram.mockImplementation(() => mockHistogram);
        prom_client_1.Counter.mockImplementation(() => mockCounter);
        prom_client_1.Gauge.mockImplementation(() => mockGauge);
        prom_client_1.register.clear();
        metricsService = metricsService_1.MetricsService.getInstance();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('getInstance', () => {
        it('シングルトンインスタンスを返すこと', () => {
            const instance1 = metricsService_1.MetricsService.getInstance();
            const instance2 = metricsService_1.MetricsService.getInstance();
            expect(instance1).toBe(instance2);
        });
    });
    describe('createHistogram', () => {
        it('新しいヒストグラムメトリクスを作成できること', () => {
            const config = {
                name: 'test_histogram',
                help: 'Test histogram help',
                labelNames: ['label1', 'label2'],
                buckets: [0.1, 0.5, 1]
            };
            const histogram = metricsService.createHistogram(config);
            expect(histogram).toBeDefined();
            expect(prom_client_1.Histogram).toHaveBeenCalledWith(config);
        });
        it('既存のメトリクスを削除してから作成すること', () => {
            const config = { name: 'test_histogram', help: 'Test help' };
            prom_client_1.register.getSingleMetric.mockReturnValueOnce({});
            metricsService.createHistogram(config);
            expect(prom_client_1.register.removeSingleMetric).toHaveBeenCalledWith('test_histogram');
            expect(prom_client_1.Histogram).toHaveBeenCalled();
        });
    });
    describe('createCounter', () => {
        it('新しいカウンターメトリクスを作成できること', () => {
            const config = {
                name: 'test_counter',
                help: 'Test counter help',
                labelNames: ['label1']
            };
            const counter = metricsService.createCounter(config);
            expect(counter).toBeDefined();
            expect(prom_client_1.Counter).toHaveBeenCalledWith(config);
        });
        it('既存のメトリクスを削除してから作成すること', () => {
            const config = { name: 'test_counter', help: 'Test help' };
            prom_client_1.register.getSingleMetric.mockReturnValueOnce({});
            metricsService.createCounter(config);
            expect(prom_client_1.register.removeSingleMetric).toHaveBeenCalledWith('test_counter');
            expect(prom_client_1.Counter).toHaveBeenCalled();
        });
    });
    describe('createGauge', () => {
        it('新しいゲージメトリクスを作成できること', () => {
            const config = {
                name: 'test_gauge',
                help: 'Test gauge help',
                labelNames: ['label1']
            };
            const gauge = metricsService.createGauge(config);
            expect(gauge).toBeDefined();
            expect(prom_client_1.Gauge).toHaveBeenCalledWith(config);
        });
        it('既存のメトリクスを削除してから作成すること', () => {
            const config = { name: 'test_gauge', help: 'Test help' };
            prom_client_1.register.getSingleMetric.mockReturnValueOnce({});
            metricsService.createGauge(config);
            expect(prom_client_1.register.removeSingleMetric).toHaveBeenCalledWith('test_gauge');
            expect(prom_client_1.Gauge).toHaveBeenCalled();
        });
    });
    describe('observeHistogram', () => {
        it('ヒストグラムの観測値を記録できること', () => {
            const histogram = metricsService.createHistogram({
                name: 'test_histogram',
                help: 'Test help'
            });
            metricsService.observeHistogram(histogram, 1.5, { label: 'test' });
            expect(mockHistogram.observe).toHaveBeenCalledWith({ label: 'test' }, 1.5);
        });
        it('タイマー関数を提供できること', () => {
            const histogram = metricsService.createHistogram({
                name: 'test_histogram',
                help: 'Test help'
            });
            const endTimer = metricsService.startHistogramTimer(histogram, { label: 'test' });
            expect(mockHistogram.startTimer).toHaveBeenCalledWith({ label: 'test' });
            endTimer();
            expect(mockHistogram.startTimer).toHaveBeenCalled();
        });
    });
    describe('getMetrics', () => {
        it('全てのメトリクスを取得できること', async () => {
            prom_client_1.register.metrics.mockResolvedValueOnce('metrics data');
            const metrics = await metricsService.getMetrics();
            expect(metrics).toBe('metrics data');
            expect(prom_client_1.register.metrics).toHaveBeenCalled();
        });
        it('エラー時に空文字列を返すこと', async () => {
            prom_client_1.register.metrics.mockRejectedValueOnce(new Error('Metrics error'));
            const metrics = await metricsService.getMetrics();
            expect(metrics).toBe('');
        });
    });
    describe('resetMetrics', () => {
        it('全てのメトリクスをリセットできること', () => {
            metricsService.resetMetrics();
            expect(prom_client_1.register.clear).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=metricsService.test.js.map