import path from 'path';
import fs from 'fs/promises';
import { execSync } from 'child_process';
import { SQLiteService } from '../services/sqliteService';
import LoggingService from '../services/loggingService';
import { NotificationService } from '../services/notificationService';

const logger = LoggingService.getInstance();
const sqlite = SQLiteService.getInstance();
const notificationService = NotificationService.getInstance();

const BACKUP_DIR = path.join(__dirname, '../../backups');
const BACKUP_RETENTION_DAYS = 30;

async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    logger.logError(error as Error, {
      context: 'AutoBackup',
      message: 'Failed to create backup directory'
    });
    throw error;
  }
}

async function createBackup() {
  const date = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `audit_db_${date}.bak`);

  try {
    // データベースのバックアップ作成
    await sqlite.run('BEGIN IMMEDIATE');
    await fs.copyFile(
      path.join(__dirname, '../../database.sqlite'),
      backupFile
    );
    await sqlite.run('COMMIT');

    // バックアップの暗号化
    execSync(`openssl enc -aes-256-cbc -salt -in ${backupFile} -out ${backupFile}.enc -pass file:${path.join(__dirname, '../../.backup_key')}`);
    await fs.unlink(backupFile);

    // チェックサムの作成
    execSync(`sha256sum ${backupFile}.enc > ${backupFile}.enc.sha256`);

    logger.logInfo({
      message: 'Database backup created successfully',
      backupFile: backupFile + '.enc'
    });

    return backupFile + '.enc';
  } catch (error) {
    await sqlite.run('ROLLBACK');
    logger.logError(error as Error, {
      context: 'AutoBackup',
      message: 'Backup creation failed',
      backupFile
    });
    throw error;
  }
}

async function removeOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filePath);
      const age = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

      if (age > BACKUP_RETENTION_DAYS) {
        await fs.unlink(filePath);
        logger.logInfo({
          message: 'Old backup removed',
          file: filePath
        });
      }
    }
  } catch (error) {
    logger.logError(error as Error, {
      context: 'AutoBackup',
      message: 'Failed to remove old backups'
    });
  }
}

async function verifyBackup(backupFile: string) {
  try {
    // チェックサムの検証
    execSync(`sha256sum -c ${backupFile}.sha256`);

    // テスト用データベースへの復元テスト
    const testDbFile = backupFile + '.test.db';
    execSync(`openssl enc -d -aes-256-cbc -in ${backupFile} -out ${testDbFile} -pass file:${path.join(__dirname, '../../.backup_key')}`);

    // テストデータベースでの整合性チェック
    const testDb = new SQLiteService(testDbFile);
    await testDb.run('PRAGMA integrity_check');
    await testDb.close();
    await fs.unlink(testDbFile);

    logger.logInfo({
      message: 'Backup verification successful',
      backupFile
    });

    return true;
  } catch (error) {
    logger.logError(error as Error, {
      context: 'AutoBackup',
      message: 'Backup verification failed',
      backupFile
    });
    return false;
  }
}

async function notifyBackupStatus(success: boolean, backupFile?: string) {
  try {
    await notificationService.sendNotification({
      userId: 'system',
      userEmail: 'admin@example.com',
      title: `データベースバックアップ ${success ? '成功' : '失敗'}`,
      body: success
        ? `バックアップが正常に作成されました: ${backupFile}`
        : 'バックアップの作成に失敗しました。ログを確認してください。',
      type: 'system',
      priority: success ? 'low' : 'high'
    });
  } catch (error) {
    logger.logError(error as Error, {
      context: 'AutoBackup',
      message: 'Failed to send backup notification'
    });
  }
}

export async function runBackup() {
  try {
    await ensureBackupDir();
    const backupFile = await createBackup();
    const verified = await verifyBackup(backupFile);
    await notifyBackupStatus(verified, backupFile);
    await removeOldBackups();
  } catch (error) {
    await notifyBackupStatus(false);
    throw error;
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  runBackup().catch(error => {
    console.error('Backup failed:', error);
    process.exit(1);
  });
}