# PowerShell Script to start both frontend and backend servers
Write-Host "Starting IT Operations System Servers..." -ForegroundColor Green

# Kill all Node.js processes
Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
try {
    taskkill /F /IM node.exe 2>$null
    Write-Host "Successfully stopped all Node.js processes" -ForegroundColor Green
    # Wait a moment for the processes to be fully terminated
    Start-Sleep -Seconds 2
} catch {
    Write-Host "No Node.js processes were running" -ForegroundColor Gray
}

# Check and kill process using port 3000
$port3000Process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($port3000Process) {
    Write-Host "Port 3000 is in use. Attempting to stop the process..." -ForegroundColor Yellow
    try {
        Stop-Process -Id $port3000Process -Force
        Write-Host "Successfully stopped process using port 3000" -ForegroundColor Green
        # Wait a moment for the port to be released
        Start-Sleep -Seconds 2
    } catch {
        Write-Host "Failed to stop process. Please check if you have necessary permissions." -ForegroundColor Red
        exit 1
    }
}

# Check and kill process using port 3002
$port3002Process = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($port3002Process) {
    Write-Host "Port 3002 is in use. Attempting to stop the process..." -ForegroundColor Yellow
    try {
        Stop-Process -Id $port3002Process -Force
        Write-Host "Successfully stopped process using port 3002" -ForegroundColor Green
        # Wait a moment for the port to be released
        Start-Sleep -Seconds 2
    } catch {
        Write-Host "Failed to stop process. Please check if you have necessary permissions." -ForegroundColor Red
        exit 1
    }
}

# Start Backend Server
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
$backendPath = ".\backend"
Set-Location $backendPath
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

# Start Frontend Server
Write-Host "Starting Frontend Server..." -ForegroundColor Cyan
Set-Location ..
$frontendPath = ".\frontend"
Set-Location $frontendPath
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

# Display access URLs
Write-Host "`nServers are starting up..." -ForegroundColor Yellow
Write-Host "Frontend will be available at: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend will be available at: http://localhost:3002" -ForegroundColor Green
Write-Host "`nPress Ctrl+C in respective windows to stop the servers" -ForegroundColor Yellow

# Return to original directory
Set-Location ..