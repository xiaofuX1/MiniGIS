# GDAL Environment Check Script
# Verify vcpkg GDAL installation

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GDAL 3.8.5 Environment Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$vcpkgRoot = "C:\vcpkg"
$triplet = "x64-windows"
$gdalVersion = "3.8.5"

$allChecks = @()

# Check vcpkg directory
Write-Host "[1/8] Check vcpkg directory..." -NoNewline
if (Test-Path $vcpkgRoot) {
    Write-Host " [OK]" -ForegroundColor Green
    $allChecks += $true
} else {
    Write-Host " [FAIL]" -ForegroundColor Red
    Write-Host "      Error: vcpkg directory not found: $vcpkgRoot" -ForegroundColor Red
    $allChecks += $false
}

# Check GDAL library file
Write-Host "[2/8] Check GDAL library file..." -NoNewline
$gdalLib = "$vcpkgRoot\installed\$triplet\lib\gdal.lib"
if (Test-Path $gdalLib) {
    $libSize = (Get-Item $gdalLib).Length / 1MB
    $sizeStr = [math]::Round($libSize, 2)
    Write-Host " [OK] ($sizeStr MB)" -ForegroundColor Green
    $allChecks += $true
} else {
    Write-Host " [FAIL]" -ForegroundColor Red
    Write-Host "      Error: GDAL library not found: $gdalLib" -ForegroundColor Red
    $allChecks += $false
}

# Check GDAL DLL
Write-Host "[3/8] Check GDAL DLL..." -NoNewline
$gdalDlls = Get-ChildItem "$vcpkgRoot\installed\$triplet\bin\gdal*.dll" -ErrorAction SilentlyContinue
if ($gdalDlls) {
    Write-Host " [OK] (Found $($gdalDlls.Count) files)" -ForegroundColor Green
    foreach ($dll in $gdalDlls) {
        Write-Host "      - $($dll.Name)" -ForegroundColor Gray
    }
    $allChecks += $true
} else {
    Write-Host " [FAIL]" -ForegroundColor Red
    Write-Host "      Error: GDAL DLL not found" -ForegroundColor Red
    $allChecks += $false
}

# Check GDAL header files
Write-Host "[4/8] Check GDAL header files..." -NoNewline
$gdalHeader = "$vcpkgRoot\installed\$triplet\include\gdal.h"
if (Test-Path $gdalHeader) {
    Write-Host " [OK]" -ForegroundColor Green
    $allChecks += $true
} else {
    Write-Host " [FAIL]" -ForegroundColor Red
    Write-Host "      Error: GDAL header not found: $gdalHeader" -ForegroundColor Red
    $allChecks += $false
}

# Check GDAL data files
Write-Host "[5/8] Check GDAL data files..." -NoNewline
$gdalDataDir = "$vcpkgRoot\installed\$triplet\share\gdal"
if (Test-Path $gdalDataDir) {
    $dataFiles = (Get-ChildItem $gdalDataDir -File).Count
    Write-Host " [OK] ($dataFiles files)" -ForegroundColor Green
    $allChecks += $true
} else {
    Write-Host " [FAIL]" -ForegroundColor Red
    Write-Host "      Error: GDAL data directory not found: $gdalDataDir" -ForegroundColor Red
    $allChecks += $false
}

# Check dependency DLLs
Write-Host "[6/8] Check dependency DLLs..." -NoNewline
$requiredDlls = @("proj_9.dll", "geos.dll", "geos_c.dll", "sqlite3.dll", "zlib1.dll")
$missingDlls = @()
foreach ($dll in $requiredDlls) {
    if (-not (Test-Path "$vcpkgRoot\installed\$triplet\bin\$dll")) {
        $missingDlls += $dll
    }
}
if ($missingDlls.Count -eq 0) {
    Write-Host " [OK]" -ForegroundColor Green
    $allChecks += $true
} else {
    Write-Host " [FAIL]" -ForegroundColor Red
    Write-Host "      Missing dependencies: $($missingDlls -join ', ')" -ForegroundColor Red
    $allChecks += $false
}

# Check project files
Write-Host "[7/8] Check project config files..." -NoNewline
$buildRs = "src-tauri\build.rs"
$cargoToml = "src-tauri\Cargo.toml"
$tauriConf = "src-tauri\tauri.conf.json"

if ((Test-Path $buildRs) -and (Test-Path $cargoToml) -and (Test-Path $tauriConf)) {
    Write-Host " [OK]" -ForegroundColor Green
    $allChecks += $true
} else {
    Write-Host " [FAIL]" -ForegroundColor Red
    Write-Host "      Error: Project config files missing" -ForegroundColor Red
    $allChecks += $false
}

# Check GDAL service modules
Write-Host "[8/8] Check GDAL service modules..." -NoNewline
$gdalService = "src-tauri\src\services\gdal_service.rs"
$gdalCommands = "src-tauri\src\commands\gdal.rs"
$gdalInit = "src-tauri\src\gis\gdal_init.rs"

if ((Test-Path $gdalService) -and (Test-Path $gdalCommands) -and (Test-Path $gdalInit)) {
    Write-Host " [OK]" -ForegroundColor Green
    $allChecks += $true
} else {
    Write-Host " [FAIL]" -ForegroundColor Red
    Write-Host "      Error: GDAL service modules missing" -ForegroundColor Red
    $allChecks += $false
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Summary
$passedChecks = ($allChecks | Where-Object { $_ -eq $true }).Count
$totalChecks = $allChecks.Count

Write-Host "Result: $passedChecks / $totalChecks passed" -ForegroundColor $(if ($passedChecks -eq $totalChecks) { "Green" } else { "Yellow" })

if ($passedChecks -eq $totalChecks) {
    Write-Host ""
    Write-Host "[SUCCESS] Environment check completed! GDAL is properly configured." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run dev server: npm run tauri:dev" -ForegroundColor White
    Write-Host "  2. Build release: npm run tauri:build" -ForegroundColor White
    Write-Host ""
    exit 0
} else {
    Write-Host ""
    Write-Host "[FAILED] Environment check failed! Please fix the issues above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Cyan
    Write-Host "  1. Ensure vcpkg is installed at C:\vcpkg" -ForegroundColor White
    Write-Host "  2. Run: vcpkg install gdal:x64-windows" -ForegroundColor White
    Write-Host "  3. Check project files are complete" -ForegroundColor White
    Write-Host ""
    exit 1
}
