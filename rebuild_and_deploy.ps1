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
$services = @(
    @{ Name = "EXCH"; File = "exchange/docker-compose.prod.yml"; Color = "Green"; UiPath = "exchange/ui" },
    @{ Name = "MD"; File = "marketdata/docker-compose.prod.yml"; Color = "Magenta"; UiPath = "marketdata/ui" },
    @{ Name = "MM"; File = "marketmaker/docker-compose.prod.yml"; Color = "Yellow"; UiPath = "marketmaker/frontend" },
    @{ Name = "ECN"; File = "ecngateway/docker-compose.prod.yml"; Color = "Cyan"; UiPath = "ecngateway/ui" },
    @{ Name = "DEMO"; File = "demo/student-demo/docker-compose.yml"; Color = "Blue"; UiPath = "demo/student-demo/ui" }
)

# 2. Build UIs Locally & Package Docker
foreach ($service in $services) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    Write-Host "[$($service.Name)] Building UI Locally..." -ForegroundColor $service.Color
    
    try {
        # Local Build
        Set-Location "$rootPath/$($service.UiPath)"
        cmd /c "npm install"
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
        
        cmd /c "npm run build"
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
        
        # Docker Package
        Set-Location $rootPath
        Write-Host "[$($service.Name)] Packaging Docker Image..." -ForegroundColor $service.Color
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

# 3. Restart Gateway (Infrastructure)
Write-Host "[Infrastructure] Restarting Portal Gateway..." -ForegroundColor Cyan
Invoke-Expression "docker compose -f infrastructure/docker-compose.infra.yml up -d --force-recreate nginx-portal"
Write-Host "Deployment Complete! Access at http://localhost/" -ForegroundColor Green

Write-Host "All Builds Successful!" -ForegroundColor Green

# 2. Start Infrastructure
Write-Host "[2/6] Starting Infrastructure..."
docker compose -f infrastructure/docker-compose.infra.yml up -d

Write-Host "Waiting 5s for Infrastructure..."
Start-Sleep -Seconds 5

# 3. Start ECN Gateway
Write-Host "[3/6] Starting ECN Gateway..."
docker compose -f ecngateway/docker-compose.prod.yml up -d

# 4. Start Exchange
Write-Host "[4/6] Starting Exchange..."
docker compose -f exchange/docker-compose.prod.yml up -d

# 5. Start Market Data
Write-Host "[5/6] Starting Market Data..."
docker compose -f marketdata/docker-compose.prod.yml up -d

# 6. Start Market Maker
Write-Host "[6/6] Starting Market Maker..."
docker compose -f marketmaker/docker-compose.prod.yml up -d

# 7. Start Student Demo
Write-Host "[7/7] Starting Student Demo..."
docker compose -f demo/student-demo/docker-compose.yml up -d

Write-Host "-------------------------------------------" -ForegroundColor Green
Write-Host "Full Stack Deployed with Proxy Routing!" -ForegroundColor Green
Write-Host "Access everything at: http://localhost"
Write-Host "-------------------------------------------"
