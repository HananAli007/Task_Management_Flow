# ================================================================
#  ProjectFlow.Web - Production IIS Deploy Script v2.0
#  Complete rewrite - fixes all previous issues
# ================================================================
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Paths
$webRoot        = $PSScriptRoot
$envLocal       = Join-Path $webRoot ".env.local"
$envLocalBak    = Join-Path $webRoot ".env.local.disabled"
$standaloneDir  = Join-Path $webRoot ".next\standalone"
$nextStaticDir  = Join-Path $webRoot ".next\static"
$publicDir      = Join-Path $webRoot "public"
$iisDeploy      = Join-Path $webRoot "iis-deploy"
$zipFile        = Join-Path $webRoot "iis-deploy.zip"
$customServer   = Join-Path $webRoot "server.js"
$webConfig      = Join-Path $webRoot "web.config"
$iisNodeYml     = Join-Path $webRoot "iisnode.yml"
$envProduction  = Join-Path $webRoot ".env.production"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ProjectFlow.Web - Production Build and Deploy  v2.0"           -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Pre-flight checks
Write-Host "[PRE] Validating required source files..." -ForegroundColor Yellow

if (-not (Test-Path $customServer)) {
    Write-Error "FATAL: server.js not found at $customServer"
    exit 1
}
if (-not (Test-Path $webConfig)) {
    Write-Error "FATAL: web.config not found at $webConfig"
    exit 1
}

Write-Host "  OK - All pre-flight checks passed." -ForegroundColor Green

# [1/6] Disable .env.local for production build
Write-Host ""
Write-Host "[1/6] Disabling .env.local for clean production build..." -ForegroundColor Yellow
if (Test-Path $envLocal) {
    Move-Item -Path $envLocal -Destination $envLocalBak -Force
    Write-Host "  OK - .env.local disabled." -ForegroundColor Green
} else {
    Write-Host "  SKIP - No .env.local found." -ForegroundColor DarkGray
}

# [2/6] Next.js Production Build
Write-Host ""
Write-Host "[2/6] Running Next.js production build..." -ForegroundColor Yellow
Write-Host "  (output: standalone - creates .next\standalone\)" -ForegroundColor DarkGray
Write-Host ""

$buildSuccess = $false
try {
    npm run build
    $buildSuccess = $true
} finally {
    if (Test-Path $envLocalBak) {
        Move-Item -Path $envLocalBak -Destination $envLocal -Force
        Write-Host ""
        Write-Host "  OK - .env.local restored." -ForegroundColor Green
    }
}

if (-not $buildSuccess) {
    Write-Error "Build failed. Deployment aborted."
    exit 1
}

if (-not (Test-Path $standaloneDir)) {
    Write-Error "FATAL: .next\standalone not found after build. Check next.config.js has: output: 'standalone'"
    exit 1
}

Write-Host ""
Write-Host "  OK - Build complete." -ForegroundColor Green

# [3/6] Clean iis-deploy folder
Write-Host ""
Write-Host "[3/6] Cleaning iis-deploy folder..." -ForegroundColor Yellow
if (Test-Path $iisDeploy) {
    Remove-Item -Path $iisDeploy -Recurse -Force
    Write-Host "  OK - Old iis-deploy removed." -ForegroundColor Green
}
New-Item -Path $iisDeploy -ItemType Directory -Force | Out-Null
Write-Host "  OK - Fresh iis-deploy folder created." -ForegroundColor Green

# [4/6] Assemble Deployment Bundle
Write-Host ""
Write-Host "[4/6] Assembling deployment bundle..." -ForegroundColor Yellow

# 4a. standalone node_modules (traced runtime deps)
Write-Host "  Copying standalone node_modules..." -ForegroundColor DarkGray
$standaloneNodeModules = Join-Path $standaloneDir "node_modules"
if (Test-Path $standaloneNodeModules) {
    Copy-Item -Path $standaloneNodeModules -Destination (Join-Path $iisDeploy "node_modules") -Recurse -Force
    Write-Host "  OK - node_modules copied." -ForegroundColor Green
} else {
    Write-Host "  WARN - standalone\node_modules not found. Server will need: npm install --omit=dev" -ForegroundColor DarkYellow
}

# 4b. standalone .next folder
Write-Host "  Copying standalone .next build output..." -ForegroundColor DarkGray
$standaloneNext = Join-Path $standaloneDir ".next"
if (Test-Path $standaloneNext) {
    Copy-Item -Path $standaloneNext -Destination (Join-Path $iisDeploy ".next") -Recurse -Force
    Write-Host "  OK - .next copied." -ForegroundColor Green
} else {
    Write-Error "FATAL: standalone\.next not found."
    exit 1
}

# 4c. Overlay full .next\static from build root
# CRITICAL: standalone\.next\static is EMPTY by design in Next.js.
# JS chunks, CSS, fonts live in .next\static at project root.
Write-Host "  Overlaying .next\static (JS/CSS bundles)..." -ForegroundColor DarkGray
$deployNextStatic = Join-Path $iisDeploy ".next\static"
if (-not (Test-Path $deployNextStatic)) {
    New-Item -Path $deployNextStatic -ItemType Directory -Force | Out-Null
}
if (Test-Path $nextStaticDir) {
    Copy-Item -Path "$nextStaticDir\*" -Destination $deployNextStatic -Recurse -Force
    $staticCount = (Get-ChildItem $deployNextStatic -Recurse | Measure-Object).Count
    Write-Host "  OK - .next\static copied ($staticCount files)." -ForegroundColor Green
} else {
    Write-Host "  WARN - .next\static not found in project root." -ForegroundColor DarkYellow
}

# 4d. public folder
Write-Host "  Copying public folder..." -ForegroundColor DarkGray
if (Test-Path $publicDir) {
    Copy-Item -Path $publicDir -Destination (Join-Path $iisDeploy "public") -Recurse -Force
    Write-Host "  OK - public\ copied." -ForegroundColor Green
} else {
    Write-Host "  WARN - public\ folder not found." -ForegroundColor DarkYellow
}

# 4e. package.json from standalone
Write-Host "  Copying package.json..." -ForegroundColor DarkGray
$standalonePkg = Join-Path $standaloneDir "package.json"
if (Test-Path $standalonePkg) {
    Copy-Item -Path $standalonePkg -Destination $iisDeploy -Force
} else {
    Copy-Item -Path (Join-Path $webRoot "package.json") -Destination $iisDeploy -Force
    Write-Host "  WARN - Used root package.json as fallback." -ForegroundColor DarkYellow
}
Write-Host "  OK - package.json copied." -ForegroundColor Green

# 4f. .env.production
Write-Host "  Copying .env.production..." -ForegroundColor DarkGray
if (Test-Path $envProduction) {
    Copy-Item -Path $envProduction -Destination $iisDeploy -Force
    Write-Host "  OK - .env.production copied." -ForegroundColor Green
} else {
    Write-Host "  WARN - .env.production not found." -ForegroundColor DarkYellow
}

# 4g. Custom server.js (IISNode Named Pipe compatible)
# NOTE: We copy OUR server.js, NOT the one Next.js generates in standalone\.
# The Next.js generated server.js uses parseInt(PORT) which fails when
# IISNode passes a Named Pipe path like \\.\pipe\... causing EACCES crash.
Write-Host "  Copying custom server.js..." -ForegroundColor DarkGray
Copy-Item -Path $customServer -Destination $iisDeploy -Force
Write-Host "  OK - server.js copied (Named Pipe compatible)." -ForegroundColor Green

# 4h. web.config
Write-Host "  Copying web.config..." -ForegroundColor DarkGray
Copy-Item -Path $webConfig -Destination $iisDeploy -Force
Write-Host "  OK - web.config copied." -ForegroundColor Green

# 4i. iisnode.yml
Write-Host "  Copying iisnode.yml..." -ForegroundColor DarkGray
if (Test-Path $iisNodeYml) {
    Copy-Item -Path $iisNodeYml -Destination $iisDeploy -Force
    Write-Host "  OK - iisnode.yml copied." -ForegroundColor Green
} else {
    Write-Host "  WARN - iisnode.yml not found." -ForegroundColor DarkYellow
}

# [5/6] Verify Bundle
Write-Host ""
Write-Host "[5/6] Verifying deployment bundle..." -ForegroundColor Yellow

$requiredFiles = @(
    "server.js",
    "web.config",
    "package.json",
    ".next\BUILD_ID",
    ".next\routes-manifest.json"
)

$allGood = $true
foreach ($f in $requiredFiles) {
    $fullPath = Join-Path $iisDeploy $f
    if (Test-Path $fullPath) {
        Write-Host "  OK   - $f" -ForegroundColor Green
    } else {
        Write-Host "  MISS - $f" -ForegroundColor Red
        $allGood = $false
    }
}

# Check Named Pipe fix is present in server.js
$serverContent = Get-Content -Path (Join-Path $iisDeploy "server.js") -Raw
if ($serverContent -match "isNaN\(Number\(rawPort\)\)") {
    Write-Host "  OK   - server.js has Named Pipe fix." -ForegroundColor Green
} else {
    Write-Host "  WARN - server.js may be missing Named Pipe fix." -ForegroundColor DarkYellow
}

# Check .next\static has content
$staticFileCount = (Get-ChildItem (Join-Path $iisDeploy ".next\static") -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
if ($staticFileCount -gt 0) {
    Write-Host "  OK   - .next\static has $staticFileCount files." -ForegroundColor Green
} else {
    Write-Host "  WARN - .next\static appears empty." -ForegroundColor DarkYellow
    $allGood = $false
}

$sizeMB = [math]::Round((Get-ChildItem $iisDeploy -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 1)
Write-Host ""
Write-Host "  Bundle size: $sizeMB MB" -ForegroundColor Cyan

if (-not $allGood) {
    Write-Host "  WARN - Some files are missing. Review output above." -ForegroundColor Red
}

# [6/6] Create ZIP
Write-Host ""
Write-Host "[6/6] Creating deployment ZIP..." -ForegroundColor Yellow
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
Compress-Archive -Path "$iisDeploy\*" -DestinationPath $zipFile -Force
$zipSizeMB = [math]::Round((Get-Item $zipFile).Length / 1MB, 1)
Write-Host "  OK - iis-deploy.zip created ($zipSizeMB MB)." -ForegroundColor Green

# Done
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  BUILD COMPLETE" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Package: $zipFile" -ForegroundColor White
Write-Host ""
Write-Host "  SERVER DEPLOYMENT STEPS:" -ForegroundColor Yellow
Write-Host "  1. iisreset /stop" -ForegroundColor White
Write-Host "  2. Extract iis-deploy.zip to: C:\Deployment\Task_Managment\Task_Web\" -ForegroundColor White
Write-Host "  3. In that folder: npm install --omit=dev" -ForegroundColor Cyan
Write-Host "  4. Grant IIS_IUSRS Read+Execute on the folder" -ForegroundColor White
Write-Host "  5. iisreset /start" -ForegroundColor White
Write-Host ""
Write-Host "  Contents of iis-deploy\:" -ForegroundColor DarkGray
Get-ChildItem $iisDeploy | ForEach-Object {
    if ($_.PSIsContainer) {
        Write-Host "    [DIR]  $($_.Name)" -ForegroundColor DarkGray
    } else {
        $kb = [math]::Round($_.Length / 1KB, 1)
        Write-Host "    [FILE] $($_.Name)  ($kb KB)" -ForegroundColor DarkGray
    }
}
Write-Host ""
