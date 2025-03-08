import { test, expect } from '@playwright/test';
import { loginAsAdmin, seedTestData } from './test-utils';

test.describe('監視・検知機能のE2Eテスト', () => {
  test.beforeEach(async ({ page }) => {
    await seedTestData();
    await loginAsAdmin(page);
  });

  test('異常検知と通知', async ({ page }) => {
    await page.goto('/monitoring/alerts');

    // アラート設定
    await page.click('button:has-text("アラート設定")');
    await page.fill('input[name="failedLoginThreshold"]', '5');
    await page.fill('input[name="timeWindowMinutes"]', '10');
    await page.click('button:has-text("保存")');

    // 異常なアクセスパターンの生成
    for (let i = 0; i < 6; i++) {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button:has-text("ログイン")');
      await page.waitForTimeout(1000);
    }

    // アラートの確認
    await page.goto('/monitoring/alerts');
    await expect(page.locator('text=ログイン失敗回数が閾値を超えました')).toBeVisible();
    await expect(page.locator('text=test@example.com')).toBeVisible();
    await expect(page.locator('.alert-status')).toContainText('未対応');
  });

  test('リアルタイムモニタリング', async ({ page }) => {
    await page.goto('/monitoring/realtime');

    // メトリクスの表示確認
    await expect(page.locator('text=アクティブユーザー数')).toBeVisible();
    await expect(page.locator('text=リクエスト/秒')).toBeVisible();
    await expect(page.locator('text=レスポンスタイム')).toBeVisible();

    // データの自動更新
    const initialCount = await page.locator('.metric-value').count();
    await page.waitForTimeout(5000); // 更新間隔待機
    const updatedCount = await page.locator('.metric-value').count();
    expect(updatedCount).toBeGreaterThanOrEqual(initialCount);

    // グラフの表示切替
    await page.selectOption('select[name="timeRange"]', 'last1hour');
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('パフォーマンス低下の検知', async ({ page }) => {
    await page.goto('/monitoring/performance');

    // パフォーマンスしきい値の設定
    await page.click('button:has-text("設定")');
    await page.fill('input[name="responseTimeThreshold"]', '1000');
    await page.fill('input[name="cpuThreshold"]', '80');
    await page.click('button:has-text("保存")');

    // 高負荷の生成
    const loadTest = async () => {
      for (let i = 0; i < 100; i++) {
        await page.goto('/api/heavy-operation');
        await page.waitForTimeout(10);
      }
    };

    // 負荷テストと監視の同時実行
    await Promise.all([
      loadTest(),
      page.waitForSelector('text=パフォーマンス低下を検知')
    ]);

    // アラートの確認
    await page.goto('/monitoring/alerts');
    await expect(page.locator('text=レスポンスタイムが閾値を超過')).toBeVisible();
  });

  test('リソース使用率の監視', async ({ page }) => {
    await page.goto('/monitoring/resources');

    // リソース使用率の表示確認
    await expect(page.locator('text=CPU使用率')).toBeVisible();
    await expect(page.locator('text=メモリ使用率')).toBeVisible();
    await expect(page.locator('text=ディスク使用率')).toBeVisible();

    // 使用率のグラフ表示
    await expect(page.locator('canvas')).toHaveCount(3);

    // しきい値設定
    await page.click('button:has-text("しきい値設定")');
    await page.fill('input[name="memoryThreshold"]', '90');
    await page.click('button:has-text("保存")');

    // メモリ使用率の警告表示
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('memoryWarning', {
        detail: { usage: 95 }
      }));
    });

    await expect(page.locator('text=メモリ使用率が90%を超えています')).toBeVisible();
  });

  test('システム障害の検知と復旧', async ({ page }) => {
    await page.goto('/monitoring/system');

    // サービスの状態確認
    await expect(page.locator('text=データベース')).toHaveClass(/status-healthy/);
    await expect(page.locator('text=キャッシュ')).toHaveClass(/status-healthy/);
    await expect(page.locator('text=認証サービス')).toHaveClass(/status-healthy/);

    // 障害のシミュレーション
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('serviceFailure', {
        detail: { service: 'database', error: 'Connection timeout' }
      }));
    });

    // 障害通知の確認
    await expect(page.locator('text=データベース')).toHaveClass(/status-error/);
    await expect(page.locator('text=緊急通知')).toBeVisible();
    await expect(page.locator('text=Connection timeout')).toBeVisible();

    // 復旧後の状態確認
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('serviceRecovery', {
        detail: { service: 'database' }
      }));
    });

    await expect(page.locator('text=データベース')).toHaveClass(/status-healthy/);
    await expect(page.locator('text=システム復旧完了')).toBeVisible();
  });

  test('監査ログの異常検知', async ({ page }) => {
    await page.goto('/monitoring/audit-logs');

    // 異常パターンの設定
    await page.click('button:has-text("パターン設定")');
    await page.fill('textarea[name="suspiciousPatterns"]', `
      {"pattern": "multiple_permission_changes", "threshold": 5}
      {"pattern": "sensitive_data_access", "timeWindow": 300}
    `);
    await page.click('button:has-text("保存")');

    // 異常パターンのシミュレーション
    for (let i = 0; i < 6; i++) {
      await page.evaluate((index) => {
        window.dispatchEvent(new CustomEvent('auditLog', {
          detail: {
            type: 'permission_change',
            user: 'admin',
            target: `role${index}`,
            timestamp: Date.now()
          }
        }));
      }, i);
    }

    // 異常検知の確認
    await expect(page.locator('text=異常な権限変更パターンを検知')).toBeVisible();
    await expect(page.locator('.incident-details')).toContainText('admin');

    // インシデントレポートの生成
    await page.click('button:has-text("レポート生成")');
    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toContain('incident-report');
  });
});