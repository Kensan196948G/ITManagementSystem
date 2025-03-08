import { test, expect } from '@playwright/test';
import { loginAsAdmin, seedTestData } from './test-utils';

test.describe('権限変更監査機能のE2Eテスト', () => {
  test.beforeEach(async ({ page }) => {
    await seedTestData();
    await loginAsAdmin(page);
  });

  test('権限変更履歴の表示と検索', async ({ page }) => {
    await page.goto('/audit');
    
    // 基本的な履歴表示の確認
    await expect(page.locator('h1')).toContainText('権限変更履歴');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('tr')).toHaveCount(11); // ヘッダー + 10件のデータ

    // フィルター機能のテスト
    await page.fill('input[name="actorEmail"]', 'admin@example.com');
    await page.click('button:has-text("検索")');
    await expect(page.locator('tr')).toContainText('admin@example.com');

    // 日付範囲フィルターのテスト
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.click('button:has-text("検索")');
    await expect(page.locator('tr')).toBeVisible();

    // 無効な日付範囲のエラー処理
    await page.fill('input[name="startDate"]', '2024-01-31');
    await page.fill('input[name="endDate"]', '2024-01-01');
    await page.click('button:has-text("検索")');
    await expect(page.locator('text=終了日は開始日より後の日付を指定してください')).toBeVisible();
  });

  test('権限変更レビュー機能', async ({ page }) => {
    await page.goto('/audit/reviews');

    // レビュー待ちの変更を確認
    await expect(page.locator('text=レビュー待ち')).toBeVisible();
    
    // レビューの承認
    await page.click('text=詳細を表示');
    await expect(page.locator('dialog')).toBeVisible();
    await page.fill('textarea[name="comments"]', 'Approved with standard checks');
    await page.click('button:has-text("承認")');
    await expect(page.locator('text=レビューが完了しました')).toBeVisible();

    // レビューの却下
    await page.click('text=詳細を表示', { nth: 1 });
    await page.fill('textarea[name="comments"]', 'Rejected due to policy violation');
    await page.click('button:has-text("却下")');
    await expect(page.locator('text=レビューが完了しました')).toBeVisible();

    // コメントなしでの承認を試行
    await page.click('text=詳細を表示');
    await page.click('button:has-text("承認")');
    await expect(page.locator('text=コメントを入力してください')).toBeVisible();
  });

  test('統計情報の表示', async ({ page }) => {
    await page.goto('/audit/statistics');

    // 基本的な統計情報の表示確認
    await expect(page.locator('text=アクション別統計')).toBeVisible();
    await expect(page.locator('text=リソース別統計')).toBeVisible();
    await expect(page.locator('text=レビュー状況')).toBeVisible();

    // 期間指定での統計表示
    await page.selectOption('select[name="period"]', 'last7days');
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForResponse(response => 
      response.url().includes('/api/permission-audit/statistics') && 
      response.status() === 200
    );

    // グラフ表示方法の変更
    await page.selectOption('select[name="chartType"]', 'pie');
    await expect(page.locator('canvas')).toBeVisible();

    // CSVエクスポート
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("CSVエクスポート")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('エラー処理', async ({ page }) => {
    // ネットワークエラーのシミュレーション
    await page.route('**/api/permission-audit/records', route => 
      route.abort('failed')
    );
    await page.goto('/audit');
    await expect(page.locator('text=データの取得に失敗しました')).toBeVisible();

    // サーバーエラーのシミュレーション
    await page.unroute('**/api/permission-audit/records');
    await page.route('**/api/permission-audit/records', route => 
      route.fulfill({ status: 500 })
    );
    await page.reload();
    await expect(page.locator('text=サーバーエラーが発生しました')).toBeVisible();

    // 権限エラーのシミュレーション
    await page.route('**/api/permission-audit/records', route => 
      route.fulfill({ status: 403 })
    );
    await page.reload();
    await expect(page.locator('text=アクセス権限がありません')).toBeVisible();

    // バリデーションエラーのシミュレーション
    await page.fill('input[name="actorEmail"]', 'invalid-email');
    await page.click('button:has-text("検索")');
    await expect(page.locator('text=有効なメールアドレスを入力してください')).toBeVisible();
  });

  test('セッション管理とタイムアウト', async ({ page }) => {
    // セッションタイムアウトのシミュレーション
    await page.goto('/audit');
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
    });
    await page.reload();
    await expect(page.locator('text=セッションが切れました')).toBeVisible();
    await expect(page).toHaveURL('/login');

    // 無効なトークンでのアクセス試行
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'invalid-token');
    });
    await page.goto('/audit');
    await expect(page.locator('text=認証エラー')).toBeVisible();
  });

  test('同時実行とレース状態', async ({ page, browser }) => {
    // 同時にレビューを試みる
    const page2 = await browser.newPage();
    await loginAsAdmin(page2);

    await page.goto('/audit/reviews');
    await page2.goto('/audit/reviews');

    // 両方のページで同じレビューを開く
    await page.click('text=詳細を表示');
    await page2.click('text=詳細を表示');

    // 片方でレビューを完了
    await page.fill('textarea[name="comments"]', 'First review');
    await page.click('button:has-text("承認")');
    await expect(page.locator('text=レビューが完了しました')).toBeVisible();

    // もう片方でレビューを試行
    await page2.fill('textarea[name="comments"]', 'Second review');
    await page2.click('button:has-text("承認")');
    await expect(page2.locator('text=このレビューは既に完了しています')).toBeVisible();
  });

  test('パフォーマンス測定', async ({ page }) => {
    // レスポンスタイム計測
    const startTime = Date.now();
    await page.goto('/audit/permissions');
    const loadTime = Date.now() - startTime;

    // ロード時間が5秒未満であることを確認
    expect(loadTime).toBeLessThan(5000);

    // 大量データのスクロールテスト
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1000);

    // スクロール後のパフォーマンスチェック
    const scrollTime = await page.evaluate(() => {
      const start = performance.now();
      window.scrollTo(0, 0);
      return performance.now() - start;
    });

    // スクロール時間が100ms未満であることを確認
    expect(scrollTime).toBeLessThan(100);
  });
});