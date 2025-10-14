# 开发脚本说明

本目录包含MiniGIS项目的开发和发布脚本。

## 📜 脚本列表

### 🚀 开发脚本

#### `tauri-dev.ps1`
**用途**: 启动Tauri开发服务器并自动配置GDAL环境

**使用方法**:
```powershell
# 方式1：使用npm脚本（推荐）
npm run dev:gdal

# 方式2：直接运行
powershell -ExecutionPolicy Bypass -File .\scripts\tauri-dev.ps1
```

**功能**:
- 自动设置GDAL_DATA环境变量
- 自动设置PROJ_LIB和PROJ_DATA环境变量
- 添加GDAL DLL到PATH
- 启动Tauri开发服务器

---

#### `check_gdal_env.ps1`
**用途**: 检查GDAL开发环境配置

**使用方法**:
```powershell
.\scripts\check_gdal_env.ps1
```

**功能**:
- 检查vcpkg安装
- 验证GDAL库文件
- 检查环境变量配置
- 测试GDAL驱动
- 提供修复建议

---

### 📦 发布脚本

#### `create_release.ps1`
**用途**: 自动创建GitHub Release并上传安装包

**前置要求**:
- 已安装GitHub CLI (`gh`)
- 已登录GitHub账号
- MSI安装包已构建

**使用方法**:
```powershell
.\scripts\create_release.ps1
```

**功能**:
- 检查GitHub CLI认证
- 计算MSI文件SHA256校验和
- 生成Release Notes
- 创建GitHub Release
- 自动上传MSI安装包

---

## 🔧 环境要求

### Windows环境
- PowerShell 5.1+
- Node.js 18+
- Rust 1.70+
- vcpkg (用于GDAL)

### GDAL配置
- GDAL 3.8 (通过vcpkg安装)
- 安装路径: `C:\vcpkg\installed\x64-windows`

详见: [GDAL环境配置](../docs/GDAL_SETUP.md)

---

## 📝 常见问题

### Q: 为什么需要单独的开发脚本？
A: 因为GDAL需要特定的环境变量配置，开发脚本会自动设置这些变量，避免手动配置的麻烦。

### Q: 能否在其他系统上使用？
A: 这些是PowerShell脚本，仅支持Windows。macOS和Linux用户需要手动配置环境变量。

### Q: 发布脚本失败怎么办？
A: 检查：
1. GitHub CLI是否已登录 (`gh auth status`)
2. MSI文件是否存在
3. 网络连接是否正常

---

## 🤝 贡献

如果您有改进脚本的建议，欢迎提交PR！

## 📄 许可证

MIT License - 详见项目根目录的 [LICENSE](../LICENSE)
