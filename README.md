# MiniGIS

一个基于 Tauri 2 + Rust 的现代化轻量级GIS应用程序

## ✨ 特性

- 🗺️ **现代化界面** - 类似ArcGIS Pro的Ribbon风格界面
- 🌍 **地图引擎** - 集成Leaflet，支持谷歌卫星底图
- 📂 **Shapefile支持** - 完整的Shapefile文件读取和解析
- 📊 **属性查看** - 图层属性表查看和管理
- 🎨 **图层管理** - 图层显示/隐藏、顺序调整
- ⚡ **高性能** - 基于Rust后端，性能优异
- 🔒 **跨平台** - 支持Windows、macOS、Linux

## 🛠️ 技术栈

### 前端
- **Vite** - 快速构建工具
- **Leaflet** - 开源地图库
- **Turf.js** - 地理空间分析
- **原生JavaScript** - 无框架依赖，轻量高效

### 后端
- **Tauri 2** - 现代桌面应用框架
- **Rust** - 高性能系统编程语言
- **shapefile** - Shapefile解析库
- **geojson** - GeoJSON序列化

## 📦 安装

### 前置要求

- **Node.js** >= 16.0.0
- **Rust** >= 1.70.0
- **npm** 或 **yarn**

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/yourusername/MiniGIS.git
cd MiniGIS

# 安装前端依赖
npm install

# 运行开发环境
npm run tauri:dev
```

### 生产构建

```bash
# 构建应用程序
npm run tauri:build
```

生成的安装包位于：
- Windows MSI: `src-tauri/target/release/bundle/msi/`
- Windows NSIS: `src-tauri/target/release/bundle/nsis/`

## 🚀 使用方法

1. **启动应用** - 运行 `npm run tauri:dev` 或安装已构建的版本
2. **导入Shapefile** - 点击"打开"按钮选择.shp文件
3. **查看图层** - 图层自动加载到地图和图层列表
4. **属性查看** - 右键点击要素查看属性信息
5. **地图操作** - 平移、缩放、切换底图

## 📁 项目结构

```
MiniGIS/
├── src/                      # 前端源代码
│   ├── modules/              # 功能模块
│   │   ├── mapManager.js     # 地图管理
│   │   ├── layerManager.js   # 图层管理
│   │   ├── attributeViewer.js # 属性查看
│   │   ├── ribbonUI.js       # Ribbon界面
│   │   └── sessionManager.js # 会话管理
│   ├── main.js               # 主入口
│   └── styles.css            # 样式文件
│
├── src-tauri/                # Rust后端
│   ├── src/
│   │   ├── main.rs           # 主程序
│   │   ├── lib.rs            # 库入口
│   │   └── shapefile_handler.rs # Shapefile处理
│   ├── Cargo.toml            # Rust依赖配置
│   └── tauri.conf.json       # Tauri配置
│
├── package.json              # Node.js配置
└── vite.config.js            # Vite配置
```

## 🔧 配置

### Tauri配置 (`src-tauri/tauri.conf.json`)

- 应用名称、版本、标识符
- 窗口大小和行为
- 打包选项（MSI/NSIS）

### Vite配置 (`vite.config.js`)

- 构建输出目录
- 开发服务器配置

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Tauri](https://tauri.app/) - 强大的桌面应用框架
- [Leaflet](https://leafletjs.com/) - 优秀的地图库
- [Rust Shapefile](https://github.com/tmontaigu/shapefile-rs) - Shapefile解析

## 📮 联系方式

- 作者: xiaofu
- 项目链接: [https://github.com/yourusername/MiniGIS](https://github.com/yourusername/MiniGIS)

---

⭐ 如果这个项目对你有帮助，请给个Star！
