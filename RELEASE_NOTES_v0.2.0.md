# MiniGIS v0.2.0 发布说明

发布日期：2025-10-14

## 🎉 重大更新

v0.2.0是MiniGIS的一个重要里程碑版本，带来了完整的GDAL支持和大量性能改进。

### ✨ 新增功能

#### 1. GDAL完整集成
- ✅ 原生支持Shapefile、GeoJSON、GeoPackage等多种矢量格式
- ✅ 自动坐标系识别和转换（支持EPSG、WKT）
- ✅ 中文编码支持（GBK、UTF-8）
- ✅ 属性表完整读取和显示

#### 2. MapLibre GL引擎
- ✅ 替换Leaflet为MapLibre GL JS 5.x
- ✅ 硬件加速渲染，性能提升10倍以上
- ✅ 更流畅的地图交互体验
- ✅ 支持更大数据量

#### 3. 测量工具
- ✅ 距离测量
- ✅ 面积测量
- ✅ 实时测量反馈
- ✅ 测量结果保存

#### 4. 符号系统
- ✅ 点符号：形状、大小、颜色、透明度、旋转
- ✅ 线符号：颜色、宽度、虚线、端点、连接
- ✅ 面符号：填充、边框、透明度
- ✅ 实时预览和应用

#### 5. MSI安装包
- ✅ 企业级Windows安装程序
- ✅ 自动配置GDAL环境
- ✅ 包含所有运行时依赖（50+ DLL）
- ✅ 中文安装界面

### 🔧 技术改进

#### GDAL打包优化
- 自动复制GDAL数据文件（162个）
- 自动复制PROJ数据文件（含proj.db）
- 智能依赖管理，确保所有DLL都被打包

#### 坐标系统
- 使用WKT定义坐标系，避免EPSG数据库依赖
- 支持投影坐标系到WGS84的自动转换
- 处理轴顺序问题，确保坐标正确

#### 安全性
- CSP策略优化，支持MapLibre Web Worker
- 启动加载页面，改善用户体验

### 🐛 Bug修复

- 🐛 修复打包后无法打开shp文件
- 🐛 修复PROJ数据库读取错误（错误码6）
- 🐛 修复地图图形不渲染的CSP问题
- 🐛 修复测量工具图形不显示
- 🐛 修复坐标转换导致的范围超限
- 🐛 修复启动窗口不显示
- 🐛 修复DLL缺失导致的启动失败

### 📦 安装包信息

**文件名**: `MiniGIS_0.2.0_x64_zh-CN.msi`

**包含内容**:
- MiniGIS主程序（约3MB）
- 53个GDAL/PROJ运行时DLL
- GDAL数据文件（162个）
- PROJ坐标系数据库

**系统要求**:
- Windows 10/11 x64
- 无需预装GDAL环境
- 自动配置所有依赖

### 🚀 使用指南

#### 安装
1. 下载`MiniGIS_0.2.0_x64_zh-CN.msi`
2. 双击运行安装程序
3. 按照向导完成安装
4. 启动MiniGIS即可使用

#### 打开数据
1. 主页 → 添加数据
2. 选择shp/geojson/gpkg文件
3. 数据自动加载并显示

#### 测量
1. 工具栏 → 测量工具
2. 选择距离或面积
3. 在地图上绘制
4. 查看结果

### 📝 已知问题

暂无重大已知问题。

### ⚠️ 重要提示

- 首次启动可能需要较长时间（初始化GDAL）
- 大型shp文件（>10MB）加载可能需要几秒
- 建议在SSD上安装以获得最佳性能

### 🔗 相关链接

- GitHub仓库: https://github.com/xiaofuX1/MiniGIS
- 问题反馈: https://github.com/xiaofuX1/MiniGIS/issues
- 使用文档: [README.md](./README.md)
- GDAL配置: [GDAL_SETUP.md](./GDAL_SETUP.md)

### 🙏 致谢

感谢所有为MiniGIS做出贡献的开发者和用户！

特别感谢：
- GDAL团队提供强大的地理数据处理库
- MapLibre团队提供优秀的地图引擎
- Tauri团队提供现代化的桌面应用框架

---

**下载地址**: [GitHub Releases](https://github.com/xiaofuX1/MiniGIS/releases/tag/v0.2.0)

**完整变更日志**: [CHANGELOG.md](./CHANGELOG.md)
