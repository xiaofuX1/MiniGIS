# MiniGIS v0.5.0 自动发布脚本

Write-Host "=== MiniGIS v0.5.0 发布脚本 ===" -ForegroundColor Cyan
Write-Host ""

# 刷新环境变量
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 检查gh命令
Write-Host "检查GitHub CLI..." -ForegroundColor Yellow
try {
    $ghVersion = & gh --version 2>&1 | Select-Object -First 1
    Write-Host "✓ GitHub CLI已安装: $ghVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ GitHub CLI未找到，请重新打开PowerShell" -ForegroundColor Red
    exit 1
}

# 检查认证状态
Write-Host "检查GitHub认证状态..." -ForegroundColor Yellow
$authStatus = & gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "需要登录GitHub..." -ForegroundColor Yellow
    Write-Host "正在启动浏览器登录..." -ForegroundColor Cyan
    & gh auth login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ 登录失败" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✓ GitHub认证成功" -ForegroundColor Green
Write-Host ""

# 检查MSI文件
$msiPath = "target\release\bundle\msi\MiniGIS_0.5.0_x64_zh-CN.msi"
if (-not (Test-Path $msiPath)) {
    Write-Host "✗ 找不到MSI文件: $msiPath" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 找到MSI文件: $msiPath" -ForegroundColor Green

# 计算SHA256
Write-Host "计算SHA256校验和..." -ForegroundColor Yellow
$hash = (Get-FileHash $msiPath -Algorithm SHA256).Hash
Write-Host "✓ SHA256: $hash" -ForegroundColor Green
Write-Host ""

# 创建Release Notes（中文）
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

# 保存Release Notes到文件
$releaseNotes | Out-File -FilePath "RELEASE_NOTES_TEMP.md" -Encoding UTF8

Write-Host "准备创建GitHub Release..." -ForegroundColor Cyan
Write-Host "版本: v0.5.0" -ForegroundColor White
Write-Host "标题: MiniGIS v0.5.0 - 专业数据管理体验" -ForegroundColor White
Write-Host ""

# 创建Release
Write-Host "正在创建Release..." -ForegroundColor Yellow
& gh release create v0.5.0 `
    --title "MiniGIS v0.5.0 - 专业数据管理体验" `
    --notes-file "RELEASE_NOTES_TEMP.md" `
    --latest `
    $msiPath

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==================================" -ForegroundColor Green
    Write-Host "✅ Release 创建成功！" -ForegroundColor Green
    Write-Host "==================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "访问: https://github.com/xiaofuX1/MiniGIS/releases" -ForegroundColor Cyan
    
    # 清理临时文件
    Remove-Item "RELEASE_NOTES_TEMP.md" -ErrorAction SilentlyContinue
} else {
    Write-Host ""
    Write-Host "✗ Release 创建失败" -ForegroundColor Red
    Write-Host "请检查错误信息并重试" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "脚本执行完成"
