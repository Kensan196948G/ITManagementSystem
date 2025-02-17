import { test, expect } from '@playwright/test';

test.describe('ダッシュボードE2Eテスト', () => {
  test.beforeEach(async ({ page }) => {
    // ログインプロセス
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'validpassword');
    await page.click('button[type="submit"]');
    
    // ダッシュボードへのリダイレクトを待機
    await page.waitForURL('http://localhost:3000/dashboard');
  });

  test('ダッシュボード基本機能テスト', async ({ page }) => {
    // メトリクスチャートの表示確認
    await expect(page.locator('text=システムメトリクス')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();

    // アラートリストの表示確認
    await expect(page.locator('text=アクティブアラート')).toBeVisible();
    
    // ログビューアの表示確認
    await expect(page.locator('text=システムログ')).toBeVisible();
  });

  test('リアルタイム更新のテスト', async ({ page }) => {
    // 初期メトリクス値を取得
    const initialCpuText = await page.locator('text=/CPU使用率: .*%/').textContent();
    
    // 30秒待機して更新を確認
    await page.waitForTimeout(30000);
    
    // 更新後のメトリクス値を取得
    const updatedCpuText = await page.locator('text=/CPU使用率: .*%/').textContent();
    
    // 値が更新されていることを確認
    expect(initialCpuText).not.toBe(updatedCpuText);
  });

  test('アラート管理機能のテスト', async ({ page }) => {
    // アラートが表示されるまで待機
    await page.waitForSelector('[data-testid="alert-item"]');

    // 未確認のアラートを確認
    const unacknowledgedAlert = await page.locator('[data-testid="alert-item"]:not(.acknowledged)').first();
    
    if (await unacknowledgedAlert.isVisible()) {
      // アラート確認ボタンをクリック
      await unacknowledgedAlert.locator('button[aria-label="acknowledge"]').click();
      
      // アラートが確認済みになったことを確認
      await expect(unacknowledgedAlert).toHaveClass(/acknowledged/);
    }
  });

  test('ログフィルタリング機能のテスト', async ({ page }) => {
    // ログフィルター入力
    await page.fill('[data-testid="log-search"]', 'error');
    
    // フィルタリング結果の確認
    const filteredLogs = page.locator('[data-testid="log-entry"]');
    await expect(filteredLogs).toContainText(/error/i);

    // ログレベルフィルター
    await page.selectOption('select[aria-label="ログレベル"]', 'error');
    
    // フィルタリング結果を再確認
    const errorLogs = page.locator('[data-testid="log-entry"]');
    for (const log of await errorLogs.all()) {
      const level = await log.getAttribute('data-level');
      expect(level).toBe('error');
    }
  });

  test('システム管理機能のテスト', async ({ page }) => {
    // システム管理ページに移動
    await page.click('text=システム管理');
    await page.waitForURL('http://localhost:3000/system');

    // Active Directory管理
    await test.step('Active Directory管理', async () => {
      await page.click('text=Active Directory');
      await expect(page.locator('text=ユーザー管理')).toBeVisible();
      await expect(page.locator('text=グループ管理')).toBeVisible();
    });

    // Microsoft 365管理
    await test.step('Microsoft 365管理', async () => {
      await page.click('text=Microsoft 365');
      await expect(page.locator('text=ライセンス管理')).toBeVisible();
      await expect(page.locator('text=ユーザー管理')).toBeVisible();
    });
  });

  test('パフォーマンス指標の確認', async ({ page }) => {
    // ページロード時間の計測
    const startTime = Date.now();
    await page.reload();
    const loadTime = Date.now() - startTime;
    
    // ページロード時間が5秒未満であることを確認
    expect(loadTime).toBeLessThan(5000);

    // メトリクスチャートの更新をチェック
    let updates = 0;
    const checkInterval = setInterval(() => updates++, 1000);
    
    await page.waitForTimeout(30000);
    clearInterval(checkInterval);
    
    // 30秒間に少なくとも1回の更新があることを確認
    expect(updates).toBeGreaterThan(0);
  });

  test('レスポンシブデザインのテスト', async ({ page }) => {
    // モバイル表示のテスト
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.MuiGrid-root')).toBeVisible();
    
    // タブレット表示のテスト
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.MuiGrid-root')).toBeVisible();
    
    // デスクトップ表示のテスト
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('.MuiGrid-root')).toBeVisible();
  });
});