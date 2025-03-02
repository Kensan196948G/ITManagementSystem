# PowerShell Script to start both frontend and backend servers

# エンコーディングをUTF-8に設定
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# スクリプトのパスを正規化して取得
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Script location: $scriptPath" -ForegroundColor Gray

# 既存のNode.jsプロセスを終了
Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -eq "node" -or $_.ProcessName -eq "npm" } | ForEach-Object {
    try {
        $_ | Stop-Process -Force
        Write-Host "Stopped process: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Green
    } catch {
        Write-Host "Failed to stop process: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Red
    }
}
Start-Sleep -Seconds 2

# ポート開放関数
function Clear-Port {
    param(
        [int]$Port
    )
    
    Write-Host "Checking port $Port..." -ForegroundColor Yellow
    $connections = netstat -ano | Select-String ":$Port\s+"
    if ($connections) {
        $connections | ForEach-Object {
            $pid = $_.ToString().Split(' ')[-1]
            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "Stopped process with PID: $pid using port $Port" -ForegroundColor Green
            } catch {
                Write-Host "Failed to stop process with PID: $pid" -ForegroundColor Red
            }
        }
        Start-Sleep -Seconds 1
    } else {
        Write-Host "Port $Port is free" -ForegroundColor Green
    }
}

# ポートをクリア
Clear-Port -Port 3000
Clear-Port -Port 3002

# バックエンドサーバーの起動
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
$backendPath = Join-Path -Path $scriptPath -ChildPath "backend"
if (Test-Path $backendPath) {
    $backendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd `"$backendPath`" && npm run dev" -PassThru -WindowStyle Normal
    Write-Host "Backend server starting with PID: $($backendProcess.Id)" -ForegroundColor Green
    
    # バックエンドの起動を待機
    $maxRetries = 30
    $retryCount = 0
    $backendStarted = $false
    
    Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
    while ($retryCount -lt $maxRetries -and -not $backendStarted) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3002/api/health" -Method GET
            if ($response.StatusCode -eq 200) {
                $backendStarted = $true
                Write-Host "Backend server is ready!" -ForegroundColor Green
            }
        } catch {
            $retryCount++
            Write-Host "Waiting for backend server... (Attempt $retryCount of $maxRetries)" -ForegroundColor Yellow
            Start-Sleep -Seconds 1
        }
    }
    
    if (-not $backendStarted) {
        Write-Host "Backend server failed to start after $maxRetries attempts" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Backend directory not found at: $backendPath" -ForegroundColor Red
    exit 1
}

# フロントエンドサーバーの起動
Write-Host "Starting Frontend Server..." -ForegroundColor Cyan
$frontendPath = Join-Path -Path $scriptPath -ChildPath "frontend"
if (Test-Path $frontendPath) {
    $frontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd `"$frontendPath`" && npm run dev" -PassThru -WindowStyle Normal
    Write-Host "Frontend server starting with PID: $($frontendProcess.Id)" -ForegroundColor Green
} else {
    Write-Host "Frontend directory not found at: $frontendPath" -ForegroundColor Red
    exit 1
}

# アクセスURLの表示
Write-Host "`nServers are starting up..." -ForegroundColor Yellow
Write-Host "Frontend will be available at: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend will be available at: http://localhost:3002" -ForegroundColor Green
Write-Host "`nPress Ctrl+C in respective windows to stop the servers" -ForegroundColor Yellow

# プロセスの監視
try {
    while ($true) {
        if ($backendProcess.HasExited -or $frontendProcess.HasExited) {
            Write-Host "One of the servers has stopped unexpectedly!" -ForegroundColor Red
            break
        }
        Start-Sleep -Seconds 1
    }
} finally {
    # クリーンアップ
    if (-not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if (-not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
}