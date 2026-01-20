param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("exchange", "marketdata", "marketmaker", "ecn", "all")]
    [string]$Target
)

$ErrorActionPreference = "Stop"
$rootPath = $PWD.Path
Write-Host "Starting Targeted Deployment for: $Target" -ForegroundColor Cyan

# Service Configuration Mapping
$serviceConfig = @{
    "exchange"    = @{ Name = "EXCH"; File = "exchange/docker-compose.prod.yml"; Color = "Green"; UiPath = "exchange/ui" }
    "marketdata"  = @{ Name = "MD"; File = "marketdata/docker-compose.prod.yml"; Color = "Magenta"; UiPath = "marketdata/ui" }
    "marketmaker" = @{ Name = "MM"; File = "marketmaker/docker-compose.prod.yml"; Color = "Yellow"; UiPath = "marketmaker/frontend" }
    "ecn"         = @{ Name = "ECN"; File = "ecngateway/docker-compose.prod.yml"; Color = "Cyan"; UiPath = "ecngateway/ui" }
}

# 1. Build Shared Libraries (Dependency)
# We always build this to ensure local node_modules are fresh for the host build
Write-Host "[Dependency] Building Shared Libraries (@tradingserver/ui-core)..." -ForegroundColor Gray
try {
    Set-Location "$rootPath/packages/ui-core"
    cmd /c "npm install"
    cmd /c "npm run build"
    if ($LASTEXITCODE -ne 0) { throw "ui-core build failed" }
    Set-Location $rootPath
} catch {
    Write-Error "Dependency Build Failed: $_"
    Set-Location $rootPath
    exit 1
}

# 2. Determine Services to Build
$servicesToBuild = @()
if ($Target -eq "all") {
    $servicesToBuild = $serviceConfig.Values
} else {
    if ($serviceConfig.ContainsKey($Target)) {
        $servicesToBuild += $serviceConfig[$Target]
    } else {
        Write-Error "Unknown target: $Target"
        exit 1
    }
}

# 3. Build and Deploy Selected Services
foreach ($service in $servicesToBuild) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    Write-Host "[$($service.Name)] Building UI Locally..." -ForegroundColor $service.Color
    
    try {
        # A. Local Build (Host)
        Set-Location "$rootPath/$($service.UiPath)"
        cmd /c "npm install"
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
        cmd /c "npm run build"
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
        Set-Location $rootPath

        # B. Docker Package
        Write-Host "[$($service.Name)] Packaging Docker Image..." -ForegroundColor $service.Color
        $buildCmd = "docker compose -f $($service.File) build"
        Invoke-Expression "$buildCmd"
        if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }

        # C. Deploy (Force Recreate)
        Write-Host "[$($service.Name)] Deploying Container..." -ForegroundColor $service.Color
        $upCmd = "docker compose -f $($service.File) up -d --force-recreate"
        Invoke-Expression "$upCmd"
        if ($LASTEXITCODE -ne 0) { throw "Docker deploy failed" }

        $sw.Stop()
        Write-Host "[$($service.Name)] Ready ($($sw.Elapsed.TotalSeconds.ToString("F1"))s)" -ForegroundColor Green
    } catch {
        Write-Error "[$($service.Name)] Failed: $_"
        Set-Location $rootPath
        exit 1
    }
}

# 4. Refresh Portal Gateway (to ensure upstream DNS is valid)
Write-Host "[Infrastructure] Refreshing Portal Gateway..." -ForegroundColor Cyan
try {
    docker compose -f infrastructure/docker-compose.infra.yml up -d --no-deps nginx-portal
} catch {
    Write-Warning "Could not restart nginx-portal. It might be down."
}

Write-Host "Targeted Deployment Complete!" -ForegroundColor Green
