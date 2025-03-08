# コーディング規約

## 概要

本ドキュメントは、IT運用システムの開発におけるコーディング規約を定義します。この規約は、ISO 20000（ITサービスマネジメント）およびISO 27001（情報セキュリティマネジメント）の要件に準拠した高品質で安全なコードを作成するための指針です。

## バージョン情報

- ドキュメントバージョン: 1.0.0
- 最終更新日: 2025年3月8日
- 対応システムバージョン: 1.0.0

## 一般原則

### 1. 可読性

- コードは自己文書化を目指し、意図が明確であること
- 複雑なロジックには適切なコメントを追加
- 命名規則を一貫して適用
- 深いネストを避け、早期リターンを活用

### 2. 保守性

- 単一責任の原則に従い、各関数・クラスは一つの責務のみを持つ
- コードの重複を避け、再利用可能なコンポーネントを作成
- 依存関係を明示的にし、疎結合を維持
- テスト容易性を考慮した設計

### 3. セキュリティ

- OWASP Top 10に対応したセキュアコーディングプラクティスに従う
- 入力データは常に検証し、信頼しない
- 機密情報はコードに直接記述せず、環境変数または適切な秘密管理を使用
- 最小権限の原則に従い、必要最小限のアクセス権限で実装

### 4. パフォーマンス

- 不必要な計算やデータベースアクセスを避ける
- 大量データの処理には適切なページネーションを使用
- リソースを適切に解放し、メモリリークを防止
- ボトルネックとなる可能性のある処理を特定し最適化

## 言語別コーディング規約

### TypeScript/JavaScript

#### 命名規則

- **変数・関数**: キャメルケース（例: `userName`, `calculateTotal`）
- **クラス・インターフェース**: パスカルケース（例: `UserService`, `ApiResponse`）
- **定数**: 大文字のスネークケース（例: `MAX_RETRY_COUNT`, `API_BASE_URL`）
- **プライベートメンバー**: アンダースコア接頭辞（例: `_privateVariable`）
- **型・インターフェース**: 接頭辞なし、明確な名前（例: `User`, `ApiResponse`）

#### 構文規則

- セミコロンを使用して文を終了
- 単一引用符（'）を文字列に使用
- テンプレートリテラルを複雑な文字列連結に使用
- アロー関数を匿名関数に使用
- `const`/`let`を使用し、`var`は使用しない
- 非同期処理には`async`/`await`を優先的に使用

#### TypeScript固有

- 明示的な型定義を使用（`any`型の使用を最小限に）
- インターフェースを使用してオブジェクト構造を定義
- ジェネリクスを適切に活用
- `null`と`undefined`の区別を明確に
- 厳格な型チェック（`strict: true`）を有効化

#### 例

```typescript
// 良い例
interface UserProfile {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

class UserService {
  private _apiClient: ApiClient;
  
  constructor(apiClient: ApiClient) {
    this._apiClient = apiClient;
  }
  
  public async getUserById(id: string): Promise<UserProfile | null> {
    try {
      const response = await this._apiClient.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch user with ID ${id}:`, error);
      return null;
    }
  }
}

// 悪い例
class userSrvc {
  apiClnt;
  
  constructor(apiClnt) {
    this.apiClnt = apiClnt;
  }
  
  getUsr(id) {
    return this.apiClnt.get('/users/' + id)
      .then(r => r.data)
      .catch(e => {
        console.log('err', e);
        return null;
      });
  }
}
```

### SQL

#### 命名規則

- **テーブル名**: 複数形、スネークケース（例: `users`, `audit_logs`）
- **カラム名**: 単数形、スネークケース（例: `first_name`, `created_at`）
- **主キー**: `id`または`{テーブル名}_id`
- **外部キー**: `{参照テーブル名}_id`
- **インデックス**: `idx_{テーブル名}_{カラム名}`

#### 構文規則

- SQLキーワードは大文字（例: `SELECT`, `FROM`, `WHERE`）
- 複雑なクエリは適切に改行とインデントを使用
- 列名とテーブル名は常に明示的に指定
- ワイルドカード（`*`）の使用を避け、必要な列のみを選択
- パラメータ化クエリを使用し、SQLインジェクションを防止

#### 例

```sql
-- 良い例
SELECT 
  u.id, 
  u.first_name, 
  u.last_name, 
  u.email,
  p.permission_name
FROM users u
JOIN user_permissions up ON u.id = up.user_id
JOIN permissions p ON up.permission_id = p.id
WHERE u.is_active = true
  AND p.permission_name LIKE 'graph_%'
ORDER BY u.last_name, u.first_name;

-- 悪い例
SELECT * FROM users, user_permissions, permissions
WHERE users.id = user_permissions.user_id
AND user_permissions.permission_id = permissions.id
AND users.is_active = true
AND permissions.permission_name LIKE 'graph_%';
```

### HTML/CSS

#### HTML規則

- HTML5ドキュメントタイプを使用
- 適切なセマンティックタグを使用（`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`など）
- アクセシビリティ属性を適切に使用（`aria-*`, `role`, `alt`など）
- インデントは2スペース
- 自己閉じタグには末尾のスラッシュを使用しない（例: `<img src="..." alt="...">`）

#### CSS規則

- クラス名はBEM（Block Element Modifier）方式を使用
- ユニットはremまたはemを優先（固定サイズが必要な場合を除く）
- メディアクエリを使用してレスポンシブデザインを実装
- CSSプリプロセッサ（SASS）を使用する場合は変数とミックスインを活用
- ベンダープレフィックスはAutoprefixerで自動化

#### 例

```html
<!-- 良い例 -->
<article class="card">
  <header class="card__header">
    <h2 class="card__title">タイトル</h2>
  </header>
  <div class="card__content">
    <p>コンテンツ</p>
    <img src="image.jpg" alt="説明的な代替テキスト" class="card__image">
  </div>
  <footer class="card__footer">
    <button class="button button--primary" aria-label="詳細を見る">詳細</button>
  </footer>
</article>

<!-- 悪い例 -->
<div class="box">
  <div class="top">
    <h2>タイトル</h2>
  </div>
  <div class="middle">
    <p>コンテンツ</p>
    <img src="image.jpg">
  </div>
  <div class="bottom">
    <button onclick="showDetails()">詳細</button>
  </div>
</div>
```

```css
/* 良い例 */
.card {
  border-radius: 0.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.card__header {
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.card__title {
  font-size: 1.25rem;
  margin: 0;
}

/* 悪い例 */
.box {
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
}

.top {
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.top h2 {
  font-size: 20px;
  margin: 0;
}
```

## コード品質管理

### 静的解析ツール

以下の静的解析ツールを使用してコード品質を維持します：

- **ESLint**: JavaScript/TypeScriptコードの品質チェック
- **Prettier**: コードフォーマット
- **TypeScript Compiler**: 型チェック
- **SonarQube**: コード品質とセキュリティの包括的分析

### コードレビュー

コードレビューでは以下の点を確認します：

1. コーディング規約への準拠
2. 機能要件の充足
3. セキュリティ上の問題
4. パフォーマンスの考慮
5. テストの適切性
6. ドキュメントの充実度

### 自動テスト

以下のテストを実装し、継続的に実行します：

- **単体テスト**: 個々の関数・クラスの機能テスト
- **統合テスト**: コンポーネント間の連携テスト
- **E2Eテスト**: エンドツーエンドのユーザーフロー
- **セキュリティテスト**: 脆弱性スキャン
- **パフォーマンステスト**: 負荷テストとボトルネック特定

## セキュアコーディングプラクティス

ISO 27001に準拠したセキュアコーディングプラクティス：

### 1. 入力検証

- すべてのユーザー入力を検証
- サーバーサイドでの検証を必ず実施（クライアントサイド検証は補助的）
- 入力の型、長さ、形式、範囲を検証
- ホワイトリストアプローチを使用（許可されたものだけを受け入れる）

### 2. 出力エンコーディング

- XSS攻撃を防ぐためにHTMLコンテキストに応じた適切なエンコーディングを使用
- React等のフレームワークのエスケープ機能を活用
- JSONデータを返す際は適切なContent-Typeヘッダーを設定

### 3. 認証と認可

- 認証と認可を明確に分離
- 最小権限の原則に従い、必要最小限のアクセス権限を付与
- セッション管理を適切に実装（タイムアウト、無効化など）
- 多要素認証を可能な限り実装

### 4. 機密データ保護

- 機密データは転送中と保存中に暗号化
- パスワードはハッシュ化して保存（bcryptなどの強力なアルゴリズムを使用）
- APIキーやシークレットはコードにハードコーディングせず、環境変数または適切な秘密管理を使用
- 不要な機密データは速やかに削除

### 5. エラー処理とロギング

- 詳細なエラーメッセージをユーザーに表示しない
- すべてのエラーを適切に捕捉し、ログに記録
- センシティブ情報をログに記録しない
- ログの完全性と機密性を確保

## ITSMプロセスとの統合

ISO 20000に準拠したITサービスマネジメントプロセスとの統合：

### 1. 変更管理

- コード変更は変更管理プロセスに従って実施
- 変更の影響範囲を文書化
- 変更前後のテストを実施
- ロールバック計画を準備

### 2. リリース管理

- リリースノートを作成し、変更内容を明確に記録
- リリース前のテスト環境での検証
- 段階的なデプロイメント戦略
- リリース後の監視と検証

### 3. 構成管理

- コードはバージョン管理システム（Git）で管理
- 環境ごとの構成情報を文書化
- 依存関係を明示的に管理
- 構成項目の変更を追跡

### 4. インシデント管理

- バグ報告プロセスを確立
- 優先度と影響度に基づく対応
- 根本原因分析と再発防止策
- インシデント対応の文書化

## 付録

### コードスニペットとベストプラクティス

#### 非同期処理

```typescript
// 良い例: async/awaitを使用
async function fetchUserData(userId: string): Promise<UserData | null> {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch user data for ${userId}`, error);
    return null;
  }
}

// 悪い例: ネストされたコールバック
function fetchUserData(userId, callback) {
  api.get('/users/' + userId, function(err, response) {
    if (err) {
      console.log('Error:', err);
      callback(null);
      return;
    }
    callback(response.data);
  });
}
```

#### エラー処理

```typescript
// 良い例: 構造化されたエラー処理
class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchData(): Promise<Data> {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(
        error.response.status,
        `API request failed: ${error.message}`,
        error.response.data
      );
    }
    throw new Error(`Unknown error: ${error.message}`);
  }
}

// 悪い例: 不十分なエラー処理
async function fetchData() {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    console.error('Error:', error);
    return null; // エラー情報が失われる
  }
}
```

### 参考リソース

- [TypeScript公式ドキュメント](https://www.typescriptlang.org/docs)
- [React公式ドキュメント](https://reactjs.org/docs)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [ISO 20000 ガイドライン](https://www.iso.org/standard/70636.html)
- [ISO 27001 ガイドライン](https://www.iso.org/standard/27001)

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2025-03-08 | 1.0.0 | 初版リリース |