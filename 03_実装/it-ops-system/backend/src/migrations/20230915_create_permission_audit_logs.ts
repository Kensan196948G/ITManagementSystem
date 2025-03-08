import { SQLiteService } from '../services/sqliteService';
import LoggingService from '../services/loggingService';

const logger = LoggingService.getInstance();

export async function up(db?: SQLiteService): Promise<void> {
  // dbが渡されていない場合は取得する
  if (!db) {
    db = await SQLiteService.getInstance();
  }
  
  try {
    // 権限変更履歴テーブル作成
    await db.run(`
      CREATE TABLE IF NOT EXISTS permission_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_email TEXT NOT NULL,
        target_user_email TEXT NOT NULL,
        action_type TEXT NOT NULL,
        resource TEXT NOT NULL,
        permission TEXT NOT NULL,
        previous_value TEXT,
        new_value TEXT,
        reason TEXT,
        ip_address TEXT,
        user_agent TEXT,
        success INTEGER DEFAULT 1,
        additional_info TEXT
      )
    `);

    // インデックス作成
    await db.run(`CREATE INDEX IF NOT EXISTS idx_permission_audit_timestamp ON permission_audit_logs(timestamp)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_permission_audit_actor ON permission_audit_logs(actor_email)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_permission_audit_target ON permission_audit_logs(target_user_email)`);

    // 権限変更通知設定テーブル作成
    await db.run(`
      CREATE TABLE IF NOT EXISTS permission_notification_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        notify_on_permission_change INTEGER DEFAULT 1,
        notify_on_role_change INTEGER DEFAULT 1,
        notify_on_admin_action INTEGER DEFAULT 1,
        notify_channels TEXT DEFAULT '["email"]',
        UNIQUE(user_email)
      )
    `);

    // グローバル管理者向け権限レビューリクエストテーブル作成
    await db.run(`
      CREATE TABLE IF NOT EXISTS permission_review_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        requester_email TEXT NOT NULL,
        reviewer_email TEXT,
        status TEXT DEFAULT 'pending',
        resource TEXT NOT NULL,
        permission TEXT NOT NULL,
        target_user_email TEXT NOT NULL,
        requested_action TEXT NOT NULL,
        justification TEXT,
        reviewed_at TEXT,
        review_comment TEXT,
        review_decision TEXT
      )
    `);

    logger.logInfo({
      message: 'Migration: 権限監査ログテーブルが作成されました'
    });
  } catch (error) {
    logger.logError(error as Error, {
      context: 'Migration',
      message: '権限監査ログテーブル作成中にエラーが発生しました'
    });
    throw error;
  }
}

export async function down(db?: SQLiteService): Promise<void> {
  // dbが渡されていない場合は取得する
  if (!db) {
    db = await SQLiteService.getInstance();
  }
  
  try {
    await db.run(`DROP TABLE IF EXISTS permission_audit_logs`);
    await db.run(`DROP TABLE IF EXISTS permission_notification_settings`);
    await db.run(`DROP TABLE IF EXISTS permission_review_requests`);
    
    logger.logInfo({
      message: 'Migration: 権限監査ログテーブルが削除されました'
    });
  } catch (error) {
    logger.logError(error as Error, {
      context: 'Migration',
      message: '権限監査ログテーブル削除中にエラーが発生しました'
    });
    throw error;
  }
}