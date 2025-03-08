"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const permissionAuditService_1 = require("../../services/permissionAuditService");
const sqliteService_1 = require("../../services/sqliteService");
describe('権限変更監査パフォーマンステスト', () => {
    let auditService;
    let startTime;
    beforeAll(async () => {
        auditService = permissionAuditService_1.PermissionAuditService.getInstance();
        // テストデータの生成
        await generateTestData();
    });
    beforeEach(() => {
        startTime = performance.now();
    });
    afterEach(() => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`Test duration: ${duration.toFixed(2)}ms`);
    });
    async function generateTestData() {
        const sqlite = sqliteService_1.SQLiteService.getInstance();
        const baseDate = new Date('2024-01-01');
        const records = [];
        // 10000件のテストデータを生成
        for (let i = 0; i < 10000; i++) {
            const date = new Date(baseDate.getTime() + i * 1000 * 60 * 60); // 1時間ごと
            records.push([
                date.toISOString(),
                `actor${i % 100}`,
                `actor${i % 100}@example.com`,
                `target${i % 500}`,
                `target${i % 500}@example.com`,
                ['add', 'remove', 'modify'][i % 3],
                ['role', 'permission', 'group', 'system'][i % 4],
                `resource${i % 50}`,
                null,
                null,
                'Performance test',
                null,
                null,
                null
            ]);
        }
        // バルクインサート
        const chunks = [];
        for (let i = 0; i < records.length; i += 1000) {
            chunks.push(records.slice(i, i + 1000));
        }
        for (const chunk of chunks) {
            await sqlite.run(`
        INSERT INTO permission_audit (
          timestamp, actor_id, actor_email, target_id, target_email,
          action, resource_type, resource_name, permission_before,
          permission_after, reason, ip_address, user_agent, application_id
        ) VALUES ${chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',')}
      `, chunk.flat());
        }
    }
    it('大量データの検索性能テスト', async () => {
        const filter = {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31')
        };
        const records = await auditService.searchAuditRecords(filter);
        expect(performance.now() - startTime).toBeLessThan(1000); // 1秒以内
        expect(records.length).toBeGreaterThan(0);
    });
    it('フィルター付き検索性能テスト', async () => {
        const filter = {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31'),
            actorEmail: 'actor1@example.com',
            action: 'add'
        };
        const records = await auditService.searchAuditRecords(filter);
        expect(performance.now() - startTime).toBeLessThan(500); // 500ミリ秒以内
        expect(records.length).toBeGreaterThan(0);
    });
    it('統計情報生成性能テスト', async () => {
        const filter = {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31')
        };
        const stats = await auditService.getChangeStatistics(filter);
        expect(performance.now() - startTime).toBeLessThan(2000); // 2秒以内
        expect(stats).toHaveProperty('actionStats');
        expect(stats).toHaveProperty('resourceStats');
    });
    it('メモリ使用量テスト', async () => {
        const initialMemory = process.memoryUsage().heapUsed;
        // 大量のデータを検索
        await auditService.searchAuditRecords({
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31')
        });
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryDiff = (finalMemory - initialMemory) / 1024 / 1024; // MB
        expect(memoryDiff).toBeLessThan(100); // 100MB以内のメモリ増加
    });
    it('同時リクエスト処理性能テスト', async () => {
        const requests = [];
        for (let i = 0; i < 10; i++) {
            requests.push(auditService.searchAuditRecords({
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-12-31')
            }));
        }
        const results = await Promise.all(requests);
        expect(performance.now() - startTime).toBeLessThan(3000); // 3秒以内
        results.forEach(records => {
            expect(records.length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=permissionAudit.performance.test.js.map