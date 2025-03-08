"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const permissionAuditService_1 = require("../permissionAuditService");
const sqliteService_1 = require("../sqliteService");
const perf_hooks_1 = require("perf_hooks");
describe('PermissionAuditService Performance Tests', () => {
    let auditService;
    let sqlite;
    beforeAll(async () => {
        sqlite = sqliteService_1.SQLiteService.getInstance();
        auditService = permissionAuditService_1.PermissionAuditService.getInstance();
        // テストデータの準備
        await generateTestData();
    });
    async function generateTestData(count = 10000) {
        const startDate = new Date('2023-01-01');
        const actions = ['add', 'remove', 'modify'];
        const resourceTypes = ['role', 'permission', 'group', 'system'];
        for (let i = 0; i < count; i++) {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            await auditService.recordChange({
                timestamp: date,
                actorId: `actor${i % 100}`,
                actorEmail: `actor${i % 100}@example.com`,
                targetId: `target${i % 200}`,
                targetEmail: `target${i % 200}@example.com`,
                action: actions[i % 3],
                resourceType: resourceTypes[i % 4],
                resourceName: `resource${i % 50}`,
                reason: `Test reason ${i}`
            });
        }
    }
    test('検索のパフォーマンス - インデックスあり', async () => {
        const startTime = perf_hooks_1.performance.now();
        await auditService.searchAuditRecords({
            startDate: new Date('2023-06-01'),
            endDate: new Date('2023-12-31'),
            actorEmail: 'actor1@example.com'
        });
        const duration = perf_hooks_1.performance.now() - startTime;
        expect(duration).toBeLessThan(1000); // 1秒未満
    });
    test('統計集計のパフォーマンス', async () => {
        const startTime = perf_hooks_1.performance.now();
        await auditService.getChangeStatistics({
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-12-31')
        });
        const duration = perf_hooks_1.performance.now() - startTime;
        expect(duration).toBeLessThan(2000); // 2秒未満
    });
    test('ユーザー履歴取得のパフォーマンス', async () => {
        const startTime = perf_hooks_1.performance.now();
        await auditService.getUserPermissionHistory('actor1@example.com', 100);
        const duration = perf_hooks_1.performance.now() - startTime;
        expect(duration).toBeLessThan(500); // 500ms未満
    });
    test('レポート生成のパフォーマンス', async () => {
        const startTime = perf_hooks_1.performance.now();
        await auditService.generateReport({
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-12-31')
        });
        const duration = perf_hooks_1.performance.now() - startTime;
        expect(duration).toBeLessThan(3000); // 3秒未満
    });
    test('メモリ使用量のモニタリング', async () => {
        const initialMemory = process.memoryUsage().heapUsed;
        // 大量のデータで検索を実行
        await auditService.searchAuditRecords({
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-12-31')
        });
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;
        // メモリ増加が100MB未満であることを確認
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
    test('同時実行のパフォーマンス', async () => {
        const startTime = perf_hooks_1.performance.now();
        // 10件の同時リクエストをシミュレート
        const promises = Array(10).fill(null).map(() => auditService.searchAuditRecords({
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-12-31')
        }));
        await Promise.all(promises);
        const duration = perf_hooks_1.performance.now() - startTime;
        expect(duration).toBeLessThan(5000); // 5秒未満
    });
});
//# sourceMappingURL=permissionAuditPerformance.test.js.map