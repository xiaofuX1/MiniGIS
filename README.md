# MiniGIS - 轻量级桌面GIS系统

<div align="center">

![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)

一个基于 Tauri、React 和 OpenLayers 构建的现代桌面 GIS 应用程序

[功能特性](#功能特性) • [快速开始](#快速开始) • [文档](#文档) • [下载](https://github.com/xiaofuX1/MiniGIS/releases)

</div>

---

## ✨ 最新更新 (v0.5.0)

### 🎉 重大改进

- ✅ **ArcGIS Pro 风格数据浏览器** - 重构添加数据对话框，提供专业的文件浏览和导航体验
- ✅ **FileGeoDatabase 支持** - 完整支持 ESRI GDB 数据库格式，支持要素集层级结构
- ✅ **多地图标签页系统** - 类似 ArcGIS Pro 的多地图管理，支持标签页拖拽排序和独立会话
- ✅ **要素识别增强** - 支持多图层重叠要素的识别和树形导航
- ✅ **会话恢复修复** - 修复了影响用户体验的关键问题
- ✅ **坐标系统简化** - 统一使用 CGCS2000 国家标准坐标系

详见 [CHANGELOG.md](./CHANGELOG.md)

## 功能特性

### 核心功能
- 📂 **专业数据浏览器** - ArcGIS Pro 风格的添加数据对话框，支持目录树、搜索、快捷方式导航
- 🗄️ **GDB 数据库支持** - 完整支持 ESRI FileGeoDatabase，双击进入 GDB 浏览要素集和图层
- 📍 **多格式矢量支持** - 打开和查看 Shapefile、KML、KMZ、GeoJSON、GeoPackage 等格式
- 🗂️ **多地图标签页** - 类似 ArcGIS Pro 的多地图管理，支持拖拽排序和独立会话持久化
- 🔍 **增强要素识别** - 多图层重叠要素识别，树形结构导航，要素闪烁定位
- 📊 **属性表** - 查看和分析空间数据的属性信息
- 🎨 **现代化 Ribbon UI** - 类似 Office/ArcGIS Pro 的 Ribbon 风格界面
- 🌍 **CGCS2000 底图** - 集成 CGCS2000 坐标系天地图服务
- 💾 **会话恢复** - 自动保存和恢复所有标签页、图层、UI 状态
- 🎯 **符号系统** - 完整的点、线、面符号自定义功能
- 📤 **数据导出** - 支持导出为 KML/KMZ/GeoJSON/Shapefile/GeoPackage

### 技术栈
- **前端框架**: React 18 + TypeScript
- **桌面框架**: Tauri 2.0
- **UI 组件库**: Ant Design 5
- **地图引擎**: OpenLayers 9.x
- **状态管理**: Zustand + MobX
- **样式方案**: Tailwind CSS + SCSS
- **后端语言**: Rust
- **空间数据**: GDAL 3.8 (Shapefile, KML, KMZ, GeoJSON, GeoPackage, GML, etc.)

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- Rust >= 1.70.0
- pnpm 或 npm

### 安装依赖

```bash
# 安装前端依赖
npm install

# 或使用 pnpm
pnpm install
```

### 开发模式

```bash
# 方式1：直接启动开发服务器（推荐，已自动配置GDAL环境）
npm run tauri:dev

# 或使用完整命令
npm run tauri dev

# 方式2：使用PowerShell脚本启动（备用）
npm run dev:gdal
```

**说明**: 
- 现在 `npm run tauri:dev` 已支持自动检测和配置GDAL环境
- 在开发模式下，会自动从 vcpkg 加载 GDAL 库和数据
- 打包后会使用应用程序目录中的 GDAL 文件
- 无需手动设置环境变量

### 构建应用

```bash
# 构建生产版本
npm run tauri:build
```

## 项目结构

```
MiniGIS/
├── src/                      # React 前端源码
│   ├── components/          # React 组件
│   │   ├── Ribbon/         # Ribbon 菜单组件
│   │   ├── Map/            # 地图组件
│   │   ├── Panels/         # 面板组件（含符号编辑器）
│   │   └── StatusBar/      # 状态栏组件
│   ├── stores/             # Zustand 状态管理
│   ├── services/           # API 服务
│   ├── utils/              # 工具函数（含符号渲染器）
│   ├── types/              # TypeScript 类型定义
│   └── App.tsx             # 主应用组件
├── src-tauri/              # Tauri/Rust 后端源码
│   ├── src/
│   │   ├── commands/       # Tauri 命令
│   │   ├── services/       # 业务服务
│   │   ├── gis/           # GIS 处理模块
│   │   └── models.rs      # 数据模型
│   └── Cargo.toml         # Rust 依赖配置
├── package.json           # Node.js 依赖配置
└── tauri.conf.json       # Tauri 配置文件
```

## 文档

📚 **[文档中心](./docs/README.md)** - 完整的文档导航和索引

### 快速链接
- 📘 [用户使用指南](./docs/USER_GUIDE.md) - 快速上手和功能介绍
- 📙 [开发指南](./docs/DEVELOPMENT.md) - 技术架构和开发说明
- 📕 [GDAL 环境配置](./docs/GDAL_SETUP.md) - GDAL 安装和配置
- 🤝 [贡献指南](./CONTRIBUTING.md) - 如何参与项目开发
- 📝 [变更日志](./CHANGELOG.md) - 版本更新记录
- 🔧 [开发脚本](./scripts/) - 开发和发布脚本

## 快速使用

### 添加矢量数据
1. 点击 Ribbon 菜单中的"主页"标签
2. 点击"添加数据"按钮
3. 选择矢量文件（支持 `.shp`, `.kml`, `.kmz`, `.geojson`, `.gpkg` 等格式）
4. 数据将自动加载到地图视图，并自动处理坐标投影

### 查看属性表
1. 选择图层
2. 点击底部的属性表面板
3. 可进行排序、筛选、导出等操作

### 设置图层符号
1. 在图层面板中右键点击图层
2. 选择"符号设置"
3. 根据几何类型调整点/线/面符号参数
4. 修改实时应用到地图

### 项目管理
- **新建项目**: 主页 > 新建项目
- **打开项目**: 主页 > 打开项目
- **保存项目**: 主页 > 保存
- **自动恢复**: 下次启动自动恢复上次会话

## 技术特点

### 企业级架构设计
- **模块化设计**: 清晰的模块划分，便于维护和扩展
- **类型安全**: 完整的 TypeScript 类型定义
- **状态管理**: 使用 Zustand 进行高效的状态管理
- **错误处理**: 完善的错误处理机制

### 性能优化
- **虚拟化渲染**: 大数据量属性表采用虚拟滚动
- **懒加载**: 按需加载组件和数据
- **Web Worker**: 空间数据处理使用 Worker 避免阻塞 UI

### 扩展性
- **插件系统**: 预留插件接口
- **主题定制**: 支持主题切换和定制
- **多语言**: 支持国际化

## 🤝 贡献指南

我们欢迎所有形式的贡献！

- 🐛 [报告Bug](https://github.com/xiaofuX1/MiniGIS/issues/new?template=bug_report.md)
- 💡 [功能建议](https://github.com/xiaofuX1/MiniGIS/issues/new?template=feature_request.md)
- 📖 改进文档
- 🔧 提交代码

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)

## 📄 许可证

本项目采用 [MIT License](./LICENSE) 开源协议

## 🙏 致谢

- [Tauri](https://tauri.app/) - 强大的桌面应用框架
- [OpenLayers](https://openlayers.org/) - 企业级开源地图引擎
- [GDAL](https://gdal.org/) - 地理空间数据抽象库
- [Ant Design](https://ant.design/) - 企业级UI组件库

## 📞 联系方式

- 📧 Issues: [GitHub Issues](https://github.com/xiaofuX1/MiniGIS/issues)
- 💬 讨论: [GitHub Discussions](https://github.com/xiaofuX1/MiniGIS/discussions)

---

<div align="center">

**MiniGIS** - 让GIS更简单、更强大！

[![Star](https://img.shields.io/github/stars/xiaofuX1/MiniGIS?style=social)](https://github.com/xiaofuX1/MiniGIS)

Made with ❤️ by MiniGIS Team

</div>
