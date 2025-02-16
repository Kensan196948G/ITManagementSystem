# テスト実装ガイド

## テスト環境のセットアップ

### 必要な依存関係のインストール

```bash
# バックエンド
cd backend
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
npm install --save-dev mongodb-memory-server redis-memory-server

# フロントエンド
cd ../frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev jest @types/jest ts-jest
```

## テストの実行

### バックエンドテスト

```bash
cd backend

# 全てのテストを実行
npm test

# 特定のテストファイルを実行
npm test auth.test.ts
npm test monitoring.test.ts

# ウォッチモードでテストを実行
npm test -- --watch

# カバレッジレポートを生成
npm test -- --coverage
```

### フロントエンドテスト

```bash
cd frontend

# 全てのテストを実行
npm test

# 特定のコンポーネントのテストを実行
npm test Dashboard.test.tsx
npm test MetricsChart.test.tsx

# ウォッチモードでテストを実行
npm test -- --watch

# カバレッジレポートを生成
npm test -- --coverage
```

## テストカバレッジの要件

### バックエンド
- 全体のカバレッジ: 80%以上
- 重要なビジネスロジック: 90%以上
- API エンドポイント: 100%

### フロントエンド
- コンポーネント: 80%以上
- ユーティリティ関数: 90%以上
- ルーティング: 100%

## テスト実装のガイドライン

### バックエンドテスト
1. ユニットテスト
   - 各関数の独立したテスト
   - エッジケースの考慮
   - モックの適切な使用

2. 統合テスト
   - API エンドポイントのテスト
   - データベース操作のテスト
   - 外部サービス連携のテスト

3. E2Eテスト
   - 主要なユースケースのフロー確認
   - エラーハンドリングの確認

### フロントエンドテスト
1. コンポーネントテスト
   - レンダリングの確認
   - ユーザー操作の確認
   - プロップスとステートの検証

2. ユニットテスト
   - ユーティリティ関数のテスト
   - カスタムフックのテスト

3. 統合テスト
   - コンポーネント間の連携確認
   - APIとの連携確認

## モックの使用

### バックエンド
```typescript
// データベースのモック
jest.mock('../database', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
}));

// 外部APIのモック
jest.mock('../services/external-api', () => ({
  fetchData: jest.fn(),
}));
```

### フロントエンド
```typescript
// APIクライアントのモック
jest.mock('../services/api', () => ({
  getMetrics: jest.fn(),
  getAlerts: jest.fn(),
}));

// コンポーネントのモック
jest.mock('./SubComponent', () => ({
  __esModule: true,
  default: () => <div>Mocked Component</div>,
}));
```

## テストデータの管理

### テストデータの配置
```
tests/
├── fixtures/          # テストデータ
├── mocks/            # モックオブジェクト
└── helpers/          # テストヘルパー関数
```

### テストデータの例
```typescript
// fixtures/metrics.ts
export const mockMetrics = {
  cpu: { usage: 45.5, temperature: 65 },
  memory: { total: 16384, used: 8192, free: 8192 },
  // ...
};
```

## テスト実行の自動化

### CI/CD パイプラインでのテスト
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: |
          npm ci
          cd frontend && npm ci
          cd ../backend && npm ci
      - name: Run tests
        run: |
          cd frontend && npm test -- --coverage
          cd ../backend && npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## トラブルシューティング

### よくある問題と解決方法

1. テストの実行が遅い
   - Jest の --maxWorkers オプションを調整
   - テストの並列実行を検討

2. モックの問題
   - jest.clearAllMocks() の適切な使用
   - モックのスコープの確認

3. 非同期テストの失敗
   - await の使用確認
   - タイムアウトの設定確認

### デバッグ方法

```bash
# デバッグモードでテストを実行
npm test -- --debug

# 特定のテストのみを実行
npm test -- -t "test name"

# テストカバレッジの詳細を確認
npm test -- --coverage --verbose