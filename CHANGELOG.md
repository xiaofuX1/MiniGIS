# Changelog

本文档记录MiniGIS项目的所有重要更改。

## [0.2.0] - 2025-10-14

### 🎉 重大更新

#### 核心功能
- ✅ **GDAL完整集成** - 支持Shapefile、GeoJSON、GeoPackage等多种矢量格式
- ✅ **坐标系统** - 自动坐标转换到WGS84，支持EPSG和投影坐标系
- ✅ **OpenLayers引擎** - 企业级开源地图库，功能强大，性能优异
- ✅ **MSI安装包** - 企业级Windows安装程序，包含所有运行时依赖

#### 用户界面
- ✅ **启动加载页面** - 优雅的应用启动体验
- ✅ **符号系统** - 完整的点、线、面符号自定义编辑器
- ✅ **测量工具** - 距离、面积测量功能
- ✅ **图层面板增强** - 拖拽排序、可见性控制

#### 技术改进
- ✅ **GDAL数据打包** - 自动打包所有GDAL和PROJ数据文件
- ✅ **DLL依赖管理** - 自动复制50+个运行时依赖库
- ✅ **WKT坐标系** - 使用WKT替代EPSG，避免数据库依赖问题
- ✅ **CSP安全策略** - 修复Web Worker支持，确保地图正常渲染
- ✅ **错误诊断** - GDAL诊断命令，方便排查问题

#### Bug修复
- 🐛 修复打包后无法打开shp文件的问题
- 🐛 修复PROJ数据库读取错误
- 🐛 修复地图图形不渲染的CSP问题
- 🐛 修复测量工具图形不显示
- 🐛 修复坐标转换失败导致范围超限

### 📦 打包配置
- MSI安装包包含完整GDAL运行时
- 自动配置环境变量（GDAL_DATA, PROJ_LIB）
- 中文界面支持

### 🛠️ 开发改进
- 添加`npm run dev:gdal`脚本，自动配置GDAL环境
- 改进build.rs，自动复制所有依赖
- 完善.gitignore，忽略构建产物

---

## [0.1.0] - 初始版本

### 核心功能
- ✅ Shapefile基础支持
- ✅ Ribbon UI框架
- ✅ 图层管理面板
- ✅ 属性表查看
- ✅ 项目保存/加载
- ✅ Google卫星底图

### 技术栈
- React 18 + TypeScript
- Tauri 2.0
- Leaflet地图引擎
- Ant Design 5
- Zustand状态管理

---

## 版本说明

- **Major (x.0.0)**: 重大架构变更或不兼容的API修改
- **Minor (0.x.0)**: 新功能添加，向后兼容
- **Patch (0.0.x)**: Bug修复和小改进

[0.2.0]: https://github.com/xiaofuX1/MiniGIS/releases/tag/v0.2.0
[0.1.0]: https://github.com/xiaofuX1/MiniGIS/releases/tag/v0.1.0
