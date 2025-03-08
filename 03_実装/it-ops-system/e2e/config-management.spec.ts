import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './test-utils';
import fs from 'fs/promises';
import path from 'path';

test.describe('設定管理のテスト', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('システム設定の変更と永続化', async ({ page }) => {
    await page.goto('/audit/settings');

    // システムログの設定変更
    await page.selectOption('select[name="logLevel"]', 'debug');
    await page.click('input[name="enableFileLogging"]');
    await page.fill('input[name="logRetentionDays"]', '30');
    await page.click('button:has-text("保存")');

    // 設定が保存されたことを確認
    await page.reload();
    await expect(page.locator('select[name="logLevel"]')).toHaveValue('debug');
    await expect(page.locator('input[name="enableFileLogging"]')).toBeChecked();
    await expect(page.locator('input[name="logRetentionDays"]')).toHaveValue('30');

    // データベース設定の変更
    await page.click('text=データベース設定');
    await page.fill('input[name="maxConnections"]', '20');
    await page.fill('input[name="queryTimeout"]', '5000');
    await page.click('button:has-text("保存")');

    // 変更が反映されていることを確認
    await page.reload();
    await page.click('text=データベース設定');
    await expect(page.locator('input[name="maxConnections"]')).toHaveValue('20');
    await expect(page.locator('input[name="queryTimeout"]')).toHaveValue('5000');
  });

  test('環境変数による設定のオーバーライド', async ({ page }) => {
    // 環境変数で設定を上書き
    process.env.AUDIT_LOG_LEVEL = 'warn';
    process.env.AUDIT_RETENTION_DAYS = '60';

    await page.goto('/audit/settings');

    // 環境変数の値が優先されていることを確認
    await expect(page.locator('select[name="logLevel"]')).toHaveValue('warn');
    await expect(page.locator('input[name="logRetentionDays"]')).toHaveValue('60');

    // UI での変更が制限されていることを確認
    await page.selectOption('select[name="logLevel"]', 'debug');
    await page.click('button:has-text("保存")');
    
    await expect(page.locator('text=この設定は環境変数で制御されています')).toBeVisible();
    await page.reload();
    await expect(page.locator('select[name="logLevel"]')).toHaveValue('warn');
  });

  test('設定ファイルの検証', async ({ page }) => {
    await page.goto('/audit/settings');

    // 無効な設定値の検証
    await page.fill('input[name="maxConnections"]', '-1');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=接続数は正の整数を指定してください')).toBeVisible();

    await page.fill('input[name="queryTimeout"]', '0');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=タイムアウト値は1000ms以上で指定してください')).toBeVisible();

    // 設定の依存関係チェック
    await page.click('input[name="enableMetricsCollection"]');
    await page.fill('input[name="metricsRetentionDays"]', '0');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=メトリクス収集が有効な場合、保持期間を指定してください')).toBeVisible();
  });

  test('設定のバックアップと復元', async ({ page }) => {
    await page.goto('/audit/settings');

    // 現在の設定をバックアップ
    await page.click('button:has-text("設定のエクスポート")');
    const download = await page.waitForEvent('download');
    const filePath = await download.path();
    expect(filePath).toBeTruthy();

    // 設定を変更
    await page.selectOption('select[name="logLevel"]', 'debug');
    await page.click('button:has-text("保存")');

    // バックアップから復元
    const importButton = await page.locator('input[type="file"]');
    await importButton.setInputFiles(filePath as string);
    await page.click('button:has-text("インポート")');

    // 元の設定が復元されたことを確認
    await page.reload();
    await expect(page.locator('select[name="logLevel"]')).not.toHaveValue('debug');
  });

  test('設定変更の監査ログ', async ({ page }) => {
    await page.goto('/audit/settings');

    // 設定変更を実行
    await page.selectOption('select[name="logLevel"]', 'debug');
    await page.click('button:has-text("保存")');

    // 監査ログで変更を確認
    await page.goto('/audit');
    await page.fill('input[name="action"]', 'config_change');
    await page.click('button:has-text("検索")');

    await expect(page.locator('table')).toContainText('設定変更');
    await expect(page.locator('table')).toContainText('logLevel');
    await expect(page.locator('table')).toContainText('debug');
  });

  test('複数環境の設定管理', async ({ page }) => {
    // 開発環境の設定を確認
    process.env.NODE_ENV = 'development';
    await page.goto('/audit/settings');
    await expect(page.locator('text=開発環境の設定')).toBeVisible();
    
    const devLogLevel = await page.locator('select[name="logLevel"]').inputValue();
    expect(devLogLevel).toBe('debug');

    // 本番環境の設定を確認
    process.env.NODE_ENV = 'production';
    await page.reload();
    await expect(page.locator('text=本番環境の設定')).toBeVisible();
    
    const prodLogLevel = await page.locator('select[name="logLevel"]').inputValue();
    expect(prodLogLevel).toBe('info');

    // 環境固有の設定項目を確認
    if (process.env.NODE_ENV === 'development') {
      await expect(page.locator('text=モック設定')).toBeVisible();
    } else {
      await expect(page.locator('text=モック設定')).not.toBeVisible();
    }
  });
});