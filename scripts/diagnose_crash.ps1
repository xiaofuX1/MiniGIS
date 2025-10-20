# MiniGIS 闪退问题自动诊断脚本
# 用于检查导致软件闪退的常见问题

param(
    [string]$InstallPath = "C:\Program Files\MiniGIS"
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   MiniGIS 闪退问题自动诊断工具 v1.0" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$issues = @()
$warnings = @()

# 1. 检查安装目录
Write-Host "1. 检查安装目录..." -ForegroundColor Yellow
if (Test-Path $InstallPath) {
    Write-Host "   ✓ 安装目录存在: $InstallPath" -ForegroundColor Green
} else {
    Write-Host "   ✗ 安装目录不存在: $InstallPath" -ForegroundColor Red
    $issues += "安装目录不存在"
    $InstallPath = Read-Host "请输入实际安装路径"
    if (!(Test-Path $InstallPath)) {
        Write-Host ""
        Write-Host "错误: 无法找到MiniGIS安装目录！" -ForegroundColor Red
        exit 1
    }
}

# 2. 检查主程序
Write-Host ""
Write-Host "2. 检查主程序..." -ForegroundColor Yellow
$exePath = Join-Path $InstallPath "minigis.exe"
if (Test-Path $exePath) {
    $exeSize = (Get-Item $exePath).Length / 1MB
    Write-Host "   ✓ minigis.exe 存在 (大小: $([math]::Round($exeSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "   ✗ minigis.exe 不存在！" -ForegroundColor Red
    $issues += "主程序文件缺失"
}

# 3. 检查PROJ数据
Write-Host ""
Write-Host "3. 检查PROJ数据..." -ForegroundColor Yellow
$projDataPath = Join-Path $InstallPath "proj-data"
$projDbPath = Join-Path $projDataPath "proj.db"

if (Test-Path $projDataPath) {
    Write-Host "   ✓ proj-data 目录存在" -ForegroundColor Green
    if (Test-Path $projDbPath) {
        $projDbSize = (Get-Item $projDbPath).Length / 1MB
        if ($projDbSize -gt 5) {
            Write-Host "   ✓ proj.db 存在 (大小: $([math]::Round($projDbSize, 2)) MB)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠ proj.db 文件太小 (大小: $([math]::Round($projDbSize, 2)) MB，预期: ~7MB)" -ForegroundColor Yellow
            $warnings += "proj.db文件可能损坏"
        }
    } else {
        Write-Host "   ✗ proj.db 文件缺失！【严重】" -ForegroundColor Red
        $issues += "proj.db数据库缺失（导致坐标转换失败）"
    }
} else {
    Write-Host "   ✗ proj-data 目录不存在！【严重】" -ForegroundColor Red
    $issues += "PROJ数据目录缺失（导致坐标转换失败）"
}

# 4. 检查GDAL数据
Write-Host ""
Write-Host "4. 检查GDAL数据..." -ForegroundColor Yellow
$gdalDataPath = Join-Path $InstallPath "gdal-data"
if (Test-Path $gdalDataPath) {
    Write-Host "   ✓ gdal-data 目录存在" -ForegroundColor Green
    $gcsFile = Join-Path $gdalDataPath "gcs.csv"
    if (Test-Path $gcsFile) {
        Write-Host "   ✓ 关键数据文件存在 (gcs.csv)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ 关键数据文件缺失 (gcs.csv)" -ForegroundColor Yellow
        $warnings += "GDAL数据文件不完整"
    }
} else {
    Write-Host "   ✗ gdal-data 目录不存在！" -ForegroundColor Red
    $issues += "GDAL数据目录缺失"
}

# 5. 检查DLL文件
Write-Host ""
Write-Host "5. 检查DLL依赖..." -ForegroundColor Yellow
$dllFiles = Get-ChildItem "$InstallPath\*.dll" -ErrorAction SilentlyContinue
$dllCount = $dllFiles.Count

if ($dllCount -ge 50) {
    Write-Host "   ✓ DLL文件数量: $dllCount (正常)" -ForegroundColor Green
} elseif ($dllCount -ge 30) {
    Write-Host "   ⚠ DLL文件数量: $dllCount (偏少，预期: 50+)" -ForegroundColor Yellow
    $warnings += "DLL文件可能不完整"
} else {
    Write-Host "   ✗ DLL文件数量: $dllCount (严重不足，预期: 50+)" -ForegroundColor Red
    $issues += "DLL依赖文件严重缺失"
}

# 检查关键DLL
$criticalDlls = @(
    "gdal*.dll",
    "proj*.dll",
    "geos*.dll",
    "sqlite3.dll",
    "tiff.dll"
)

$missingDlls = @()
foreach ($pattern in $criticalDlls) {
    $found = Get-ChildItem "$InstallPath\$pattern" -ErrorAction SilentlyContinue
    if ($found.Count -eq 0) {
        $missingDlls += $pattern
    }
}

if ($missingDlls.Count -gt 0) {
    Write-Host "   ⚠ 缺少关键DLL: $($missingDlls -join ', ')" -ForegroundColor Yellow
    $warnings += "缺少部分关键DLL"
}

# 6. 检查MSVC运行时
Write-Host ""
Write-Host "6. 检查MSVC运行时..." -ForegroundColor Yellow
$vcRuntimeDlls = @(
    "vcruntime140.dll",
    "vcruntime140_1.dll",
    "msvcp140.dll"
)

$missingVcDlls = @()
foreach ($dll in $vcRuntimeDlls) {
    $systemPath = Join-Path $env:SystemRoot "System32\$dll"
    if (Test-Path $systemPath) {
        Write-Host "   ✓ $dll 存在" -ForegroundColor Green
    } else {
        Write-Host "   ✗ $dll 缺失！" -ForegroundColor Red
        $missingVcDlls += $dll
    }
}

if ($missingVcDlls.Count -gt 0) {
    $issues += "MSVC运行时库缺失: $($missingVcDlls -join ', ')"
}

# 7. 检查系统信息
Write-Host ""
Write-Host "7. 系统信息..." -ForegroundColor Yellow
$osInfo = Get-CimInstance Win32_OperatingSystem
Write-Host "   操作系统: $($osInfo.Caption)" -ForegroundColor Cyan
Write-Host "   版本: $($osInfo.Version)" -ForegroundColor Cyan
Write-Host "   架构: $($osInfo.OSArchitecture)" -ForegroundColor Cyan
Write-Host "   系统语言: $((Get-Culture).DisplayName)" -ForegroundColor Cyan

# 8. 检查日志文件
Write-Host ""
Write-Host "8. 检查日志文件..." -ForegroundColor Yellow
$logPath = "$env:APPDATA\com.xiaofutools.minigis\logs"
if (Test-Path $logPath) {
    $logFiles = Get-ChildItem $logPath -Filter "*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if ($logFiles.Count -gt 0) {
        Write-Host "   ✓ 找到 $($logFiles.Count) 个日志文件" -ForegroundColor Green
        $latestLog = $logFiles[0]
        Write-Host "   最新日志: $($latestLog.Name) ($($latestLog.LastWriteTime))" -ForegroundColor Cyan
        
        # 检查日志中的错误
        $logContent = Get-Content $latestLog.FullName -Tail 100 -ErrorAction SilentlyContinue
        $errorLines = $logContent | Select-String -Pattern "ERROR|严重|失败" -Context 0,1
        if ($errorLines.Count -gt 0) {
            Write-Host "   ⚠ 日志中发现 $($errorLines.Count) 个错误" -ForegroundColor Yellow
            Write-Host "   最近的错误:" -ForegroundColor Yellow
            $errorLines | Select-Object -First 3 | ForEach-Object {
                Write-Host "     $_" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "   ⚠ 未找到日志文件（软件可能未运行过）" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠ 日志目录不存在" -ForegroundColor Yellow
}

# 生成诊断报告
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "              诊断结果总结" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ 未发现明显问题！" -ForegroundColor Green
    Write-Host ""
    Write-Host "如果软件仍然闪退，请：" -ForegroundColor Yellow
    Write-Host "  1. 查看日志文件: $logPath" -ForegroundColor Gray
    Write-Host "  2. 以管理员权限运行MiniGIS" -ForegroundColor Gray
    Write-Host "  3. 尝试不同的数据文件" -ForegroundColor Gray
    Write-Host "  4. 联系开发者，提供日志文件" -ForegroundColor Gray
} else {
    if ($issues.Count -gt 0) {
        Write-Host "🔴 发现 $($issues.Count) 个严重问题：" -ForegroundColor Red
        $issues | ForEach-Object { Write-Host "   • $_" -ForegroundColor Red }
        Write-Host ""
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  发现 $($warnings.Count) 个警告：" -ForegroundColor Yellow
        $warnings | ForEach-Object { Write-Host "   • $_" -ForegroundColor Yellow }
        Write-Host ""
    }
    
    Write-Host "建议解决方案：" -ForegroundColor Cyan
    Write-Host ""
    
    if ($issues -like "*PROJ*" -or $issues -like "*GDAL*") {
        Write-Host "方案1: 重新安装MiniGIS" -ForegroundColor Green
        Write-Host "  1. 卸载当前版本" -ForegroundColor Gray
        Write-Host "  2. 下载最新安装包" -ForegroundColor Gray
        Write-Host "  3. 以管理员权限安装" -ForegroundColor Gray
        Write-Host "  4. 使用默认安装路径" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($issues -like "*MSVC*") {
        Write-Host "方案2: 安装MSVC运行时" -ForegroundColor Green
        Write-Host "  下载并安装: https://aka.ms/vs/17/release/vc_redist.x64.exe" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($warnings -like "*DLL*") {
        Write-Host "方案3: 手动补充DLL文件" -ForegroundColor Green
        Write-Host "  从正常运行的电脑复制所有DLL到: $InstallPath" -ForegroundColor Gray
        Write-Host ""
    }
}

# 生成诊断报告文件
$reportPath = Join-Path $env:TEMP "MiniGIS_Diagnose_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
@"
MiniGIS 闪退问题诊断报告
生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
========================================

系统信息:
  - 操作系统: $($osInfo.Caption)
  - 版本: $($osInfo.Version)
  - 架构: $($osInfo.OSArchitecture)
  - 语言: $((Get-Culture).DisplayName)

安装信息:
  - 安装路径: $InstallPath
  - 主程序: $(if(Test-Path $exePath){"存在"}else{"缺失"})
  - DLL数量: $dllCount

PROJ检查:
  - proj-data目录: $(if(Test-Path $projDataPath){"存在"}else{"缺失"})
  - proj.db文件: $(if(Test-Path $projDbPath){"存在"}else{"缺失"})

GDAL检查:
  - gdal-data目录: $(if(Test-Path $gdalDataPath){"存在"}else{"缺失"})

严重问题 ($($issues.Count)个):
$(if($issues.Count -gt 0){$issues | ForEach-Object {"  - $_"}}else{"  无"})

警告 ($($warnings.Count)个):
$(if($warnings.Count -gt 0){$warnings | ForEach-Object {"  - $_"}}else{"  无"})

日志路径: $logPath
"@ | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host "诊断报告已保存到: $reportPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "如需要进一步帮助，请将此报告发送给开发者。" -ForegroundColor Gray
Write-Host ""

# 询问是否打开报告
$openReport = Read-Host "是否打开诊断报告? (Y/N)"
if ($openReport -eq "Y" -or $openReport -eq "y") {
    Start-Process notepad.exe $reportPath
}

Write-Host ""
Write-Host "诊断完成。" -ForegroundColor Green
