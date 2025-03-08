"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sqliteService_1 = require("../sqliteService");
const redisService_1 = require("../redisService");
const loggingService_1 = require("../loggingService");
jest.mock('../loggingService');
describe('ストレージレイヤーの統合テスト', () => {
    let sqlite;
    let redis;
    let mockLogger;
    beforeEach(async () => {
        mockLogger = {
            logError: jest.fn(),
            logInfo: jest.fn(),
            getInstance: jest.fn().mockReturnThis()
        };
        loggingService_1.LoggingService.getInstance = jest.fn().mockReturnValue(mockLogger);
        sqlite = sqliteService_1.SQLiteService.getInstance();
        redis = redisService_1.RedisService.getInstance();
        await sqlite.initialize();
        await redis.initialize();
        // テストデータをクリーンアップ
        await sqlite.exec('DELETE FROM permission_audit');
        await sqlite.exec('DELETE FROM audit_reviews');
        await redis.delete('audit:*');
    });
    afterEach(async () => {
        await redis.shutdown();
    });
    describe('データの永続化', () => {
        it('SQLiteに正常にデータを保存できること', async () => {
            const result = await sqlite.run('INSERT INTO permission_audit (actor_id, action) VALUES (?, ?)', ['user1', 'test']);
            expect(result.lastID).toBeGreaterThan(0);
            const record = await sqlite.get('SELECT * FROM permission_audit WHERE actor_id = ?', ['user1']);
            expect(record).toBeDefined();
            expect(record?.action).toBe('test');
        });
        it('トランザクションが正しく動作すること', async () => {
            await sqlite.exec('BEGIN TRANSACTION');
            try {
                await sqlite.run('INSERT INTO permission_audit (actor_id, action) VALUES (?, ?)', ['user2', 'test1']);
                await sqlite.run('INSERT INTO permission_audit (actor_id, action) VALUES (?, ?)', ['user2', 'test2']);
                await sqlite.exec('COMMIT');
            }
            catch (error) {
                await sqlite.exec('ROLLBACK');
                throw error;
            }
            const records = await sqlite.all('SELECT * FROM permission_audit WHERE actor_id = ?', ['user2']);
            expect(records).toHaveLength(2);
        });
        it('一意性制約が機能すること', async () => {
            await sqlite.run('INSERT INTO audit_reviews (record_id, reviewer_id) VALUES (?, ?)', [1, 'reviewer1']);
            await expect(sqlite.run('INSERT INTO audit_reviews (record_id, reviewer_id) VALUES (?, ?)', [1, 'reviewer1'])).rejects.toThrow();
        });
    });
    describe('キャッシュ管理', () => {
        it('Redisにデータを正常にキャッシュできること', async () => {
            await redis.set('test:key', 'test-value', 60);
            const value = await redis.get('test:key');
            expect(value).toBe('test-value');
        });
        it('TTLが正しく機能すること', async () => {
            await redis.set('test:ttl', 'test-value', 1);
            await new Promise(resolve => setTimeout(resolve, 1100));
            const value = await redis.get('test:ttl');
            expect(value).toBeNull();
        });
        it('パターンによるキー削除が機能すること', async () => {
            await redis.set('audit:1:data', 'value1');
            await redis.set('audit:2:data', 'value2');
            await redis.set('other:data', 'value3');
            await redis.deletePattern('audit:*');
            expect(await redis.get('audit:1:data')).toBeNull();
            expect(await redis.get('audit:2:data')).toBeNull();
            expect(await redis.get('other:data')).toBe('value3');
        });
    });
    describe('エラー処理', () => {
        it('SQLite接続エラーを適切に処理すること', async () => {
            const invalidSqlite = new sqliteService_1.SQLiteService(':memory:');
            await expect(invalidSqlite.initialize()).rejects.toThrow();
        });
        it('Redis接続エラーを適切に処理すること', async () => {
            const invalidRedis = new redisService_1.RedisService({
                host: 'invalid-host',
                port: 1234
            });
            await expect(invalidRedis.initialize()).rejects.toThrow();
        });
        it('データベースの整合性チェックが機能すること', async () => {
            // 意図的に不正なデータを挿入
            await sqlite.run('INSERT INTO permission_audit (actor_id, action) VALUES (?, ?)', ['user3', null]);
            const result = await sqlite.get('SELECT * FROM permission_audit WHERE actor_id = ?', ['user3']);
            expect(result).toBeDefined();
            expect(mockLogger.logError).toHaveBeenCalled();
        });
    });
    describe('パフォーマンス最適化', () => {
        it('インデックスが正しく使用されること', async () => {
            // テストデータを生成
            for (let i = 0; i < 1000; i++) {
                await sqlite.run('INSERT INTO permission_audit (actor_id, action, timestamp) VALUES (?, ?, ?)', [`user${i}`, 'test', Date.now()]);
            }
            const startTime = Date.now();
            await sqlite.all('SELECT * FROM permission_audit WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 10', [Date.now() - 86400000]);
            const queryTime = Date.now() - startTime;
            // クエリ実行時間が100ms未満であることを確認
            expect(queryTime).toBeLessThan(100);
        });
        it('キャッシュヒット率を計測できること', async () => {
            const key = 'test:cache:hit';
            const value = 'test-value';
            // キャッシュミス
            let start = Date.now();
            let result = await redis.get(key);
            const missTime = Date.now() - start;
            expect(result).toBeNull();
            await redis.set(key, value);
            // キャッシュヒット
            start = Date.now();
            result = await redis.get(key);
            const hitTime = Date.now() - start;
            expect(result).toBe(value);
            // キャッシュヒットの方が高速であることを確認
            expect(hitTime).toBeLessThan(missTime);
        });
    });
});
//# sourceMappingURL=storageLayer.test.js.map