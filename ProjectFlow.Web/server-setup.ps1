# ================================================================
#  SERVER DEPLOYMENT SCRIPT
#  Run this on the Windows Server as Administrator
#  after extracting iis-deploy.zip
# ================================================================
#
#  USAGE:
#    1. Copy iis-deploy.zip to the server
#    2. Extract to C:\Deployment\Task_Managment\Task_Web\
#    3. Open PowerShell as Administrator
#    4. Run: powershell -ExecutionPolicy Bypass -File server-setup.ps1
# ================================================================

$ErrorActionPreference = "Stop"

$deployPath = "C:\Deployment\Task_Managment\Task_Web"
$siteName   = "Task_Web"          # Change to your actual IIS site name

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ProjectFlow.Web - Server Setup Script" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Validate deployment folder exists
if (-not (Test-Path $deployPath)) {
    Write-Error "Deploy path not found: $deployPath`nExtract iis-deploy.zip first."
    exit 1
}

# [1] Stop IIS
Write-Host "[1/6] Stopping IIS..." -ForegroundColor Yellow
iisreset /stop
Write-Host "  OK - IIS stopped." -ForegroundColor Green

# [2] Install runtime dependencies
Write-Host ""
Write-Host "[2/6] Installing Node.js dependencies..." -ForegroundColor Yellow
Write-Host "  (This installs next, react, react-dom into node_modules)" -ForegroundColor DarkGray
Set-Location $deployPath
npm install --omit=dev
Write-Host "  OK - Dependencies installed." -ForegroundColor Green

# [3] Set IIS folder permissions
Write-Host ""
Write-Host "[3/6] Setting folder permissions for IIS_IUSRS..." -ForegroundColor Yellow
$acl = Get-Acl $deployPath
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS_IUSRS",
    "ReadAndExecute, ListDirectory",
    "ContainerInherit, ObjectInherit",
    "None",
    "Allow"
)
$acl.SetAccessRule($rule)
Set-Acl -Path $deployPath -AclObject $acl
Write-Host "  OK - IIS_IUSRS has Read+Execute on $deployPath" -ForegroundColor Green

# [4] Create iisnode-logs folder (IISNode writes logs here)
Write-Host ""
Write-Host "[4/6] Creating log directories..." -ForegroundColor Yellow
$logDir = Join-Path $deployPath "iisnode-logs"
if (-not (Test-Path $logDir)) {
    New-Item -Path $logDir -ItemType Directory -Force | Out-Null
}
# IISNode needs write access to its log folder
$aclLog = Get-Acl $logDir
$ruleLog = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS_IUSRS",
    "Modify",
    "ContainerInherit, ObjectInherit",
    "None",
    "Allow"
)
$aclLog.SetAccessRule($ruleLog)
Set-Acl -Path $logDir -AclObject $aclLog
Write-Host "  OK - iisnode-logs folder ready with write permissions." -ForegroundColor Green

# [5] Verify critical files are present
Write-Host ""
Write-Host "[5/6] Verifying deployment files..." -ForegroundColor Yellow

$checks = @(
    "server.js",
    "web.config",
    "iisnode.yml",
    "package.json",
    ".env.production",
    "node_modules\next\package.json",
    ".next\BUILD_ID",
    ".next\routes-manifest.json",
    ".next\static"
)

$allOk = $true
foreach ($f in $checks) {
    $fp = Join-Path $deployPath $f
    if (Test-Path $fp) {
        Write-Host "  OK   - $f" -ForegroundColor Green
    } else {
        Write-Host "  MISS - $f" -ForegroundColor Red
        $allOk = $false
    }
}

if (-not $allOk) {
    Write-Host ""
    Write-Host "  WARNING: Missing files detected. IIS start may fail." -ForegroundColor Red
}

# [6] Start IIS
Write-Host ""
Write-Host "[6/6] Starting IIS..." -ForegroundColor Yellow
iisreset /start
Write-Host "  OK - IIS started." -ForegroundColor Green

# Done
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Site URL: https://192.168.18.69" -ForegroundColor White
Write-Host ""
Write-Host "  If the site shows an IISNode error:" -ForegroundColor Yellow
Write-Host "  1. Check logs at: $logDir" -ForegroundColor White
Write-Host "  2. In IIS Manager, verify:" -ForegroundColor White
Write-Host "     - IISNode module is installed" -ForegroundColor White
Write-Host "     - Site is running (not stopped)" -ForegroundColor White
Write-Host "     - AppPool is set to No Managed Code" -ForegroundColor White
Write-Host "     - AppPool identity has access to $deployPath" -ForegroundColor White
Write-Host ""
Write-Host "  Tail the IISNode log for live errors:" -ForegroundColor Yellow
Write-Host "  Get-Content '$logDir\*.txt' -Wait -Tail 50" -ForegroundColor Cyan
Write-Host ""
