# Rebuild and Deploy Script (Optimized with Streaming Logs)
# 1. Uses .dockerignore
# 2. Parallel Builds with REAL-TIME OUTPUT STREAMING

Write-Host "Optimized Rebuild and Deploy (Parallel + Streaming)..." -ForegroundColor Cyan
$rootPath = $PWD.Path
Write-Host "Working Directory: $rootPath"

# 1. Build Shared Libraries Locally
Write-Host "[0/6] Building Shared Libraries (Host)..." -ForegroundColor Cyan
try {
    Set-Location "$rootPath/packages/ui-core"
    Write-Host "Installing/Building @tradingserver/ui-core..." -ForegroundColor Gray
    cmd /c "npm install"
    cmd /c "npm run build"
    if ($LASTEXITCODE -ne 0) { throw "ui-core build failed" }
} catch {
    Write-Error "Shared Library Build Failed: $_"
    Set-Location $rootPath
    exit 1
}
Set-Location $rootPath

# 1.5 Ensure Network Exists
Write-Host "Checking Docker Network..." -ForegroundColor Cyan
$netCheck = docker network ls --filter name=tradingserver_backbone_net -q
if (-not $netCheck) {
    Write-Host "Creating network tradingserver_backbone_net..." -ForegroundColor Cyan
    docker network create tradingserver_backbone_net
}

# Define services with UI paths
# Define services in the requested start order: MD -> ECN -> EXCH -> MM -> DEMO
$services = @(
    @{ Name = "MD"; File = "marketdata/docker-compose.prod.yml"; Color = "Magenta"; UiPath = "marketdata/ui" },
    @{ Name = "ECN"; File = "ecngateway/docker-compose.prod.yml"; Color = "Cyan"; UiPath = "ecngateway/ui" },
    @{ Name = "EXCH"; File = "exchange/docker-compose.prod.yml"; Color = "Green"; UiPath = "exchange/ui" },
    @{ Name = "MM"; File = "marketmaker/docker-compose.prod.yml"; Color = "Yellow"; UiPath = "marketmaker/frontend" },
    @{ Name = "DEMO"; File = "demo/student-demo/docker-compose.yml"; Color = "Blue"; UiPath = "demo/student-demo/ui" }
)

# 2. Start Infrastructure First
Write-Host "[Infrastructure] Starting Redis, Redpanda, Monitor..." -ForegroundColor Cyan
docker compose -f infrastructure/docker-compose.infra.yml up -d
Write-Host "Waiting 5s for Infrastructure..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# 3. Build & Deploy Application Services
foreach ($service in $services) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    Write-Host "[$($service.Name)] Processing..." -ForegroundColor $service.Color
    
    try {
        # Local Build - Skip for DEMO (relies on Docker context)
        if ($service.Name -ne "DEMO") {
            if (Test-Path "$rootPath/$($service.UiPath)") {
                Write-Host "[$($service.Name)] Building UI Locally..." -ForegroundColor Gray
                Set-Location "$rootPath/$($service.UiPath)"
                cmd /c "npm install"
                if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
                
                cmd /c "npm run build"
                if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
            }
        } 
        
        # Docker Package
        Set-Location $rootPath
        Write-Host "[$($service.Name)] Building Docker Image..." -ForegroundColor Gray
        $buildCmd = "docker compose -f $($service.File) build"
        Invoke-Expression "$buildCmd 2>&1" | ForEach-Object { Write-Host "[$($service.Name)] $_" -ForegroundColor $service.Color }
        if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }

        # Deploy (Start Container)
        Write-Host "[$($service.Name)] Deploying..." -ForegroundColor $service.Color
        $upCmd = "docker compose -f $($service.File) up -d --force-recreate"
        Invoke-Expression "$upCmd 2>&1" | ForEach-Object { Write-Host "[$($service.Name)] $_" -ForegroundColor $service.Color }
        if ($LASTEXITCODE -ne 0) { throw "Docker deploy failed" }

        $sw.Stop()
        Write-Host "[$($service.Name)] Complete ($($sw.Elapsed.TotalSeconds.ToString("F1"))s)" -ForegroundColor Green
    }
    catch {
        Write-Error "[$($service.Name)] Failed: $_"
        Set-Location $rootPath
        exit 1
    }
}

# 4. Final Gateway Restart (to pick up all upstreams)
Write-Host "[Infrastructure] Restarting Portal Gateway..." -ForegroundColor Cyan
Invoke-Expression "docker compose -f infrastructure/docker-compose.infra.yml up -d --force-recreate nginx-portal"

Write-Host "-------------------------------------------" -ForegroundColor Green
Write-Host "Full Stack Deployed!" -ForegroundColor Green
Write-Host "Service Order: Infra -> MarketData -> ECN -> Exchange -> MM -> Demo"
Write-Host "Access at: http://localhost"
Write-Host "-------------------------------------------"
