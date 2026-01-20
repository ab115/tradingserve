
# Fast Deployment Script (No Build)
# Starts containers in dependency order.

$ErrorActionPreference = "Stop"

function Start-Service {
    param($file, $name)
    Write-Host "[$name] Starting..." -ForegroundColor Cyan
    docker compose -f $file up -d
    if ($LASTEXITCODE -ne 0) { throw "$name failed to start" }
    Write-Host "[$name] Started." -ForegroundColor Green
}

Write-Host "=== Fast Launch: Trading Server ===" -ForegroundColor Yellow

# 1. Infrastructure
Start-Service "infrastructure/docker-compose.infra.yml" "Infrastructure (Redis, Redpanda, HAProxy)"

# 2. Services (Order matters for dependency availability)
Start-Service "exchange/docker-compose.prod.yml" "Exchange (Core)"
Start-Service "marketdata/docker-compose.prod.yml" "Market Data"
Start-Service "marketmaker/docker-compose.prod.yml" "Market Maker"
Start-Service "ecngateway/docker-compose.prod.yml" "ECN Gateway"

# 3. Gateway
Write-Host "[Gateway] Restarting Portal..." -ForegroundColor Cyan
docker compose -f infrastructure/docker-compose.infra.yml up -d --force-recreate nginx-portal
Write-Host "[Gateway] Ready." -ForegroundColor Green

Write-Host "`nAll Systems Go!" -ForegroundColor Green
Write-Host "Portal: http://localhost/" -ForegroundColor Green
