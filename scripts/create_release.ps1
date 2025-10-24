# MiniGIS v0.5.0 Release Script

# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Write-Host "=== MiniGIS v0.5.0 Release ===" -ForegroundColor Cyan
Write-Host ""

# Refresh environment
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Check gh CLI
Write-Host "Checking GitHub CLI..." -ForegroundColor Yellow
try {
    $ghVersion = & gh --version 2>&1 | Select-Object -First 1
    Write-Host "[OK] GitHub CLI installed: $ghVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] GitHub CLI not found" -ForegroundColor Red
    exit 1
}

# Check auth
Write-Host "Checking GitHub auth..." -ForegroundColor Yellow
$authStatus = & gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Need to login..." -ForegroundColor Yellow
    & gh auth login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Login failed" -ForegroundColor Red
        exit 1
    }
}
Write-Host "[OK] GitHub authenticated" -ForegroundColor Green
Write-Host ""

# Check MSI file
$msiPath = "target\release\bundle\msi\MiniGIS_0.5.0_x64_zh-CN.msi"
if (-not (Test-Path $msiPath)) {
    Write-Host "[ERROR] MSI not found: $msiPath" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] MSI found: $msiPath" -ForegroundColor Green

# Calculate SHA256
Write-Host "Calculating SHA256..." -ForegroundColor Yellow
$hash = (Get-FileHash $msiPath -Algorithm SHA256).Hash
Write-Host "[OK] SHA256: $hash" -ForegroundColor Green
Write-Host ""

# Create Release Notes (Chinese)
$releaseNotes = @"
# MiniGIS v0.5.0 🎉

## 重大更新

v0.5.0 是一个重要的功能增强版本，带来了专业GIS软件级别的数据管理体验。

### ✨ 新增功能

- ✅ **ArcGIS Pro 风格数据浏览器** - 重构添加数据对话框，提供专业的文件浏览和导航体验
- ✅ **FileGeoDatabase 支持** - 完整支持 ESRI GDB 数据库格式
- ✅ **多地图标签页系统** - 类似 ArcGIS Pro 的多地图管理能力
- ✅ **要素识别增强** - 支持多图层重叠要素的识别和树形导航
- ✅ **会话恢复修复** - 修复了影响用户体验的关键问题
- ✅ **坐标系统简化** - 统一使用 CGCS2000 国家标准坐标系

### 🐛 Bug 修复

- 修复会话被空标签页覆盖的问题
- 修复恢复后图层不显示的问题
- 修复生产构建中 CSP 阻止内联样式的问题

### 📦 下载

**Windows MSI 安装包**

**SHA256校验和**: ``$hash``

### 🔧 系统要求

- Windows 10/11 x64
- 无需预装 GDAL 环境
- 自动配置所有依赖

### 📖 完整说明

详见仓库中的 [RELEASE_NOTES_v0.5.0.md](./docs/releases/RELEASE_NOTES_v0.5.0.md)

### 🎯 快速开始

1. 下载并安装MSI文件
2. 启动MiniGIS
3. 主页 → 添加数据 → 浏览并选择 GIS 数据
4. 尝试创建多个地图标签页
5. 关闭软件后重新打开，体验会话恢复功能

---

**完整变更日志**: [CHANGELOG.md](./CHANGELOG.md)
"@

Write-Host "Creating GitHub Release..." -ForegroundColor Cyan
Write-Host "Version: v0.5.0" -ForegroundColor White
Write-Host "Title: MiniGIS v0.5.0 - 专业数据管理体验" -ForegroundColor White
Write-Host ""

# Create Release
Write-Host "Creating release..." -ForegroundColor Yellow
& gh release create v0.5.0 `
    --title "MiniGIS v0.5.0 - 专业数据管理体验" `
    --notes $releaseNotes `
    --latest `
    $msiPath

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==================================" -ForegroundColor Green
    Write-Host "[SUCCESS] Release created!" -ForegroundColor Green
    Write-Host "==================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Visit: https://github.com/xiaofuX1/MiniGIS/releases" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "[ERROR] Failed to create release" -ForegroundColor Red
    Write-Host "Please check error messages and retry" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Script completed"
