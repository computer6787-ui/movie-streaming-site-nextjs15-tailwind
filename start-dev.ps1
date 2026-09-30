# CineScope Development Startup Script
# ======================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CineScope Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Dev always runs on 8080. The `start` script deliberately omits -p so Next
# reads $env:PORT, which is what Render sets during deploys; pinning the port
# in either script is what breaks the platform's port scan.
$env:PORT = 8080

# Kill any existing node processes
Write-Host "→ Stopping any existing Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Clean build cache
Write-Host "→ Cleaning build cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
}

Write-Host ""
Write-Host "✓ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Development Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "→ CineScope (port 8080)" -ForegroundColor Magenta
Write-Host ""

# Start CineScope in the background
Write-Host "Starting CineScope on port 8080..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 8

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✓ Server Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access your app at:" -ForegroundColor Cyan
Write-Host "   http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  If you see a white screen, clear the browser cache:" -ForegroundColor Yellow
Write-Host "   F12 → right-click the refresh button → Empty Cache and Hard Reload" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Wait for user to press Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Host "Stopping server..." -ForegroundColor Yellow
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✓ Server stopped" -ForegroundColor Green
}
