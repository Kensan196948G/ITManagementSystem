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

interface RecoveryResult {
  success: boolean;
  message: string;
  recoveryTime?: number;
}

async function findLatestValidBackup(): Promise<string | null> {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter(f => f.endsWith('.enc'))
      .map(f => path.join(BACKUP_DIR, f))
      .sort()
      .reverse();

    for (const backupFile of backupFiles) {
      // チェックサムの検証
      try {
        execSync(`sha256sum -c ${backupFile}.sha256`);
        return backupFile;
      } catch (error) {
        logger.logWarning({
          message: 'Backup verification failed, trying next backup',
          backupFile
        });
        continue;
      }
    }

    return null;
  } catch (error) {
    logger.logError(error as Error, {
      context: 'AutoRecover',
      message: 'Failed to find valid backup'
    });
    return null;
  }
}

async function verifyDatabaseIntegrity(): Promise<boolean> {
  try {
    const result = await sqlite.get('PRAGMA integrity_check');
    return result.integrity_check === 'ok';
  } catch (error) {
    logger.logError(error as Error, {
      context: 'AutoRecover',
      message: 'Database integrity check failed'
    });
    return false;
  }
}

async function restoreFromBackup(backupFile: string): Promise<boolean> {
  const tempDb = backupFile + '.temp.db';

  try {
    // バックアップの復号化
    execSync(`openssl enc -d -aes-256-cbc -in ${backupFile} -out ${tempDb} -pass file:${path.join(__dirname, '../../.backup_key')}`);

    // 現在のデータベースのバックアップ
    const currentDb = path.join(__dirname, '../../database.sqlite');
    const currentBackup = currentDb + '.bak';
    await fs.copyFile(currentDb, currentBackup);

    // データベースの復元
    await sqlite.close();
    await fs.copyFile(tempDb, currentDb);
    await sqlite.open();

    // 整合性チェック
    if (await verifyDatabaseIntegrity()) {
      await fs.unlink(currentBackup);
      await fs.unlink(tempDb);
      return true;
    } else {
      // 復元が失敗した場合は元に戻す
      await sqlite.close();
      await fs.copyFile(currentBackup, currentDb);
      await sqlite.open();
      await fs.unlink(currentBackup);
      await fs.unlink(tempDb);
      return false;
    }
  } catch (error) {
    logger.logError(error as Error, {
      context: 'AutoRecover',
      message: 'Failed to restore from backup',
      backupFile
    });
    return false;
  }
}

async function repairDatabase(): Promise<boolean> {
  try {
    // データベースの最適化を試みる
    await sqlite.run('VACUUM');
    await sqlite.run('REINDEX');
    
    // インデックスの再構築
    await sqlite.run('REINDEX permission_audit');
    await sqlite.run('REINDEX permission_audit_reviews');
    await sqlite.run('REINDEX audit_metrics');

    return await verifyDatabaseIntegrity();
  } catch (error) {
    logger.logError(error as Error, {
      context: 'AutoRecover',
      message: 'Database repair failed'
    });
    return false;
  }
}

async function notifyRecoveryStatus(result: RecoveryResult): Promise<void> {
  try {
    await notificationService.sendNotification({
      userId: 'system',
      userEmail: 'admin@example.com',
      title: `データベース復旧 ${result.success ? '成功' : '失敗'}`,
      body: `
        復旧結果: ${result.message}
        ${result.recoveryTime ? `所要時間: ${result.recoveryTime}ms` : ''}
      `,
      type: 'system',
      priority: result.success ? 'medium' : 'high'
    });
  } catch (error) {
    logger.logError(error as Error, {
      context: 'AutoRecover',
      message: 'Failed to send recovery notification'
    });
  }
}

export async function runRecovery(): Promise<RecoveryResult> {
  const startTime = Date.now();

  try {
    // データベースの健全性チェック
    if (await verifyDatabaseIntegrity()) {
      return {
        success: true,
        message: 'データベースは正常です',
        recoveryTime: Date.now() - startTime
      };
    }

    // データベースの修復を試みる
    logger.logInfo({ message: 'Attempting database repair' });
    if (await repairDatabase()) {
      return {
        success: true,
        message: 'データベースの修復に成功しました',
        recoveryTime: Date.now() - startTime
      };
    }

    // 修復が失敗した場合はバックアップから復元
    logger.logInfo({ message: 'Attempting restore from backup' });
    const latestBackup = await findLatestValidBackup();
    if (!latestBackup) {
      return {
        success: false,
        message: '有効なバックアップが見つかりません',
        recoveryTime: Date.now() - startTime
      };
    }

    if (await restoreFromBackup(latestBackup)) {
      return {
        success: true,
        message: `バックアップからの復元に成功しました: ${latestBackup}`,
        recoveryTime: Date.now() - startTime
      };
    }

    return {
      success: false,
      message: 'すべての復旧処理に失敗しました',
      recoveryTime: Date.now() - startTime
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '不明なエラーが発生しました';
    return {
      success: false,
      message: `復旧処理中にエラーが発生しました: ${message}`,
      recoveryTime: Date.now() - startTime
    };
  }
}

export async function executeRecovery(): Promise<void> {
  const result = await runRecovery();
  await notifyRecoveryStatus(result);

  if (!result.success) {
    throw new Error(result.message);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  executeRecovery().catch(error => {
    console.error('Recovery failed:', error);
    process.exit(1);
  });
}