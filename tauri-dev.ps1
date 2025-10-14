# MiniGIS Tauri Development Script
# Automatically sets GDAL PATH and starts dev server

Write-Host "Setting up GDAL environment..." -ForegroundColor Cyan

# Add GDAL bin to PATH
$env:PATH = "C:\vcpkg\installed\x64-windows\bin;$env:PATH"
$env:GDAL_DATA = "C:\vcpkg\installed\x64-windows\share\gdal"
$env:PROJ_LIB = "C:\vcpkg\installed\x64-windows\share\proj"
$env:PROJ_DATA = "C:\vcpkg\installed\x64-windows\share\proj"

Write-Host "GDAL environment configured" -ForegroundColor Green
Write-Host "Starting Tauri dev server..." -ForegroundColor Cyan
Write-Host ""

# Run tauri dev
npm run tauri:dev
