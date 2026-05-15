# ================================================================
#  ProjectFlow – Fixed Standalone Deploy Script
# ================================================================
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ProjectFlow - Production Build & Deploy"   -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$webRoot       = $PSScriptRoot
$envLocal      = Join-Path $webRoot ".env.local"
$envLocalBak   = Join-Path $webRoot ".env.local.disabled"
$iisDeploy     = Join-Path $webRoot "iis-deploy"
$standaloneDir = Join-Path $webRoot ".next\standalone"
$zipFile       = Join-Path $webRoot "iis-deploy.zip"

# [1/5] Disable .env.local
if (Test-Path $envLocal) {
    Move-Item -Path $envLocal -Destination $envLocalBak -Force
}

# [2/5] Build Next.js
try {
    $env:NODE_OPTIONS = "--max-old-space-size=8192"
    npm run build
} finally {
    if (Test-Path $envLocalBak) {
        Move-Item -Path $envLocalBak -Destination $envLocal -Force
    }
}

# [3/5] Sync to iis-deploy
Write-Host "[3/5] Syncing to iis-deploy..." -ForegroundColor Yellow

if (-not (Test-Path $iisDeploy)) { New-Item $iisDeploy -ItemType Directory }

# Copy Standalone contents EXCEPT server.js (we use our own)
Copy-Item -Path "$standaloneDir\node_modules" -Destination $iisDeploy -Recurse -Force
Copy-Item -Path "$standaloneDir\.next" -Destination $iisDeploy -Recurse -Force
Copy-Item -Path "$standaloneDir\package.json" -Destination $iisDeploy -Force
Copy-Item -Path "$standaloneDir\.env.production" -Destination $iisDeploy -Force

# Copy the Next.js server as 'next-server.js'
Copy-Item -Path "$standaloneDir\server.js" -Destination (Join-Path $iisDeploy "next-server.js") -Force

# Copy Static and Public
$iisNextStatic = Join-Path $iisDeploy ".next\static"
if (-not (Test-Path $iisNextStatic)) { New-Item $iisNextStatic -ItemType Directory -Force }
Copy-Item -Path (Join-Path $webRoot ".next\static\*") -Destination $iisNextStatic -Recurse -Force

if (Test-Path (Join-Path $webRoot "public")) {
    Copy-Item -Path (Join-Path $webRoot "public") -Destination (Join-Path $iisDeploy "public") -Recurse -Force
}

# [4/5] Verification
Write-Host "[4/5] Verifying configuration..." -ForegroundColor Yellow
$sizeMB = [math]::Round((Get-ChildItem $iisDeploy -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 1)
Write-Host "  -> iis-deploy size: $sizeMB MB" -ForegroundColor Green

# [5/5] Create ZIP
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
Compress-Archive -Path "$iisDeploy\*" -DestinationPath $zipFile -Force
Write-Host "  -> ZIP created: $([math]::Round((Get-Item $zipFile).Length / 1MB, 1)) MB" -ForegroundColor Green
