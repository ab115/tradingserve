
# Start Demo App (EduLab React + Backend)

$ErrorActionPreference = "Stop"
$rootPath = $PWD.Path

Write-Host "=== Starting FinTech Demo App ===" -ForegroundColor Cyan

# 1. Check Network
if (-not (docker network ls --format "{{.Name}}" | Select-String "tradingserver_backbone_net")) {
    Write-Warning "Trading Server network not found!"
    Write-Warning "Please run '.\deploy_all.ps1' first to start the main infrastructure."
    exit 1
}

# 2. Build & Deploy
Set-Location "$rootPath/demo"
try {
    Write-Host "Building and Starting Containers..." -ForegroundColor Yellow
    # Explicitly use the docker-compose in the demo folder
    docker compose up -d --build
    
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose failed" }
    
    Write-Host "Demo App Started Successfully!" -ForegroundColor Green
    Write-Host "URL: http://localhost:3006/" -ForegroundColor Green
}
catch {
    Write-Error "Failed to start Demo App: $_"
}
finally {
    Set-Location $rootPath
}
