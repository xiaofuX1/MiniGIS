# MiniGIS v0.2.0 自动发布脚本

Write-Host "=== MiniGIS v0.2.0 发布脚本 ===" -ForegroundColor Cyan
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
$msiPath = "target\release\bundle\msi\MiniGIS_0.2.0_x64_zh-CN.msi"
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

# 创建Release Notes
$releaseNotes = @"
# MiniGIS v0.2.0 🎉

## 重大更新

v0.2.0 是 MiniGIS 的一个重要里程碑版本，带来了完整的 GDAL 支持和大量性能改进。

### ✨ 新增功能

- ✅ **GDAL 完整集成** - 支持 Shapefile、GeoJSON、GeoPackage 等格式
- ✅ **MapLibre GL 引擎** - 硬件加速渲染，性能提升 10 倍
- ✅ **符号系统** - 完整的点/线/面符号自定义
- ✅ **测量工具** - 距离、面积测量
- ✅ **MSI 安装包** - 企业级 Windows 安装程序

### 📦 下载

**Windows MSI 安装包**

**SHA256校验和**:
```
$hash
```

### 🔧 系统要求

- Windows 10/11 x64
- 无需预装 GDAL 环境
- 自动配置所有依赖

### 📖 完整说明

详见仓库中的 [RELEASE_NOTES_v0.2.0.md](./RELEASE_NOTES_v0.2.0.md)

### 🎯 快速开始

1. 下载并安装MSI文件
2. 启动MiniGIS
3. 主页 → 添加数据 → 选择shp/geojson文件
4. 开始使用！

---

**完整变更日志**: [CHANGELOG.md](./CHANGELOG.md)
"@

# 保存Release Notes到文件
$releaseNotes | Out-File -FilePath "RELEASE_NOTES_TEMP.md" -Encoding UTF8

Write-Host "准备创建GitHub Release..." -ForegroundColor Cyan
Write-Host "版本: v0.2.0" -ForegroundColor White
Write-Host "标题: MiniGIS v0.2.0 - GDAL完整支持" -ForegroundColor White
Write-Host ""

# 创建Release
Write-Host "正在创建Release..." -ForegroundColor Yellow
& gh release create v0.2.0 `
    --title "MiniGIS v0.2.0 - GDAL完整支持" `
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
