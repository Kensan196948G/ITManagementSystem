import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import LoggingService from './loggingService';
import { SQLiteService } from './sqliteService';
import { AuditLogService } from './auditLogService';

const execAsync = promisify(exec);
const logger = LoggingService.getInstance();

// Graph APIパーミッションの型定義
export interface GraphPermission {
  id: string;
  value: string;
  type: 'Delegated' | 'Application';
  description?: string;
  displayName?: string;
}

// パーミッション操作結果の型定義
export interface PermissionOperationResult {
  success: boolean;
  message: string;
  details?: any;
}

// パーミッション監査ログの型定義
export interface PermissionAuditLog {
  id?: number;
  timestamp: string;
  userEmail: string;
  operatorEmail: string;
  action: 'grant' | 'revoke' | 'list';
  permission?: string;
  permissionType?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Microsoft Graph APIのパーミッション管理サービス
 */
export class GraphPermissionService {
  private static instance: GraphPermissionService;
  private graphClient: Client;
  private sqliteService: SQLiteService;
  private auditLogService: AuditLogService;
  private readonly SCRIPTS_PATH: string;
  private readonly GRAPH_SERVICE_PRINCIPAL_ID = '00000003-0000-0000-c000-000000000000'; // Microsoft Graph

  private constructor() {
    this.initializeGraphClient();
    this.sqliteService = SQLiteService.getInstance();
    this.auditLogService = AuditLogService.getInstance();
    
    // スクリプトパスの設定
    this.SCRIPTS_PATH = path.resolve(process.cwd(), '..', 'scripts');
    
    // データベーステーブルの初期化
    this.initializeDatabase().catch(error => {
      logger.logError(error as Error, {
        context: 'GraphPermissionService',
        message: 'データベース初期化エラー'
      });
    });
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): GraphPermissionService {
    if (!GraphPermissionService.instance) {
      GraphPermissionService.instance = new GraphPermissionService();
    }
    return GraphPermissionService.instance;
  }

  /**
   * Graph Clientの初期化
   */
  private async initializeGraphClient(): Promise<void> {
    try {
      const credential = new ClientSecretCredential(
        process.env.AZURE_TENANT_ID!,
        process.env.AZURE_CLIENT_ID!,
        process.env.AZURE_CLIENT_SECRET!
      );

      const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: [
          'https://graph.microsoft.com/.default'
        ]
      });

      this.graphClient = Client.initWithMiddleware({
        authProvider
      });
      
      logger.logInfo({
        context: 'GraphPermissionService',
        message: 'Graph Client初期化成功'
      });
    } catch (error) {
      const err = error as Error;
      logger.logError(err, {
        context: 'GraphPermissionService',
        message: 'Graph Client初期化エラー'
      });
      throw error;
    }
  }

  /**
   * データベーステーブルの初期化
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // パーミッション監査ログテーブルの作成
      await this.sqliteService.exec(`
        CREATE TABLE IF NOT EXISTS graph_permission_audit (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          user_email TEXT NOT NULL,
          operator_email TEXT NOT NULL,
          action TEXT NOT NULL,
          permission TEXT,
          permission_type TEXT,
          success INTEGER NOT NULL,
          error_message TEXT
        )
      `);
      
      // インデックスの作成
      await this.sqliteService.exec(`
        CREATE INDEX IF NOT EXISTS idx_graph_permission_audit_user_email 
        ON graph_permission_audit (user_email);
        
        CREATE INDEX IF NOT EXISTS idx_graph_permission_audit_timestamp 
        ON graph_permission_audit (timestamp);
      `);
      
      logger.logInfo({
        context: 'GraphPermissionService',
        message: 'データベーステーブル初期化成功'
      });
    } catch (error) {
      logger.logError(error as Error, {
        context: 'GraphPermissionService',
        message: 'データベーステーブル初期化エラー'
      });
      throw error;
    }
  }

  /**
   * PowerShellスクリプトの実行
   * @param action 実行するアクション
   * @param userEmail 対象ユーザーのメールアドレス
   * @param permission パーミッション名
   * @param scope パーミッションのスコープ
   */
  private async executePowerShellScript(
    action: 'Grant' | 'Revoke' | 'List',
    userEmail: string,
    permission?: string,
    scope?: 'Delegated' | 'Application'
  ): Promise<string> {
    try {
      const scriptPath = path.join(this.SCRIPTS_PATH, 'manage-graph-permissions.ps1');
      
      // スクリプトの存在確認
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`スクリプトが見つかりません: ${scriptPath}`);
      }
      
      // コマンドの構築
      let command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -Action ${action} -UserEmail "${userEmail}"`;
      
      if (permission && (action === 'Grant' || action === 'Revoke')) {
        command += ` -Permission "${permission}"`;
      }
      
      if (scope && (action === 'Grant' || action === 'Revoke')) {
        command += ` -Scope "${scope}"`;
      }
      
      // スクリプトの実行
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        logger.logError(new Error(stderr), {
          context: 'GraphPermissionService',
          message: 'PowerShellスクリプト実行エラー',
          command
        });
        throw new Error(`PowerShellスクリプト実行エラー: ${stderr}`);
      }
      
      return stdout;
    } catch (error) {
      const err = error as Error;
      logger.logError(err, {
        context: 'GraphPermissionService',
        message: 'PowerShellスクリプト実行エラー'
      });
      throw err;
    }
  }

  /**
   * 監査ログの記録
   * @param logEntry 監査ログエントリ
   */
  private async logAudit(logEntry: PermissionAuditLog): Promise<void> {
    try {
      // データベースに監査ログを記録
      await this.sqliteService.run(
        `INSERT INTO graph_permission_audit (
          timestamp, user_email, operator_email, action, 
          permission, permission_type, success, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logEntry.timestamp,
          logEntry.userEmail,
          logEntry.operatorEmail,
          logEntry.action,
          logEntry.permission || null,
          logEntry.permissionType || null,
          logEntry.success ? 1 : 0,
          logEntry.errorMessage || null
        ]
      );
      
      // 全体の監査ログにも記録
      await this.auditLogService.logPermissionChange({
        actorId: logEntry.operatorEmail,
        actorEmail: logEntry.operatorEmail,
        targetId: logEntry.userEmail,
        targetEmail: logEntry.userEmail,
        action: logEntry.action === 'grant' ? 'add' : (logEntry.action === 'revoke' ? 'remove' : 'view'),
        resourceType: 'graph_api_permission',
        resourceName: logEntry.permission || 'all_permissions',
        permissionBefore: logEntry.action === 'revoke' ? 'granted' : 'not_granted',
        permissionAfter: logEntry.action === 'grant' ? 'granted' : 'not_granted',
        reason: `Graph API ${logEntry.action} operation for ${logEntry.userEmail}`
      });
      
      logger.logInfo({
        context: 'GraphPermissionService',
        message: '監査ログ記録成功',
        details: {
          userEmail: logEntry.userEmail,
          action: logEntry.action,
          success: logEntry.success
        }
      });
    } catch (error) {
      logger.logError(error as Error, {
        context: 'GraphPermissionService',
        message: '監査ログ記録エラー'
      });
    }
  }

  /**
   * ユーザーにパーミッションを付与
   * @param userEmail 対象ユーザーのメールアドレス
   * @param permission 付与するパーミッション
   * @param scope パーミッションのスコープ
   * @param operatorEmail 操作者のメールアドレス
   */
  public async grantPermission(
    userEmail: string,
    permission: string,
    scope: 'Delegated' | 'Application',
    operatorEmail: string
  ): Promise<PermissionOperationResult> {
    try {
      // PowerShellスクリプトの実行
      const output = await this.executePowerShellScript('Grant', userEmail, permission, scope);
      
      // 監査ログの記録
      await this.logAudit({
        timestamp: new Date().toISOString(),
        userEmail,
        operatorEmail,
        action: 'grant',
        permission,
        permissionType: scope,
        success: true
      });
      
      return {
        success: true,
        message: `パーミッション ${permission} (${scope}) をユーザー ${userEmail} に付与しました`,
        details: { output }
      };
    } catch (error) {
      const err = error as Error;
      
      // 監査ログの記録（失敗）
      await this.logAudit({
        timestamp: new Date().toISOString(),
        userEmail,
        operatorEmail,
        action: 'grant',
        permission,
        permissionType: scope,
        success: false,
        errorMessage: err.message
      });
      
      return {
        success: false,
        message: `パーミッション付与エラー: ${err.message}`,
        details: { error: err }
      };
    }
  }

  /**
   * ユーザーからパーミッションを削除
   * @param userEmail 対象ユーザーのメールアドレス
   * @param permission 削除するパーミッション
   * @param scope パーミッションのスコープ
   * @param operatorEmail 操作者のメールアドレス
   */
  public async revokePermission(
    userEmail: string,
    permission: string,
    scope: 'Delegated' | 'Application',
    operatorEmail: string
  ): Promise<PermissionOperationResult> {
    try {
      // PowerShellスクリプトの実行
      const output = await this.executePowerShellScript('Revoke', userEmail, permission, scope);
      
      // 監査ログの記録
      await this.logAudit({
        timestamp: new Date().toISOString(),
        userEmail,
        operatorEmail,
        action: 'revoke',
        permission,
        permissionType: scope,
        success: true
      });
      
      return {
        success: true,
        message: `パーミッション ${permission} (${scope}) をユーザー ${userEmail} から削除しました`,
        details: { output }
      };
    } catch (error) {
      const err = error as Error;
      
      // 監査ログの記録（失敗）
      await this.logAudit({
        timestamp: new Date().toISOString(),
        userEmail,
        operatorEmail,
        action: 'revoke',
        permission,
        permissionType: scope,
        success: false,
        errorMessage: err.message
      });
      
      return {
        success: false,
        message: `パーミッション削除エラー: ${err.message}`,
        details: { error: err }
      };
    }
  }

  /**
   * ユーザーのパーミッション一覧を取得
   * @param userEmail 対象ユーザーのメールアドレス
   * @param operatorEmail 操作者のメールアドレス
   */
  public async listPermissions(
    userEmail: string,
    operatorEmail: string
  ): Promise<GraphPermission[]> {
    try {
      // PowerShellスクリプトの実行
      const output = await this.executePowerShellScript('List', userEmail);
      
      // 出力からパーミッション情報を抽出
      const permissions: GraphPermission[] = [];
      const lines = output.split('\n');
      
      let currentPermission: Partial<GraphPermission> | null = null;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // パーミッション行の検出
        if (trimmedLine.startsWith('- ')) {
          // 前のパーミッションがあれば追加
          if (currentPermission && currentPermission.id && currentPermission.value) {
            permissions.push(currentPermission as GraphPermission);
          }
          
          // 新しいパーミッション情報の開始
          const permissionMatch = trimmedLine.match(/- (.*?) \((.*?)\)/);
          if (permissionMatch) {
            currentPermission = {
              value: permissionMatch[1],
              type: permissionMatch[2] as 'Delegated' | 'Application'
            };
          }
        }
        // 説明行の検出
        else if (trimmedLine.startsWith('説明:') && currentPermission) {
          currentPermission.description = trimmedLine.substring('説明:'.length).trim();
        }
        // ID行の検出
        else if (trimmedLine.startsWith('ID:') && currentPermission) {
          currentPermission.id = trimmedLine.substring('ID:'.length).trim();
        }
      }
      
      // 最後のパーミッションを追加
      if (currentPermission && currentPermission.id && currentPermission.value) {
        permissions.push(currentPermission as GraphPermission);
      }
      
      // 監査ログの記録
      await this.logAudit({
        timestamp: new Date().toISOString(),
        userEmail,
        operatorEmail,
        action: 'list',
        success: true
      });
      
      return permissions;
    } catch (error) {
      const err = error as Error;
      
      // 監査ログの記録（失敗）
      await this.logAudit({
        timestamp: new Date().toISOString(),
        userEmail,
        operatorEmail,
        action: 'list',
        success: false,
        errorMessage: err.message
      });
      
      logger.logError(err, {
        context: 'GraphPermissionService',
        message: 'パーミッション一覧取得エラー',
        userEmail
      });
      
      return [];
    }
  }

  /**
   * パーミッション監査ログの取得
   * @param userEmail 対象ユーザーのメールアドレス（オプション）
   * @param limit 取得する最大件数
   * @param offset オフセット
   */
  public async getPermissionAuditLogs(
    userEmail?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<PermissionAuditLog[]> {
    try {
      let query = `
        SELECT 
          id, timestamp, user_email, operator_email, action, 
          permission, permission_type, success, error_message
        FROM graph_permission_audit
      `;
      
      const params: any[] = [];
      
      if (userEmail) {
        query += ' WHERE user_email = ?';
        params.push(userEmail);
      }
      
      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const logs = await this.sqliteService.all(query, params);
      
      return logs.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        userEmail: log.user_email,
        operatorEmail: log.operator_email,
        action: log.action as 'grant' | 'revoke' | 'list',
        permission: log.permission,
        permissionType: log.permission_type,
        success: log.success === 1,
        errorMessage: log.error_message
      }));
    } catch (error) {
      logger.logError(error as Error, {
        context: 'GraphPermissionService',
        message: '監査ログ取得エラー'
      });
      return [];
    }
  }

  /**
   * 利用可能なGraph APIパーミッションの一覧を取得
   */
  public async getAvailablePermissions(): Promise<GraphPermission[]> {
    try {
      // Microsoft Graphサービスプリンシパルの取得
      const servicePrincipal = await this.graphClient
        .api(`/servicePrincipals?$filter=appId eq '${this.GRAPH_SERVICE_PRINCIPAL_ID}'`)
        .get();
      
      if (!servicePrincipal.value || servicePrincipal.value.length === 0) {
        throw new Error('Microsoft Graphサービスプリンシパルが見つかりません');
      }
      
      const graphSP = servicePrincipal.value[0];
      const permissions: GraphPermission[] = [];
      
      // アプリケーションパーミッション（ロール）の取得
      if (graphSP.appRoles) {
        for (const role of graphSP.appRoles) {
          permissions.push({
            id: role.id,
            value: role.value,
            type: 'Application',
            displayName: role.displayName,
            description: role.description
          });
        }
      }
      
      // 委任パーミッション（スコープ）の取得
      if (graphSP.oauth2PermissionScopes) {
        for (const scope of graphSP.oauth2PermissionScopes) {
          permissions.push({
            id: scope.id,
            value: scope.value,
            type: 'Delegated',
            displayName: scope.adminConsentDisplayName,
            description: scope.adminConsentDescription
          });
        }
      }
      
      return permissions;
    } catch (error) {
      logger.logError(error as Error, {
        context: 'GraphPermissionService',
        message: '利用可能なパーミッション取得エラー'
      });
      return [];
    }
  }
}

export default GraphPermissionService;