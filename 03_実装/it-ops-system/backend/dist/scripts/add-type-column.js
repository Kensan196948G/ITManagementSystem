"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqliteService_1 = require("../services/sqliteService");
const loggingService_1 = __importDefault(require("../services/loggingService"));
/**
 * audit_logsテーブルにtypeカラムを追加するマイグレーションスクリプト
 */
async function addTypeColumn() {
    const logger = loggingService_1.default.getInstance();
    const sqliteService = sqliteService_1.SQLiteService.getInstanceSync();
    try {
        // SQLiteServiceの初期化を待つ
        await sqliteService.initialize();
        // テーブル情報を取得
        const tableInfo = await sqliteService.all(`PRAGMA table_info(audit_logs)`);
        const hasTypeColumn = tableInfo.some((column) => column.name === 'type');
        if (!hasTypeColumn) {
            logger.logInfo({
                context: 'Migration',
                message: 'audit_logsテーブルにtypeカラムが存在しないため、追加します'
            });
            // typeカラムを追加
            await sqliteService.run(`ALTER TABLE audit_logs ADD COLUMN type TEXT DEFAULT 'info'`);
            // 既存のデータを更新
            await sqliteService.run(`UPDATE audit_logs SET type = 'info' WHERE type IS NULL`);
            logger.logInfo({
                context: 'Migration',
                message: 'typeカラムの追加が完了しました'
            });
        }
        else {
            logger.logInfo({
                context: 'Migration',
                message: 'audit_logsテーブルにtypeカラムは既に存在します'
            });
        }
        // インデックスの作成
        await sqliteService.run(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON audit_logs(type)
    `);
        logger.logInfo({
            context: 'Migration',
            message: 'マイグレーションが正常に完了しました'
        });
        process.exit(0);
    }
    catch (error) {
        logger.logError(error, {
            context: 'Migration',
            message: 'マイグレーション実行中にエラーが発生しました'
        });
        process.exit(1);
    }
}
// スクリプトの実行
addTypeColumn();
//# sourceMappingURL=add-type-column.js.map