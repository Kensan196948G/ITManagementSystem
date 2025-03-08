<#
.SYNOPSIS
Microsoft 365ユーザーのGraph APIパーミッションを管理するスクリプト

.DESCRIPTION
このスクリプトは、Microsoft 365の一般ユーザーに対してGraph APIのパーミッションを
付与または削除するための機能を提供します。管理者権限で実行する必要があります。

.PARAMETER Action
実行するアクション: Grant（付与）、Revoke（削除）、List（一覧表示）

.PARAMETER UserEmail
対象ユーザーのメールアドレス

.PARAMETER Permission
付与または削除するパーミッション（例: User.Read, Mail.Read）

.PARAMETER Scope
パーミッションのスコープ: Delegated（委任）またはApplication（アプリケーション）

.EXAMPLE
.\manage-graph-permissions.ps1 -Action List -UserEmail user@example.com
指定したユーザーに付与されているGraph APIパーミッションを一覧表示します

.EXAMPLE
.\manage-graph-permissions.ps1 -Action Grant -UserEmail user@example.com -Permission User.Read -Scope Delegated
指定したユーザーにUser.Readの委任パーミッションを付与します

.EXAMPLE
.\manage-graph-permissions.ps1 -Action Revoke -UserEmail user@example.com -Permission Mail.Read -Scope Delegated
指定したユーザーからMail.Readの委任パーミッションを削除します

.NOTES
実行には以下のモジュールが必要です:
- Microsoft.Graph.Authentication
- Microsoft.Graph.Applications
- Microsoft.Graph.Users
- Microsoft.Graph.Identity.DirectoryManagement
#>

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("Grant", "Revoke", "List")]
    [string]$Action,
    
    [Parameter(Mandatory=$true)]
    [string]$UserEmail,
    
    [Parameter(Mandatory=$false)]
    [string]$Permission,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("Delegated", "Application")]
    [string]$Scope = "Delegated"
)

# モジュールのインポート
$requiredModules = @(
    "Microsoft.Graph.Authentication",
    "Microsoft.Graph.Applications",
    "Microsoft.Graph.Users",
    "Microsoft.Graph.Identity.DirectoryManagement"
)

foreach ($module in $requiredModules) {
    if (-not (Get-Module -Name $module -ListAvailable)) {
        Write-Host "必要なモジュール $module がインストールされていません。インストールします..." -ForegroundColor Yellow
        Install-Module -Name $module -Scope CurrentUser -Force
    }
    Import-Module $module
}

# Microsoft Graphへの接続
try {
    Connect-MgGraph -Scopes "Directory.ReadWrite.All", "Application.ReadWrite.All", "User.ReadWrite.All"
    Write-Host "Microsoft Graphに接続しました" -ForegroundColor Green
} catch {
    Write-Error "Microsoft Graphへの接続に失敗しました: $_"
    exit 1
}

# ユーザーの存在確認
try {
    $user = Get-MgUser -Filter "userPrincipalName eq '$UserEmail'"
    if (-not $user) {
        Write-Error "ユーザー $UserEmail が見つかりません"
        exit 1
    }
    Write-Host "ユーザー $($user.DisplayName) ($UserEmail) が見つかりました" -ForegroundColor Green
} catch {
    Write-Error "ユーザー情報の取得に失敗しました: $_"
    exit 1
}

# Microsoft Graph APIのパーミッション一覧
$graphServicePrincipal = Get-MgServicePrincipal -Filter "appId eq '00000003-0000-0000-c000-000000000000'"
if (-not $graphServicePrincipal) {
    Write-Error "Microsoft Graph APIのサービスプリンシパルが見つかりません"
    exit 1
}

# パーミッションIDの取得
function Get-PermissionId {
    param (
        [string]$PermissionName,
        [string]$PermissionType
    )
    
    $permissionType = if ($PermissionType -eq "Delegated") { "Scope" } else { "Role" }
    
    $permission = $graphServicePrincipal.AppRoles | Where-Object { 
        $_.Value -eq $PermissionName -and $_.AllowedMemberTypes -contains $permissionType
    }
    
    if (-not $permission) {
        Write-Error "パーミッション $PermissionName ($PermissionType) が見つかりません"
        return $null
    }
    
    return $permission.Id
}

# ユーザーのアプリケーション割り当て情報を取得
function Get-UserAppAssignments {
    param (
        [string]$UserId
    )
    
    $assignments = Get-MgUserAppRoleAssignment -UserId $UserId
    return $assignments
}

# パーミッションの付与
function Grant-Permission {
    param (
        [string]$UserId,
        [string]$PermissionName,
        [string]$PermissionType
    )
    
    $permissionId = Get-PermissionId -PermissionName $PermissionName -PermissionType $PermissionType
    if (-not $permissionId) { return }
    
    # 既存の割り当てを確認
    $assignments = Get-UserAppAssignments -UserId $UserId
    $existingAssignment = $assignments | Where-Object { 
        $_.AppRoleId -eq $permissionId -and $_.ResourceId -eq $graphServicePrincipal.Id
    }
    
    if ($existingAssignment) {
        Write-Host "パーミッション $PermissionName は既にユーザーに付与されています" -ForegroundColor Yellow
        return
    }
    
    # 新しいパーミッションを付与
    try {
        $params = @{
            PrincipalId = $UserId
            ResourceId = $graphServicePrincipal.Id
            AppRoleId = $permissionId
        }
        
        New-MgUserAppRoleAssignment -UserId $UserId -BodyParameter $params
        Write-Host "パーミッション $PermissionName ($PermissionType) をユーザー $UserEmail に付与しました" -ForegroundColor Green
    } catch {
        Write-Error "パーミッションの付与に失敗しました: $_"
    }
}

# パーミッションの削除
function Revoke-Permission {
    param (
        [string]$UserId,
        [string]$PermissionName,
        [string]$PermissionType
    )
    
    $permissionId = Get-PermissionId -PermissionName $PermissionName -PermissionType $PermissionType
    if (-not $permissionId) { return }
    
    # 既存の割り当てを確認
    $assignments = Get-UserAppAssignments -UserId $UserId
    $existingAssignment = $assignments | Where-Object { 
        $_.AppRoleId -eq $permissionId -and $_.ResourceId -eq $graphServicePrincipal.Id
    }
    
    if (-not $existingAssignment) {
        Write-Host "パーミッション $PermissionName はユーザーに付与されていません" -ForegroundColor Yellow
        return
    }
    
    # パーミッションを削除
    try {
        Remove-MgUserAppRoleAssignment -UserId $UserId -AppRoleAssignmentId $existingAssignment.Id
        Write-Host "パーミッション $PermissionName ($PermissionType) をユーザー $UserEmail から削除しました" -ForegroundColor Green
    } catch {
        Write-Error "パーミッションの削除に失敗しました: $_"
    }
}

# パーミッション一覧の表示
function List-Permissions {
    param (
        [string]$UserId
    )
    
    $assignments = Get-UserAppAssignments -UserId $UserId
    $graphAssignments = $assignments | Where-Object { $_.ResourceId -eq $graphServicePrincipal.Id }
    
    if (-not $graphAssignments -or $graphAssignments.Count -eq 0) {
        Write-Host "ユーザー $UserEmail にはGraph APIパーミッションが付与されていません" -ForegroundColor Yellow
        return
    }
    
    Write-Host "ユーザー $UserEmail のGraph APIパーミッション一覧:" -ForegroundColor Cyan
    
    foreach ($assignment in $graphAssignments) {
        $appRole = $graphServicePrincipal.AppRoles | Where-Object { $_.Id -eq $assignment.AppRoleId }
        $permissionType = if ($appRole.AllowedMemberTypes -contains "User") { "Delegated" } else { "Application" }
        
        Write-Host "- $($appRole.Value) ($permissionType)" -ForegroundColor White
        Write-Host "  説明: $($appRole.Description)" -ForegroundColor Gray
        Write-Host "  ID: $($assignment.Id)" -ForegroundColor Gray
        Write-Host ""
    }
}

# 監査ログの記録
function Write-AuditLog {
    param (
        [string]$Action,
        [string]$UserEmail,
        [string]$Permission,
        [string]$Scope,
        [bool]$Success,
        [string]$ErrorMessage = ""
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = [PSCustomObject]@{
        Timestamp = $timestamp
        Action = $Action
        UserEmail = $UserEmail
        Permission = $Permission
        Scope = $Scope
        Success = $Success
        ErrorMessage = $ErrorMessage
        OperatorEmail = $env:USERNAME
    }
    
    # ログディレクトリの確認と作成
    $logDir = Join-Path $PSScriptRoot "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -Path $logDir -ItemType Directory | Out-Null
    }
    
    # ログファイルへの書き込み
    $logFile = Join-Path $logDir "graph-permissions-audit.csv"
    $logEntry | Export-Csv -Path $logFile -Append -NoTypeInformation
    
    Write-Host "監査ログを記録しました: $logFile" -ForegroundColor Gray
}

# メイン処理
try {
    switch ($Action) {
        "List" {
            List-Permissions -UserId $user.Id
            Write-AuditLog -Action "List" -UserEmail $UserEmail -Permission "All" -Scope "All" -Success $true
        }
        "Grant" {
            if (-not $Permission) {
                Write-Error "パーミッションを指定してください"
                exit 1
            }
            Grant-Permission -UserId $user.Id -PermissionName $Permission -PermissionType $Scope
            Write-AuditLog -Action "Grant" -UserEmail $UserEmail -Permission $Permission -Scope $Scope -Success $true
        }
        "Revoke" {
            if (-not $Permission) {
                Write-Error "パーミッションを指定してください"
                exit 1
            }
            Revoke-Permission -UserId $user.Id -PermissionName $Permission -PermissionType $Scope
            Write-AuditLog -Action "Revoke" -UserEmail $UserEmail -Permission $Permission -Scope $Scope -Success $true
        }
    }
} catch {
    Write-Error "処理中にエラーが発生しました: $_"
    Write-AuditLog -Action $Action -UserEmail $UserEmail -Permission $Permission -Scope $Scope -Success $false -ErrorMessage $_.ToString()
    exit 1
} finally {
    # Microsoft Graphとの接続を切断
    Disconnect-MgGraph | Out-Null
    Write-Host "Microsoft Graphとの接続を切断しました" -ForegroundColor Green
}