"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
expect.extend({
    toBeValidMetrics(received) {
        const isValid = typeof received.cpu.usage === 'number' &&
            typeof received.memory.total === 'number' &&
            typeof received.disk.total === 'number' &&
            typeof received.network.bytesIn === 'number' &&
            received.timestamp instanceof Date;
        return {
            pass: isValid,
            message: () => `expected ${received} to be valid metrics`
        };
    }
});
describe('Basic Test Setup', () => {
    it('should run a basic test', () => {
        expect(true).toBe(true);
    });
    it('should properly type check SystemMetrics', () => {
        const metrics = {
            cpu: {
                usage: 50,
                temperature: 60
            },
            memory: {
                total: 16000000000,
                used: 8000000000,
                free: 8000000000
            },
            disk: {
                total: 500000000000,
                used: 250000000000,
                free: 250000000000
            },
            network: {
                bytesIn: 1000000,
                bytesOut: 500000,
                packetsIn: 1000,
                packetsOut: 500
            },
            timestamp: new Date()
        };
        expect(metrics).toBeDefined();
        expect(metrics.cpu.usage).toBeLessThanOrEqual(100);
        expect(metrics.memory.total).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=basic.test.js.map