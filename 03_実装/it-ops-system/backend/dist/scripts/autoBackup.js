"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBackup = runBackup;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const child_process_1 = require("child_process");
const sqliteService_1 = require("../services/sqliteService");
const loggingService_1 = __importDefault(require("../services/loggingService"));
const notificationService_1 = require("../services/notificationService");
const logger = loggingService_1.default.getInstance();
const sqlite = sqliteService_1.SQLiteService.getInstance();
const notificationService = notificationService_1.NotificationService.getInstance();
const BACKUP_DIR = path_1.default.join(__dirname, '../../backups');
const BACKUP_RETENTION_DAYS = 30;
async function ensureBackupDir() {
    try {
        await promises_1.default.mkdir(BACKUP_DIR, { recursive: true });
    }
    catch (error) {
        logger.logError(error, {
            context: 'AutoBackup',
            message: 'Failed to create backup directory'
        });
        throw error;
    }
}
async function createBackup() {
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path_1.default.join(BACKUP_DIR, `audit_db_${date}.bak`);
    try {
        // データベースのバックアップ作成
        await sqlite.run('BEGIN IMMEDIATE');
        await promises_1.default.copyFile(path_1.default.join(__dirname, '../../database.sqlite'), backupFile);
        await sqlite.run('COMMIT');
        // バックアップの暗号化
        (0, child_process_1.execSync)(`openssl enc -aes-256-cbc -salt -in ${backupFile} -out ${backupFile}.enc -pass file:${path_1.default.join(__dirname, '../../.backup_key')}`);
        await promises_1.default.unlink(backupFile);
        // チェックサムの作成
        (0, child_process_1.execSync)(`sha256sum ${backupFile}.enc > ${backupFile}.enc.sha256`);
        logger.logInfo({
            message: 'Database backup created successfully',
            backupFile: backupFile + '.enc'
        });
        return backupFile + '.enc';
    }
    catch (error) {
        await sqlite.run('ROLLBACK');
        logger.logError(error, {
            context: 'AutoBackup',
            message: 'Backup creation failed',
            backupFile
        });
        throw error;
    }
}
async function removeOldBackups() {
    try {
        const files = await promises_1.default.readdir(BACKUP_DIR);
        const now = Date.now();
        for (const file of files) {
            const filePath = path_1.default.join(BACKUP_DIR, file);
            const stats = await promises_1.default.stat(filePath);
            const age = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
            if (age > BACKUP_RETENTION_DAYS) {
                await promises_1.default.unlink(filePath);
                logger.logInfo({
                    message: 'Old backup removed',
                    file: filePath
                });
            }
        }
    }
    catch (error) {
        logger.logError(error, {
            context: 'AutoBackup',
            message: 'Failed to remove old backups'
        });
    }
}
async function verifyBackup(backupFile) {
    try {
        // チェックサムの検証
        (0, child_process_1.execSync)(`sha256sum -c ${backupFile}.sha256`);
        // テスト用データベースへの復元テスト
        const testDbFile = backupFile + '.test.db';
        (0, child_process_1.execSync)(`openssl enc -d -aes-256-cbc -in ${backupFile} -out ${testDbFile} -pass file:${path_1.default.join(__dirname, '../../.backup_key')}`);
        // テストデータベースでの整合性チェック
        const testDb = new sqliteService_1.SQLiteService(testDbFile);
        await testDb.run('PRAGMA integrity_check');
        await testDb.close();
        await promises_1.default.unlink(testDbFile);
        logger.logInfo({
            message: 'Backup verification successful',
            backupFile
        });
        return true;
    }
    catch (error) {
        logger.logError(error, {
            context: 'AutoBackup',
            message: 'Backup verification failed',
            backupFile
        });
        return false;
    }
}
async function notifyBackupStatus(success, backupFile) {
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
    }
    catch (error) {
        logger.logError(error, {
            context: 'AutoBackup',
            message: 'Failed to send backup notification'
        });
    }
}
async function runBackup() {
    try {
        await ensureBackupDir();
        const backupFile = await createBackup();
        const verified = await verifyBackup(backupFile);
        await notifyBackupStatus(verified, backupFile);
        await removeOldBackups();
    }
    catch (error) {
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
//# sourceMappingURL=autoBackup.js.map