import { test, expect } from '@playwright/test';
import { loginAsAdmin, seedTestData } from './test-utils';

test.describe('監査システムのパフォーマンステスト', () => {
  test.beforeEach(async ({ page }) => {
    await seedTestData();
    await loginAsAdmin(page);
  });

  test('大量データでのパフォーマンス', async ({ page }) => {
    await page.goto('/audit');

    // ページロード時間の計測
    const startNavigation = Date.now();
    await page.reload();
    const loadTime = Date.now() - startNavigation;
    expect(loadTime).toBeLessThan(3000); // 3秒以内

    // スクロールパフォーマンス
    const scrollTimes = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(100);
      await page.evaluate(() => window.scrollTo(0, 0));
      scrollTimes.push(Date.now() - start);
    }

    // 平均スクロール時間が200ms以内
    const avgScrollTime = scrollTimes.reduce((a, b) => a + b) / scrollTimes.length;
    expect(avgScrollTime).toBeLessThan(200);

    // フィルター適用のレスポンス時間
    const startFilter = Date.now();
    await page.fill('input[name="actorEmail"]', 'admin@example.com');
    await page.click('button:has-text("検索")');
    await page.waitForResponse(response => 
      response.url().includes('/api/permission-audit/records')
    );
    const filterTime = Date.now() - startFilter;
    expect(filterTime).toBeLessThan(1000); // 1秒以内
  });

  test('同時リクエストの処理', async ({ browser }) => {
    const pages = await Promise.all(
      Array(3).fill(0).map(() => browser.newPage())
    );

    // 全ページでログイン
    await Promise.all(pages.map(page => loginAsAdmin(page)));

    // 同時に監査ログを要求
    const startTime = Date.now();
    await Promise.all(pages.map(page => 
      page.goto('/audit')
    ));

    // 全ページのロード完了を待機
    await Promise.all(pages.map(page =>
      page.waitForSelector('table')
    ));

    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(5000); // 5秒以内

    // 各ページでデータが正しく表示されていることを確認
    for (const page of pages) {
      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('tr')).toHaveCount(11); // ヘッダー + 10件のデータ
    }

    // リソースのクリーンアップ
    await Promise.all(pages.map(page => page.close()));
  });

  test('メモリ使用量の監視', async ({ page }) => {
    await page.goto('/audit');

    // メモリ使用量を計測
    const initialMemory = await page.evaluate(() => window.performance.memory?.usedJSHeapSize);
    
    // データの検索や表示を繰り返す
    for (let i = 0; i < 10; i++) {
      await page.fill('input[name="actorEmail"]', `user${i}@example.com`);
      await page.click('button:has-text("検索")');
      await page.waitForTimeout(500);
    }

    // 最終的なメモリ使用量を計測
    const finalMemory = await page.evaluate(() => window.performance.memory?.usedJSHeapSize);
    
    // メモリリークがないことを確認
    // 50%以上の増加がある場合は警告
    if (initialMemory && finalMemory) {
      const increase = (finalMemory - initialMemory) / initialMemory;
      expect(increase).toBeLessThan(0.5);
    }
  });

  test('設定変更の反映', async ({ page }) => {
    await page.goto('/audit/settings');

    // 表示設定の変更
    await page.selectOption('select[name="pageSize"]', '25');
    await page.click('button:has-text("保存")');
    await page.goto('/audit');
    
    // 変更が反映されていることを確認
    const rowCount = await page.locator('tr').count();
    expect(rowCount).toBeLessThanOrEqual(26); // ヘッダー + 最大25行

    // フィルター設定の変更
    await page.goto('/audit/settings');
    await page.click('input[name="enableAutoRefresh"]');
    await page.fill('input[name="refreshInterval"]', '30');
    await page.click('button:has-text("保存")');

    // 自動更新が機能することを確認
    await page.goto('/audit');
    const beforeCount = await page.locator('tr').count();
    await page.waitForTimeout(31000); // 更新間隔+1秒待機
    const afterCount = await page.locator('tr').count();
    expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
  });

  test('バックグラウンドジョブの動作', async ({ page }) => {
    await page.goto('/audit/settings');

    // バックグラウンドジョブの設定
    await page.click('input[name="enableMetricsCollection"]');
    await page.fill('input[name="metricsInterval"]', '5');
    await page.click('button:has-text("保存")');

    // メトリクス収集が実行されることを確認
    await page.goto('/audit/metrics');
    const initialMetrics = await page.locator('.metrics-value').count();
    await page.waitForTimeout(6000); // 収集間隔+1秒待機
    const updatedMetrics = await page.locator('.metrics-value').count();
    expect(updatedMetrics).toBeGreaterThan(initialMetrics);

    // 負荷テスト中のメトリクス収集
    const loadTest = async () => {
      for (let i = 0; i < 5; i++) {
        await page.goto('/audit');
        await page.waitForTimeout(100);
      }
    };

    await Promise.all([
      loadTest(),
      page.waitForTimeout(5000) // メトリクス収集を待機
    ]);

    // 負荷テスト後もメトリクスが正常に収集されていることを確認
    await page.goto('/audit/metrics');
    const finalMetrics = await page.locator('.metrics-value').count();
    expect(finalMetrics).toBeGreaterThan(updatedMetrics);
  });
});