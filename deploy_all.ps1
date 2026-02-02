
# Fast Deployment Script (Dependency Aware)
# Matches orchestration logic of rebuild_and_deploy.ps1

$ErrorActionPreference = "Stop"
$rootPath = $PWD.Path

function Start-Service {
    param($file, $name)
    Write-Host "[$name] Starting..." -ForegroundColor Cyan
    docker compose -f $file up -d
    if ($LASTEXITCODE -ne 0) { throw "$name failed to start" }
    Write-Host "[$name] Started." -ForegroundColor Green
}

Write-Host "=== Fast Launch: Trading Server ===" -ForegroundColor Yellow
Write-Host "Mode: Dependency Check & Ordered Startup" -ForegroundColor Gray

# 0. Check Shared Library Dependency
Write-Host "[0/6] Checking Shared Libraries..." -ForegroundColor Cyan
if (-not (Test-Path "$rootPath/packages/ui-core/dist")) {
    Write-Warning "UI Core build missing! Building now..."
    try {
        Set-Location "$rootPath/packages/ui-core"
        cmd /c "npm install"
        cmd /c "npm run build"
        if ($LASTEXITCODE -ne 0) { throw "ui-core build failed" }
        Write-Host "UI Core Built Successfully." -ForegroundColor Green
    } catch {
        Write-Error "Failed to build dependency: $_"
        exit 1
    } finally {
        Set-Location $rootPath
    }
} else {
    Write-Host "UI Core is present." -ForegroundColor Green
}

# 1. Infrastructure
Write-Host "[1/6] Starting Infrastructure..." -ForegroundColor Cyan
Start-Service "infrastructure/docker-compose.infra.yml" "Infrastructure (Redis, Redpanda, HAProxy)"

Write-Host "Waiting 5s for Infrastructure stabilization..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# 2. ECN Gateway (Core API) - Must be up for others to register if needed
Write-Host "[2/6] Starting ECN Gateway..." -ForegroundColor Cyan
Start-Service "ecngateway/docker-compose.prod.yml" "ECN Gateway"

# 3. Exchange (Matching Engine)
Write-Host "[3/6] Starting Exchange..." -ForegroundColor Cyan
Start-Service "exchange/docker-compose.prod.yml" "Exchange (Core)"

# 4. Market Data (Ticker Plant)
Write-Host "[4/6] Starting Market Data..." -ForegroundColor Cyan
Start-Service "marketdata/docker-compose.prod.yml" "Market Data"

# 5. Market Maker (Bot)
Write-Host "[5/6] Starting Market Maker..." -ForegroundColor Cyan
Start-Service "marketmaker/docker-compose.prod.yml" "Market Maker"

# 6. Student Demo
Write-Host "[6/7] Starting Student Demo..." -ForegroundColor Cyan
Start-Service "demo/student-demo/docker-compose.yml" "Student Demo"

# 7. Gateway Restart (Ensure Nginx picks up upstream routes)
Write-Host "[7/7] Connecting Portal..." -ForegroundColor Cyan
docker compose -f infrastructure/docker-compose.infra.yml up -d --force-recreate nginx-portal
Write-Host "[Gateway] Ready." -ForegroundColor Green

Write-Host "-------------------------------------------" -ForegroundColor Green
Write-Host "Full Stack Deployed!" -ForegroundColor Green
Write-Host "Access at: http://localhost/"
Write-Host "-------------------------------------------"
