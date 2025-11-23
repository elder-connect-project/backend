# Backend Server Start Script
# This script handles common errors and starts the server

Write-Host "🚀 Starting ElderConnect Backend Server..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if .env exists
if (!(Test-Path .env)) {
    Write-Host "⚠️  .env file not found!" -ForegroundColor Yellow
    Write-Host "📝 Creating .env from ENV_EXAMPLE.txt..." -ForegroundColor Yellow
    Copy-Item ENV_EXAMPLE.txt .env
    Write-Host "✅ .env file created. Please update with your values." -ForegroundColor Green
}

# Step 2: Kill existing processes on port 5000
Write-Host "🔍 Checking port 5000..." -ForegroundColor Cyan
$portProcess = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($portProcess) {
    Write-Host "⚠️  Port 5000 is in use. Killing process..." -ForegroundColor Yellow
    $portProcess | Select-Object -ExpandProperty OwningProcess | ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    Write-Host "✅ Port 5000 cleared." -ForegroundColor Green
}

# Step 3: Kill all Node processes (optional cleanup)
Write-Host "🧹 Cleaning up Node processes..." -ForegroundColor Cyan
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Step 4: Check if node_modules exists
if (!(Test-Path node_modules)) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
}

# Step 5: Check MongoDB connection (basic check)
Write-Host "🔍 Checking MongoDB..." -ForegroundColor Cyan
$mongoProcess = Get-Process -Name mongod -ErrorAction SilentlyContinue
if (!$mongoProcess) {
    Write-Host "⚠️  MongoDB may not be running!" -ForegroundColor Yellow
    Write-Host "   Please ensure MongoDB is started before continuing." -ForegroundColor Yellow
    Write-Host "   The server will still start but may fail to connect." -ForegroundColor Yellow
}

# Step 6: Start the server
Write-Host ""
Write-Host "🚀 Starting server..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

node server.js

