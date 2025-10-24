@echo off
chcp 65001 >nul
echo ====================================
echo MiniGIS Release Script
echo ====================================
echo.

REM Check if version is provided
if "%1"=="" (
    echo Error: Version not specified
    echo Usage: release.bat VERSION
    echo Example: release.bat 0.5.0
    exit /b 1
)

set VERSION=%1
set MSI_FILE=target\release\bundle\msi\MiniGIS_%VERSION%_x64_zh-CN.msi
set NOTES_FILE=release_notes.md

REM Check if MSI exists
if not exist "%MSI_FILE%" (
    echo Error: MSI file not found: %MSI_FILE%
    echo Please build the project first: npm run tauri:build
    exit /b 1
)

REM Check if release notes exist
if not exist "%NOTES_FILE%" (
    echo Error: Release notes not found: %NOTES_FILE%
    echo Please create release_notes.md with Chinese content
    exit /b 1
)

echo [OK] MSI found: %MSI_FILE%
echo [OK] Release notes found: %NOTES_FILE%
echo.

REM Calculate SHA256
echo Calculating SHA256...
for /f %%i in ('powershell -command "(Get-FileHash '%MSI_FILE%' -Algorithm SHA256).Hash"') do set SHA256=%%i
echo SHA256: %SHA256%
echo.

echo Creating GitHub Release v%VERSION%...
gh release create v%VERSION% --title "MiniGIS v%VERSION%" --notes-file "%NOTES_FILE%" --latest "%MSI_FILE%"

if %ERRORLEVEL%==0 (
    echo.
    echo ====================================
    echo Release Created Successfully!
    echo ====================================
    echo.
    echo Visit: https://github.com/xiaofuX1/MiniGIS/releases
) else (
    echo.
    echo Error: Failed to create release
    exit /b 1
)

echo.
pause
