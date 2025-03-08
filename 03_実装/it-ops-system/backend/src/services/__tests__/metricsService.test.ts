import { MetricsService } from '../metricsService';
import { register, Histogram, Counter, Gauge } from 'prom-client';

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
  let metricsService: MetricsService;
  let mockHistogram: jest.Mocked<Histogram<string>>;
  let mockCounter: jest.Mocked<Counter<string>>;
  let mockGauge: jest.Mocked<Gauge<string>>;

  beforeEach(() => {
    mockHistogram = {
      observe: jest.fn(),
      startTimer: jest.fn().mockReturnValue(() => 1),
      reset: jest.fn()
    } as any;

    mockCounter = {
      inc: jest.fn(),
      reset: jest.fn()
    } as any;

    mockGauge = {
      set: jest.fn(),
      reset: jest.fn()
    } as any;

    (Histogram as jest.Mock).mockImplementation(() => mockHistogram);
    (Counter as jest.Mock).mockImplementation(() => mockCounter);
    (Gauge as jest.Mock).mockImplementation(() => mockGauge);

    register.clear();
    metricsService = MetricsService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('シングルトンインスタンスを返すこと', () => {
      const instance1 = MetricsService.getInstance();
      const instance2 = MetricsService.getInstance();
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
      expect(Histogram).toHaveBeenCalledWith(config);
    });

    it('既存のメトリクスを削除してから作成すること', () => {
      const config = { name: 'test_histogram', help: 'Test help' };
      register.getSingleMetric.mockReturnValueOnce({} as any);

      metricsService.createHistogram(config);
      expect(register.removeSingleMetric).toHaveBeenCalledWith('test_histogram');
      expect(Histogram).toHaveBeenCalled();
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
      expect(Counter).toHaveBeenCalledWith(config);
    });

    it('既存のメトリクスを削除してから作成すること', () => {
      const config = { name: 'test_counter', help: 'Test help' };
      register.getSingleMetric.mockReturnValueOnce({} as any);

      metricsService.createCounter(config);
      expect(register.removeSingleMetric).toHaveBeenCalledWith('test_counter');
      expect(Counter).toHaveBeenCalled();
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
      expect(Gauge).toHaveBeenCalledWith(config);
    });

    it('既存のメトリクスを削除してから作成すること', () => {
      const config = { name: 'test_gauge', help: 'Test help' };
      register.getSingleMetric.mockReturnValueOnce({} as any);

      metricsService.createGauge(config);
      expect(register.removeSingleMetric).toHaveBeenCalledWith('test_gauge');
      expect(Gauge).toHaveBeenCalled();
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
      register.metrics.mockResolvedValueOnce('metrics data');
      const metrics = await metricsService.getMetrics();
      expect(metrics).toBe('metrics data');
      expect(register.metrics).toHaveBeenCalled();
    });

    it('エラー時に空文字列を返すこと', async () => {
      register.metrics.mockRejectedValueOnce(new Error('Metrics error'));
      const metrics = await metricsService.getMetrics();
      expect(metrics).toBe('');
    });
  });

  describe('resetMetrics', () => {
    it('全てのメトリクスをリセットできること', () => {
      metricsService.resetMetrics();
      expect(register.clear).toHaveBeenCalled();
    });
  });
});