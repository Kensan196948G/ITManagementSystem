import { Page } from '@playwright/test';
import { SQLiteService } from '../backend/src/services/sqliteService';
import { RedisService } from '../backend/src/services/redisService';

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button:has-text("ログイン")');
  await page.waitForURL('/dashboard');
}

export async function seedTestData(): Promise<void> {
  const sqlite = SQLiteService.getInstance();
  const redis = RedisService.getInstance();

  // テスト用のデータベースを初期化
  await sqlite.exec(`
    DELETE FROM permission_audit;
    DELETE FROM audit_reviews;
    DELETE FROM audit_metrics;
  `);

  // テスト用の監査データを投入
  const testData = generateTestAuditData();
  for (const record of testData) {
    await sqlite.run(`
      INSERT INTO permission_audit (
        timestamp, actor_id, actor_email, target_id, target_email,
        action, resource_type, resource_name, permission_before, permission_after
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      record.timestamp,
      record.actorId,
      record.actorEmail,
      record.targetId,
      record.targetEmail,
      record.action,
      record.resourceType,
      record.resourceName,
      record.permissionBefore,
      record.permissionAfter
    ]);
  }

  // テスト用のレビューデータを投入
  const reviews = generateTestReviewData();
  for (const review of reviews) {
    await sqlite.run(`
      INSERT INTO audit_reviews (
        record_id, reviewer_id, reviewer_email, approved,
        review_timestamp, comments
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      review.recordId,
      review.reviewerId,
      review.reviewerEmail,
      review.approved,
      review.timestamp,
      review.comments
    ]);
  }

  // Redisのテストデータをクリア
  await redis.delete('audit:*');
}

function generateTestAuditData() {
  const now = Date.now();
  const data = [];

  const actions = ['add', 'remove', 'modify'];
  const resourceTypes = ['role', 'permission', 'group'];
  const users = [
    { id: 'admin1', email: 'admin@example.com' },
    { id: 'user1', email: 'user1@example.com' },
    { id: 'user2', email: 'user2@example.com' }
  ];

  // 10件のテストデータを生成
  for (let i = 0; i < 10; i++) {
    const actor = users[i % users.length];
    const target = users[(i + 1) % users.length];
    
    data.push({
      timestamp: now - (i * 86400000), // 1日ずつ過去に
      actorId: actor.id,
      actorEmail: actor.email,
      targetId: target.id,
      targetEmail: target.email,
      action: actions[i % actions.length],
      resourceType: resourceTypes[i % resourceTypes.length],
      resourceName: `test-resource-${i}`,
      permissionBefore: JSON.stringify({ level: i }),
      permissionAfter: JSON.stringify({ level: i + 1 })
    });
  }

  return data;
}

function generateTestReviewData() {
  const now = Date.now();
  const reviews = [];

  // レビュー待ちのデータを生成
  for (let i = 1; i <= 5; i++) {
    reviews.push({
      recordId: i,
      reviewerId: i % 2 === 0 ? 'admin1' : 'admin2',
      reviewerEmail: i % 2 === 0 ? 'admin1@example.com' : 'admin2@example.com',
      approved: i % 3 === 0,
      timestamp: now - (i * 3600000), // 1時間ずつ過去に
      comments: `Review comment ${i}`
    });
  }

  return reviews;
}

export async function clearTestData(): Promise<void> {
  const sqlite = SQLiteService.getInstance();
  const redis = RedisService.getInstance();

  await sqlite.exec(`
    DELETE FROM permission_audit;
    DELETE FROM audit_reviews;
    DELETE FROM audit_metrics;
  `);

  await redis.delete('audit:*');
}