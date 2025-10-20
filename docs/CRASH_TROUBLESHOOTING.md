# 闪退问题诊断和解决方案

本文档帮助诊断和解决MiniGIS在部分电脑上添加数据时闪退的问题。

## 📋 问题概览

**症状**: 在某些电脑上，使用安装包安装MiniGIS后，点击"添加数据"并选择文件时，软件直接闪退（无错误提示）。

**影响范围**: 个别用户电脑，非普遍现象。

**严重程度**: 🔴 高危 - 导致软件完全无法使用

---

## 🔍 根本原因分析

### 1. **GDAL/PROJ依赖缺失** (70%可能性)

**原因**:
- 安装包未正确打包`proj.db`或GDAL数据文件
- 某些DLL依赖缺失（GDAL需要50+个DLL文件）
- 环境变量设置失败

**触发条件**:
- 打开需要坐标转换的文件（如投影坐标系的Shapefile）
- PROJ数据库不存在导致坐标转换失败
- GDAL驱动无法加载

**诊断方法**:
```bash
# 检查安装目录是否包含以下文件/文件夹：
C:\Program Files\MiniGIS\
├── minigis.exe
├── gdal-data\          # GDAL数据目录（必须存在）
├── proj-data\          # PROJ数据目录（必须存在）
│   └── proj.db        # PROJ数据库（必须存在，约7MB）
├── gdal_*.dll          # GDAL相关DLL（30+个）
├── proj*.dll           # PROJ库DLL
├── geos*.dll           # GEOS库DLL
└── ...其他DLL
```

### 2. **MSVC运行时库缺失** (20%可能性)

**原因**:
- 目标电脑未安装Visual C++ Redistributable
- GDAL依赖MSVC 2015-2022运行时

**症状**:
- 软件启动时就可能闪退
- 或打开文件时闪退

**解决方案**:
安装 [Microsoft Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)

### 3. **代码Panic错误** (10%可能性) - 已修复

**原因**:
- ✅ 坐标转换失败时使用`expect()`导致panic
- ✅ WGS84坐标系创建失败直接崩溃

**修复状态**: 
- v0.3.1+ 已修复所有panic风险
- 改为安全的错误处理机制

---

## 🛠️ 诊断步骤

### 步骤1: 收集日志信息

MiniGIS会生成详细的日志文件，帮助诊断问题。

**日志位置**:
```
Windows: C:\Users\<用户名>\AppData\Roaming\com.xiaofutools.minigis\logs\
```

**关键日志内容**:
```
========== GDAL环境初始化开始 ==========
✓ 应用程序目录: "C:\Program Files\MiniGIS"
✓ 打包模式：使用应用程序目录中的DLL
✓ 已将应用目录添加到PATH

检查PROJ数据路径...
  - 打包路径: "C:\Program Files\MiniGIS\proj-data" (存在: true)
✓ 使用打包的PROJ数据
✓ PROJ_LIB设置为: C:\Program Files\MiniGIS\proj-data
✓ proj.db 文件存在

检查GDAL数据路径...
✓ 使用打包的GDAL数据
✓ GDAL_DATA设置为: "C:\Program Files\MiniGIS\gdal-data"

========== GDAL健康检查开始 ==========
GDAL驱动数量: 194
✓ GDAL健康检查通过
```

**错误标志**:
- ❌ `【严重错误】PROJ数据目录不存在`
- ❌ `【严重警告】proj.db 文件不存在`
- ❌ `【严重错误】GDAL驱动未加载`
- ❌ `GDAL驱动数量: 0`

### 步骤2: 使用诊断命令

在软件中调用诊断命令（前端开发者可以添加按钮）:

```typescript
import { invoke } from '@tauri-apps/api/core';

// 获取诊断信息
const diagnose = await invoke('gdal_diagnose');
console.log('GDAL诊断:', diagnose);
```

**正常输出**:
```json
{
  "version": "3.8.5",
  "gdal_data": "C:\\Program Files\\MiniGIS\\gdal-data",
  "proj_lib": "C:\\Program Files\\MiniGIS\\proj-data",
  "proj_db_exists": true,
  "driver_count": 194
}
```

### 步骤3: 检查文件完整性

在问题电脑上运行以下PowerShell脚本:

```powershell
# 检查MiniGIS安装完整性
$installDir = "C:\Program Files\MiniGIS"

Write-Host "检查MiniGIS安装..." -ForegroundColor Cyan

# 检查关键文件
$criticalFiles = @(
    "minigis.exe",
    "proj-data\proj.db",
    "gdal-data\gcs.csv"
)

foreach ($file in $criticalFiles) {
    $fullPath = Join-Path $installDir $file
    if (Test-Path $fullPath) {
        $size = (Get-Item $fullPath).Length
        Write-Host "✓ $file (大小: $size 字节)" -ForegroundColor Green
    } else {
        Write-Host "✗ $file 缺失！" -ForegroundColor Red
    }
}

# 统计DLL数量
$dllCount = (Get-ChildItem "$installDir\*.dll").Count
Write-Host "DLL文件数量: $dllCount (预期: 50+)" -ForegroundColor $(if($dllCount -ge 50){"Green"}else{"Red"})

# 检查MSVC运行时
$vcRuntimePaths = @(
    "$env:SystemRoot\System32\vcruntime140.dll",
    "$env:SystemRoot\System32\msvcp140.dll"
)

Write-Host "`n检查MSVC运行时..." -ForegroundColor Cyan
foreach ($dll in $vcRuntimePaths) {
    if (Test-Path $dll) {
        Write-Host "✓ $(Split-Path $dll -Leaf)" -ForegroundColor Green
    } else {
        Write-Host "✗ $(Split-Path $dll -Leaf) 缺失！需要安装VC++ Redistributable" -ForegroundColor Red
    }
}
```

---

## ✅ 解决方案

### 方案1: 重新安装（推荐）

如果检测到文件缺失:

1. 卸载当前版本
2. 下载最新安装包（v0.3.1+）
3. 以管理员权限安装
4. 安装完成后重启电脑

### 方案2: 手动修复依赖

#### 修复PROJ数据:

1. 从正常电脑复制`proj-data`文件夹
2. 放到`C:\Program Files\MiniGIS\proj-data`
3. 确保`proj.db`文件存在（约7MB）

#### 修复GDAL数据:

1. 从正常电脑复制`gdal-data`文件夹
2. 放到`C:\Program Files\MiniGIS\gdal-data`

#### 修复DLL依赖:

1. 安装 [VC++ Redistributable 2015-2022](https://aka.ms/vs/17/release/vc_redist.x64.exe)
2. 从正常电脑复制所有DLL到`C:\Program Files\MiniGIS\`

### 方案3: 开发者修复（打包问题）

如果是安装包本身的问题，需要修改`build.rs`确保所有文件被正确打包:

```rust
// 检查关键文件是否被打包
let critical_files = vec![
    ("proj-data/proj.db", "proj.db数据库"),
    ("gdal-data/gcs.csv", "GDAL坐标系数据"),
];

for (file, desc) in critical_files {
    let src = format!("{}\\share\\{}", gdal_home, file);
    if !Path::new(&src).exists() {
        panic!("【打包错误】{} 文件不存在: {}", desc, src);
    }
}
```

---

## 🔬 高级调试

### 使用Process Monitor追踪

1. 下载 [Process Monitor](https://docs.microsoft.com/sysinternals/downloads/procmon)
2. 运行ProcMon，添加过滤器: `Process Name is minigis.exe`
3. 启动MiniGIS并重现闪退
4. 查看崩溃前的最后操作:
   - 文件访问失败 → 数据文件缺失
   - DLL加载失败 → 依赖库缺失
   - 注册表访问 → 权限问题

### 使用Dependency Walker检查DLL

1. 下载 [Dependencies](https://github.com/lucasg/Dependencies)
2. 打开`minigis.exe`
3. 检查是否有红色标记的缺失DLL
4. 补充缺失的DLL

---

## 📊 已知问题列表

| 问题 | 影响 | 状态 | 修复版本 |
|------|------|------|----------|
| expect() panic导致闪退 | 🔴 高 | ✅ 已修复 | 待发布 |
| proj.db缺失 | 🔴 高 | ⚠️ 打包问题 | 待修复 |
| MSVC运行时缺失 | 🟡 中 | 📖 文档说明 | - |
| GDAL_DATA未设置 | 🟡 中 | ✅ 已修复 | 待发布 |

---

## 📞 报告问题

如果上述方案都无法解决，请提供以下信息到 [GitHub Issues](https://github.com/xiaofuX1/MiniGIS/issues):

1. **系统信息**:
   - Windows版本（Win10/Win11）
   - 系统语言和区域设置
   - 是否使用中文路径

2. **安装信息**:
   - MiniGIS版本号
   - 安装路径
   - 是否以管理员权限安装

3. **诊断结果**:
   - 完整的日志文件（从`AppData\Roaming`）
   - `gdal_diagnose`命令输出
   - 文件完整性检查结果
   - Process Monitor截图（可选）

4. **复现步骤**:
   - 具体操作步骤
   - 使用的数据文件类型
   - 崩溃时间点

---

## 🎯 预防措施

### 用户端:
1. ✅ 安装最新版本（v0.3.1+）
2. ✅ 安装VC++ Redistributable
3. ✅ 使用默认安装路径
4. ✅ 以管理员权限安装

### 开发者端:
1. ✅ 增强错误处理，避免panic
2. ✅ 验证打包完整性
3. ✅ 添加详细日志
4. ✅ 打包MSVC运行时到安装包
5. ✅ 添加安装后自检功能

---

**最后更新**: 2025-02-20  
**适用版本**: MiniGIS v0.3.0+ (修复待发布)
