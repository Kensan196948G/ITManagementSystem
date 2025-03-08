"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemStatusService = void 0;
const sqliteService_1 = require("./sqliteService");
const loggingService_1 = __importDefault(require("./loggingService"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const logger = loggingService_1.default.getInstance();
/**
 * システムステータスサービス
 * システムの状態、リソース使用状況、セキュリティアラートなどの情報を提供
 */
class SystemStatusService {
    constructor() {
        this.sqliteService = sqliteService_1.SQLiteService.getInstance();
    }
    /**
     * システムステータス情報を取得
     */
    async getSystemStatus() {
        try {
            // データベース接続チェック
            let dbStatus = 'healthy';
            let dbMessage;
            try {
                await this.sqliteService.get('SELECT 1');
            }
            catch (dbError) {
                dbStatus = 'critical';
                dbMessage = dbError.message;
                logger.logError(dbError, {
                    context: 'SystemStatusService',
                    message: 'データベース接続エラー'
                });
            }
            // ファイルシステムチェック
            let fsStatus = 'healthy';
            let fsMessage;
            try {
                const { stdout } = await execAsync('wmic logicaldisk get freespace,caption');
                const lines = stdout.trim().split('\n').slice(1);
                // ディスク空き容量が10%未満の場合は警告
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 2) {
                        const freeSpace = parseInt(parts[0], 10);
                        const drive = parts[1];
                        // ディスク情報を取得
                        const { stdout: driveInfo } = await execAsync(`wmic logicaldisk where caption="${drive}" get size`);
                        const sizeLines = driveInfo.trim().split('\n').slice(1);
                        if (sizeLines.length > 0) {
                            const totalSize = parseInt(sizeLines[0].trim(), 10);
                            const freePercentage = (freeSpace / totalSize) * 100;
                            if (freePercentage < 5) {
                                fsStatus = 'critical';
                                fsMessage = `ドライブ ${drive} の空き容量が5%未満です (${freePercentage.toFixed(2)}%)`;
                                break;
                            }
                            else if (freePercentage < 10) {
                                fsStatus = 'degraded';
                                fsMessage = `ドライブ ${drive} の空き容量が10%未満です (${freePercentage.toFixed(2)}%)`;
                            }
                        }
                    }
                }
            }
            catch (fsError) {
                fsStatus = 'degraded';
                fsMessage = fsError.message;
                logger.logError(fsError, {
                    context: 'SystemStatusService',
                    message: 'ファイルシステムチェックエラー'
                });
            }
            // メモリ使用状況チェック
            const totalMemory = os_1.default.totalmem();
            const freeMemory = os_1.default.freemem();
            const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
            let memoryStatus = 'healthy';
            let memoryMessage;
            if (memoryUsage > 90) {
                memoryStatus = 'critical';
                memoryMessage = `メモリ使用率が90%を超えています (${memoryUsage.toFixed(2)}%)`;
            }
            else if (memoryUsage > 80) {
                memoryStatus = 'degraded';
                memoryMessage = `メモリ使用率が80%を超えています (${memoryUsage.toFixed(2)}%)`;
            }
            // API状態チェック
            // 実際の実装では、外部APIの状態を確認する処理を追加
            const apiStatus = 'healthy';
            // 全体のステータスを判定
            let overallStatus = 'healthy';
            if (dbStatus === 'critical' || fsStatus === 'critical' || memoryStatus === 'critical') {
                overallStatus = 'critical';
            }
            else if (dbStatus === 'degraded' || fsStatus === 'degraded' || memoryStatus === 'degraded' || apiStatus === 'degraded') {
                overallStatus = 'degraded';
            }
            return {
                status: overallStatus,
                components: {
                    database: {
                        status: dbStatus,
                        message: dbMessage
                    },
                    api: {
                        status: apiStatus
                    },
                    filesystem: {
                        status: fsStatus,
                        message: fsMessage
                    },
                    memory: {
                        status: memoryStatus,
                        message: memoryMessage,
                        usage: memoryUsage
                    }
                },
                lastChecked: new Date().toISOString()
            };
        }
        catch (error) {
            logger.logError(error, {
                context: 'SystemStatusService',
                message: 'システムステータス取得エラー'
            });
            // エラー時のフォールバック
            return {
                status: 'degraded',
                components: {
                    database: {
                        status: 'degraded',
                        message: 'ステータス取得中にエラーが発生しました'
                    },
                    api: {
                        status: 'degraded',
                        message: 'ステータス取得中にエラーが発生しました'
                    },
                    filesystem: {
                        status: 'degraded',
                        message: 'ステータス取得中にエラーが発生しました'
                    },
                    memory: {
                        status: 'degraded',
                        message: 'ステータス取得中にエラーが発生しました',
                        usage: 0
                    }
                },
                lastChecked: new Date().toISOString()
            };
        }
    }
    /**
     * セキュリティアラート情報を取得
     */
    async getSecurityAlerts() {
        try {
            // データベースからセキュリティアラートを取得
            const alerts = await this.sqliteService.all(`
        SELECT 
          id, severity, type, message, source, timestamp, status, details
        FROM 
          security_alerts
        WHERE 
          status != 'resolved'
        ORDER BY 
          CASE 
            WHEN severity = 'critical' THEN 1
            WHEN severity = 'high' THEN 2
            WHEN severity = 'medium' THEN 3
            WHEN severity = 'low' THEN 4
            ELSE 5
          END,
          timestamp DESC
        LIMIT 100
      `);
            return alerts.map(alert => ({
                id: alert.id,
                severity: alert.severity,
                type: alert.type,
                message: alert.message,
                source: alert.source,
                timestamp: alert.timestamp,
                status: alert.status,
                details: alert.details ? JSON.parse(alert.details) : undefined
            }));
        }
        catch (error) {
            logger.logError(error, {
                context: 'SystemStatusService',
                message: 'セキュリティアラート取得エラー'
            });
            // エラー時は空配列を返す
            return [];
        }
    }
}
exports.SystemStatusService = SystemStatusService;
//# sourceMappingURL=systemStatusService.js.map