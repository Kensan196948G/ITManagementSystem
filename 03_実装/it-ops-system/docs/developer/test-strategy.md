# テスト戦略

## 概要

本ドキュメントは、IT運用システムのテスト戦略を定義します。このテスト戦略は、ISO 20000（ITサービスマネジメント）およびISO 27001（情報セキュリティマネジメント）の要件に準拠した高品質で安全なシステムを確保するためのものです。

## バージョン情報

- ドキュメントバージョン: 1.0.0
- 最終更新日: 2025年3月8日
- 対応システムバージョン: 1.0.0

## テスト目標

本テスト戦略の主な目標は以下の通りです：

1. **機能要件の検証**: すべての機能要件が正しく実装されていることを確認
2. **非機能要件の検証**: パフォーマンス、セキュリティ、可用性などの非機能要件を満たしていることを確認
3. **品質の確保**: バグやエラーを早期に発見し、修正
4. **セキュリティの確保**: セキュリティ脆弱性を特定し、対策
5. **コンプライアンスの確保**: ISO 20000/27001などの標準への準拠を確認

## テストレベル

### 1. 単体テスト（Unit Testing）

個々のコンポーネント（関数、クラス、モジュール）が期待通りに動作することを確認します。

#### 対象

- バックエンドサービス
- ユーティリティ関数
- Reactコンポーネント
- カスタムフック

#### テスト手法

- **テストフレームワーク**: Jest
- **モック/スタブ**: Jest Mock Functions, Mock Service Worker
- **カバレッジ目標**: 80%以上（ステートメント、ブランチ、関数）
- **自動化レベル**: 完全自動化（CI/CDパイプラインで実行）

#### 責任者

- 各機能の開発者

#### 例

```typescript
// UserService.test.ts
describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when user exists', async () => {
      // Arrange
      const mockUser = { id: '123', name: 'Test User' };
      const mockApiClient = {
        get: jest.fn().mockResolvedValue({ data: mockUser })
      };
      const userService = new UserService(mockApiClient as any);
      
      // Act
      const result = await userService.getUserById('123');
      
      // Assert
      expect(result).toEqual(mockUser);
      expect(mockApiClient.get).toHaveBeenCalledWith('/users/123');
    });
    
    it('should return null when user does not exist', async () => {
      // Arrange
      const mockApiClient = {
        get: jest.fn().mockRejectedValue(new Error('Not found'))
      };
      const userService = new UserService(mockApiClient as any);
      
      // Act
      const result = await userService.getUserById('456');
      
      // Assert
      expect(result).toBeNull();
      expect(mockApiClient.get).toHaveBeenCalledWith('/users/456');
    });
  });
});
```

### 2. 統合テスト（Integration Testing）

複数のコンポーネントが連携して正しく動作することを確認します。

#### 対象

- APIエンドポイント
- データベース操作
- サービス間の連携
- フロントエンド・バックエンド間の通信

#### テスト手法

- **テストフレームワーク**: Jest, Supertest
- **テスト環境**: 開発環境に近いテスト環境
- **データ**: テスト用データセット
- **自動化レベル**: 完全自動化（CI/CDパイプラインで実行）

#### 責任者

- 機能チーム
- QAエンジニア

#### 例

```typescript
// auth.integration.test.ts
describe('Auth API', () => {
  let app;
  
  beforeAll(async () => {
    app = await setupTestApp();
  });
  
  afterAll(async () => {
    await teardownTestApp();
  });
  
  describe('POST /api/auth/login', () => {
    it('should return token when credentials are valid', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
    });
    
    it('should return error when credentials are invalid', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };
      
      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);
      
      // Assert
      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid credentials');
    });
  });
});
```

### 3. エンドツーエンドテスト（E2E Testing）

実際のユーザーシナリオに基づいて、システム全体が正しく動作することを確認します。

#### 対象

- ユーザーフロー
- ビジネスプロセス
- クロスブラウザ互換性

#### テスト手法

- **テストフレームワーク**: Playwright
- **テスト環境**: ステージング環境
- **データ**: 本番に近いテストデータ
- **自動化レベル**: 主要フローは自動化、エッジケースは手動

#### 責任者

- QAエンジニア
- テスト自動化エンジニア

#### 例

```typescript
// permission-management.spec.ts
test('管理者がユーザーにパーミッションを付与できる', async ({ page }) => {
  // ログイン
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', 'adminpassword');
  await page.click('button[type="submit"]');
  
  // パーミッション管理画面に移動
  await page.click('text=パーミッション管理');
  
  // ユーザーを検索
  await page.fill('input[placeholder="ユーザー検索"]', 'user@example.com');
  await page.click('button:has-text("検索")');
  
  // パーミッション付与ダイアログを開く
  await page.click('button:has-text("パーミッション付与")');
  
  // パーミッションを選択
  await page.selectOption('select[name="permission"]', 'User.Read');
  await page.selectOption('select[name="scope"]', 'Delegated');
  
  // 付与を実行
  await page.click('button:has-text("付与")');
  
  // 確認ダイアログで確認
  await page.click('button:has-text("はい")');
  
  // 成功メッセージを確認
  await expect(page.locator('.notification')).toContainText('パーミッションが付与されました');
  
  // パーミッション一覧に追加されたことを確認
  await expect(page.locator('table')).toContainText('User.Read');
});
```

### 4. パフォーマンステスト

システムが期待されるパフォーマンス要件を満たしていることを確認します。

#### 対象

- API応答時間
- ページ読み込み時間
- 同時接続処理
- リソース使用率

#### テスト手法

- **テストツール**: k6, Lighthouse
- **テスト環境**: ステージング環境または本番に近い環境
- **シナリオ**: 通常負荷、ピーク負荷、ストレステスト
- **自動化レベル**: 自動化（定期的に実行）

#### 責任者

- パフォーマンスエンジニア
- インフラストラクチャチーム

#### 例

```javascript
// load-test.js (k6)
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 }, // 1分かけて50ユーザーまで増加
    { duration: '3m', target: 50 }, // 3分間50ユーザーを維持
    { duration: '1m', target: 0 },  // 1分かけて0ユーザーまで減少
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%のリクエストが500ms以内に完了
    http_req_failed: ['rate<0.01'],   // 失敗率1%未満
  },
};

export default function() {
  const BASE_URL = 'https://staging.example.com/api';
  
  // ログイン
  const loginRes = http.post(`${BASE_URL}/auth/login`, {
    email: 'test@example.com',
    password: 'password123',
  });
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'has token': (r) => r.json('data.token') !== '',
  });
  
  const token = loginRes.json('data.token');
  
  // システムステータス取得
  const statusRes = http.get(`${BASE_URL}/system-status/status`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  check(statusRes, {
    'status successful': (r) => r.status === 200,
    'has status data': (r) => r.json('data.status') !== undefined,
  });
  
  sleep(1);
}
```

### 5. セキュリティテスト

システムがセキュリティ要件を満たし、脆弱性がないことを確認します。

#### 対象

- 認証・認可メカニズム
- データ保護
- 入力検証
- セッション管理
- エラー処理

#### テスト手法

- **静的解析**: SonarQube, OWASP Dependency Check
- **動的解析**: OWASP ZAP, Burp Suite
- **ペネトレーションテスト**: 専門チームによる手動テスト
- **自動化レベル**: 静的解析と基本的な動的解析は自動化、高度なテストは手動

#### 責任者

- セキュリティエンジニア
- 外部セキュリティ専門家

#### 例

```yaml
# セキュリティスキャンワークフロー (GitHub Actions)
name: Security Scan

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    - cron: '0 0 * * 0'  # 毎週日曜日に実行

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'IT運用システム'
          path: '.'
          format: 'HTML'
          out: 'reports'
      
      - name: Run SonarQube Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
      
      - name: Run ZAP Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'https://staging.example.com'
```

## テスト環境

### 1. 開発環境

- **目的**: 開発中の機能テスト
- **構成**: 開発者のローカル環境
- **データ**: モックデータまたは開発用データセット
- **アクセス**: 開発チームのみ

### 2. テスト環境

- **目的**: 統合テスト、QAテスト
- **構成**: 開発環境と同様の構成
- **データ**: テスト用データセット（本番データの匿名化版）
- **アクセス**: 開発チーム、QAチーム

### 3. ステージング環境

- **目的**: E2Eテスト、パフォーマンステスト、UAT
- **構成**: 本番環境と同様の構成
- **データ**: 本番に近いテストデータ
- **アクセス**: 開発チーム、QAチーム、ステークホルダー

### 4. 本番環境

- **目的**: 実運用
- **構成**: 高可用性構成
- **データ**: 実データ
- **アクセス**: 認証済みユーザー、運用チーム

## テスト自動化戦略

### 自動化の範囲

- **単体テスト**: 100%自動化
- **統合テスト**: 90%以上自動化
- **E2Eテスト**: 主要フロー（80%）を自動化
- **パフォーマンステスト**: 基本シナリオを自動化
- **セキュリティテスト**: 静的解析と基本的な動的解析を自動化

### 自動化ツール

| テストタイプ | ツール | 用途 |
|------------|------|------|
| 単体テスト | Jest | JavaScript/TypeScriptのテスト |
| 統合テスト | Jest, Supertest | APIテスト |
| E2Eテスト | Playwright | ブラウザ自動化 |
| パフォーマンステスト | k6, Lighthouse | 負荷テスト、フロントエンドパフォーマンス |
| セキュリティテスト | SonarQube, OWASP ZAP | 静的解析、動的スキャン |

### CI/CD統合

- **プルリクエスト**: 単体テスト、統合テスト、静的解析を実行
- **開発ブランチマージ**: E2Eテストの一部を実行
- **リリース前**: 完全なE2Eテスト、パフォーマンステスト、セキュリティテストを実行
- **定期的**: 週次でセキュリティスキャンを実行

## テスト管理

### テスト計画

- 各リリースサイクルの開始時にテスト計画を作成
- テスト範囲、スケジュール、リソース、リスクを定義
- ステークホルダーの承認を得る

### テスト実行

- テスト実行の進捗を追跡
- 障害を記録し、優先順位付け
- 日次テスト状況レポートを作成

### テスト成果物

- テスト計画書
- テストケース
- テスト実行レポート
- 障害レポート
- テスト要約レポート

## ITSMプロセスとの統合

ISO 20000に準拠したITサービスマネジメントプロセスとの統合：

### 1. 変更管理

- テスト結果は変更管理プロセスの一部として記録
- 変更実装前のテスト結果を変更諮問委員会（CAB）に提出
- 変更後の検証テストを実施

### 2. リリース管理

- リリース計画にテスト活動を含める
- リリース判定基準にテスト合格基準を含める
- リリース後のテスト結果を評価

### 3. インシデント管理

- テスト中に発見された重大な問題はインシデントとして記録
- 本番環境のインシデントに対する回帰テストを実施
- インシデント解決後の検証テストを実施

### 4. 問題管理

- 繰り返し発生する問題の根本原因分析にテスト結果を活用
- 問題解決策の有効性を検証するためのテストを実施
- テスト結果を問題管理データベースに記録

## セキュリティテスト要件

ISO 27001に準拠したセキュリティテスト要件：

### 1. 脆弱性管理

- 定期的な脆弱性スキャンを実施
- 発見された脆弱性を重要度に基づいて分類
- 修正計画を策定し、実施

### 2. セキュリティ検証

- 認証メカニズムのテスト
- アクセス制御のテスト
- 入力検証のテスト
- セッション管理のテスト
- 暗号化実装のテスト

### 3. セキュリティ監査

- セキュリティ設定の監査
- ログ記録と監視の検証
- セキュリティポリシー遵守の確認
- セキュリティインシデント対応手順の検証

## 付録

### テストケース例

#### 単体テスト例

```typescript
// permissionService.test.ts
describe('PermissionService', () => {
  describe('hasPermission', () => {
    it('should return true when user has the permission', async () => {
      // Arrange
      const mockDb = {
        get: jest.fn().mockResolvedValue({ permission: 'User.Read' })
      };
      const service = new PermissionService(mockDb as any);
      
      // Act
      const result = await service.hasPermission('user@example.com', 'User.Read');
      
      // Assert
      expect(result).toBe(true);
    });
    
    it('should return false when user does not have the permission', async () => {
      // Arrange
      const mockDb = {
        get: jest.fn().mockResolvedValue(null)
      };
      const service = new PermissionService(mockDb as any);
      
      // Act
      const result = await service.hasPermission('user@example.com', 'User.Read');
      
      // Assert
      expect(result).toBe(false);
    });
  });
});
```

#### E2Eテスト例

```typescript
// security-alerts.spec.ts
test('セキュリティアラートの確認と解決', async ({ page }) => {
  // 管理者としてログイン
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', 'adminpassword');
  await page.click('button[type="submit"]');
  
  // セキュリティアラート画面に移動
  await page.click('text=セキュリティアラート');
  
  // アクティブなアラートがあることを確認
  await expect(page.locator('.alert-card')).toBeVisible();
  
  // 最初のアラートの詳細を表示
  await page.click('.alert-card:first-child button:has-text("詳細")');
  
  // アラート詳細が表示されることを確認
  await expect(page.locator('.alert-details')).toBeVisible();
  
  // アラートを確認済みにする
  await page.click('button:has-text("確認済みにする")');
  await page.fill('textarea[name="comment"]', 'テスト用コメント');
  await page.click('button:has-text("確認")');
  
  // 成功メッセージを確認
  await expect(page.locator('.notification')).toContainText('アラートを確認済みにしました');
  
  // アラートのステータスが変更されたことを確認
  await expect(page.locator('.alert-card:first-child .status-badge')).toContainText('確認済み');
});
```

### 参考リソース

- [Jest ドキュメント](https://jestjs.io/docs/getting-started)
- [Playwright ドキュメント](https://playwright.dev/docs/intro)
- [k6 ドキュメント](https://k6.io/docs/)
- [OWASP テストガイド](https://owasp.org/www-project-web-security-testing-guide/)
- [ISO 20000 ガイドライン](https://www.iso.org/standard/70636.html)
- [ISO 27001 ガイドライン](https://www.iso.org/standard/27001)

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2025-03-08 | 1.0.0 | 初版リリース |