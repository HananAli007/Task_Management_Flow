# ============================================================
# ProjectFlow Full Build & IIS Deploy Script
# ============================================================
# Port Layout:
#   Frontend (Next.js via iisnode) : http://192.168.18.69:80
#   Backend  (.NET API / Kestrel)  : http://192.168.18.69:8080
#   Localhost Dev Frontend         : http://localhost:3000
#   Localhost Dev Backend          : http://localhost:5000
# ============================================================

param(
    [string]$ServerIP = "192.168.18.69",
    [int]$FrontendPort = 80,
    [int]$BackendPort = 8080,
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$SkipDeploy
)

$ErrorActionPreference = "Stop"
$rootDir   = Split-Path -Parent $PSScriptRoot
$webDir    = "$rootDir\ProjectFlow.Web"
$apiDir    = "$rootDir\ProjectFlow.API"
$deployDir = "$webDir\iis-deploy"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  ProjectFlow Build & Deploy" -ForegroundColor Cyan
Write-Host "  Target Server: $ServerIP" -ForegroundColor Cyan
Write-Host "  Frontend Port: $FrontendPort" -ForegroundColor Cyan
Write-Host "  Backend Port : $BackendPort" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# ──────────────────────────────────────────
# 1. BUILD FRONTEND (Next.js)
# ──────────────────────────────────────────
if (-not $SkipFrontend) {
    Write-Host "[1/4] Building Frontend (Next.js)..." -ForegroundColor Yellow
    Set-Location $webDir

    # Update .env.production with the correct backend URL
    $envProdContent = @"
# IIS Production
# Frontend runs on: http://$ServerIP`:$FrontendPort
# Backend  runs on: http://$ServerIP`:$BackendPort
NEXT_PUBLIC_API_URL=http://$ServerIP`:$BackendPort
"@
    Set-Content -Path "$webDir\.env.production" -Value $envProdContent

    Write-Host "Using API URL: http://$ServerIP`:$BackendPort" -ForegroundColor Gray

    $env:NODE_ENV = "production"
    $env:NODE_OPTIONS = "--max-old-space-size=8192"

    & npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Frontend build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Frontend build complete." -ForegroundColor Green
} else {
    Write-Host "[1/4] Skipping Frontend build." -ForegroundColor DarkGray
}

# ──────────────────────────────────────────
# 2. BUILD BACKEND (.NET)
# ──────────────────────────────────────────
if (-not $SkipBackend) {
    Write-Host ""
    Write-Host "[2/4] Building Backend (.NET API)..." -ForegroundColor Yellow
    Set-Location $apiDir

    # Ensure appsettings.json has the correct port for production
    # (Though it's usually handled by IIS binding, Kestrel might need it if running standalone)
    
    & dotnet publish -c Release -o "$apiDir\publish" --nologo
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Backend build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Backend build complete." -ForegroundColor Green
} else {
    Write-Host "[2/4] Skipping Backend build." -ForegroundColor DarkGray
}

# ──────────────────────────────────────────
# 3. PREPARE IIS DEPLOY FOLDER (Frontend)
# ──────────────────────────────────────────
if (-not $SkipDeploy) {
    Write-Host ""
    Write-Host "[3/4] Preparing iis-deploy folder..." -ForegroundColor Yellow

    if (-not (Test-Path $deployDir)) { New-Item -ItemType Directory -Path $deployDir | Out-Null }

    # Clear old deploy except node_modules (saves time on server)
    Get-ChildItem -Path $deployDir -Exclude "node_modules" |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

    # Copy standalone build output
    $standaloneDir = "$webDir\.next\standalone"
    if (-not (Test-Path $standaloneDir)) {
        Write-Host "ERROR: .next\standalone not found. Ensure 'output: standalone' is in next.config.js" -ForegroundColor Red
        exit 1
    }

    Copy-Item -Path "$standaloneDir\*" -Destination $deployDir -Recurse -Force

    # Patch server.js to support iisnode named pipes (since process.env.PORT starts with '\\.\pipe\')
    $serverJsPath = "$deployDir\server.js"
    if (Test-Path $serverJsPath) {
        $content = Get-Content -Path $serverJsPath -Raw
        $oldPortPattern = "const currentPort = parseInt(process.env.PORT, 10) || 3000"
        $newPortPattern = "const currentPort = (process.env.PORT && isNaN(Number(process.env.PORT))) ? process.env.PORT : (parseInt(process.env.PORT, 10) || 3000)"
        $content = $content.Replace($oldPortPattern, $newPortPattern)
        Set-Content -Path $serverJsPath -Value $content -Force
        Write-Host "Patched server.js for iisnode named pipes successfully." -ForegroundColor Green
    }

    # Copy static assets (not included in standalone)
    $staticDest = "$deployDir\.next\static"
    if (-not (Test-Path $staticDest)) { New-Item -ItemType Directory -Path $staticDest | Out-Null }
    Copy-Item -Path "$webDir\.next\static\*" -Destination $staticDest -Recurse -Force

    # Copy public folder
    $publicSrc = "$webDir\public"
    if (Test-Path $publicSrc) {
        Copy-Item -Path $publicSrc -Destination $deployDir -Recurse -Force
    }

    # Copy web.config, iisnode.yml and .env.production
    Copy-Item -Path "$webDir\web.config"        -Destination $deployDir -Force
    if (Test-Path "$webDir\iisnode.yml") {
        Copy-Item -Path "$webDir\iisnode.yml"   -Destination $deployDir -Force
    }
    Copy-Item -Path "$webDir\.env.production"   -Destination $deployDir -Force

    # Copy package.json
    Copy-Item -Path "$webDir\package.json"      -Destination $deployDir -Force

    Write-Host "iis-deploy folder ready." -ForegroundColor Green

    # ──────────────────────────────────────────
    # 4. ZIP for easy upload to IIS server
    # ──────────────────────────────────────────
    Write-Host ""
    Write-Host "[4/4] Creating deployment ZIP..." -ForegroundColor Yellow

    $zipPath = "$webDir\iis-deploy.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $exclude = @("node_modules")

    $zipFile = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
    Get-ChildItem -Path $deployDir -Recurse | Where-Object {
        $relative = $_.FullName.Substring($deployDir.Length + 1)
        if ($relative -eq "") { return $false }
        $topFolder = $relative.Split([IO.Path]::DirectorySeparatorChar)[0]
        $topFolder -notin $exclude -and -not $_.PSIsContainer
    } | ForEach-Object {
        $relative = $_.FullName.Substring($deployDir.Length + 1)
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zipFile, $_.FullName, $relative
        ) | Out-Null
    }
    $zipFile.Dispose()

    Write-Host "ZIP created: $zipPath" -ForegroundColor Green
} else {
    Write-Host "[3/4] Skipping deploy folder preparation." -ForegroundColor DarkGray
    Write-Host "[4/4] Skipping ZIP creation." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  Build & Deploy Prep Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Deployment Instructions for $ServerIP`:" -ForegroundColor Cyan
Write-Host "  FRONTEND (Port $FrontendPort`):" -ForegroundColor White
Write-Host "    1. Copy 'iis-deploy.zip' contents to 'C:\inetpub\wwwroot\ProjectFlow.Web'" -ForegroundColor Gray
Write-Host "    2. Run 'npm install --omit=dev' in that folder" -ForegroundColor Gray
Write-Host "    3. Ensure 'iisnode' and 'URL Rewrite' modules are installed in IIS" -ForegroundColor Gray
Write-Host "    4. Create IIS site bound to port $FrontendPort" -ForegroundColor Gray
Write-Host ""
Write-Host "  BACKEND (Port $BackendPort`):" -ForegroundColor White
Write-Host "    1. Copy '$apiDir\publish' contents to 'C:\inetpub\wwwroot\ProjectFlow.API'" -ForegroundColor Gray
Write-Host "    2. Create IIS site bound to port $BackendPort" -ForegroundColor Gray
Write-Host "    3. Ensure .NET Core Hosting Bundle is installed" -ForegroundColor Gray
Write-Host ""
