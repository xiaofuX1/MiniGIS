# Changelog

本文档记录MiniGIS项目的所有重要更改。

## [0.5.0] - 2025-10-24

### ✨ 新增功能

#### 添加数据对话框重构
- **ArcGIS Pro 风格界面** - 完整重构添加数据对话框，采用专业GIS软件交互模式
  - **列表详细视图**: 表格显示文件名称、类型、几何类型、要素数量
  - **左侧目录树**: 快速访问常用位置（桌面、文档、下载等）
  - **实时搜索过滤**: 在顶部工具栏快速定位文件
- **GDB导航体验** - 类似文件管理器的GDB浏览方式
  - 双击进入GDB内部查看要素集和图层
  - 双击要素集只显示该要素集的图层
  - 退出GDB返回文件系统
- **完整导航系统** - 专业的路径导航功能
  - 后退/前进按钮：浏览历史记录
  - 向上一级：快速返回父目录
  - 面包屑导航：显示当前路径，可点击跳转
  - 导航历史记录：支持完整的前进后退
- **路径快速跳转** - 底部工具栏路径输入
  - 粘贴或输入完整路径
  - 按Enter键直接跳转
  - 自动识别GDB和普通目录
- **文件类型筛选** - 下拉菜单快速过滤
  - 支持筛选：所有类型、文件夹、GDB、Shapefile、GeoPackage、GeoJSON、KML/KMZ
  - 实时更新列表显示
- **快捷方式支持** - Windows快捷方式识别和导航
  - 显示.lnk文件和符号链接
  - 图标标记：右下角链接图标
  - 类型标签：显示"文件夹 (快捷方式)"
  - 双击跳转到目标位置
- **专业文件选择** - 符合Windows和ArcGIS标准的多选逻辑
  - 单选模式：单击文件只选中当前项
  - 多选模式：Ctrl+单击切换选中状态
  - 范围选择：Shift+单击选中范围内所有文件
- **会话内记忆** - 智能位置记忆功能
  - 对话框关闭后再打开自动恢复上次位置
  - 使用sessionStorage仅在当前会话有效
  - 程序重启后恢复到默认位置

**影响文件**:
- `src/components/Dialogs/AddDataDialog.tsx` - 完全重构添加数据对话框
- `src/components/Dialogs/AddDataDialog.css` - 新增专业样式
- `src-tauri/src/commands/fs.rs` - 添加快捷方式识别支持

#### GDB 数据库支持
- **FileGeoDatabase 支持** - 新增对 ESRI FileGeoDatabase (GDB) 数据库的完整支持
  - 直接打开 `.gdb` 文件夹格式数据库
  - 自动识别数据库中的所有图层
  - 支持要素集（Feature Dataset）的层级结构
- **图层选择界面** - 专业的图层选择对话框
  - 按要素集分组显示图层
  - 独立要素类单独列出
  - 显示图层几何类型和要素数量
  - 支持多选图层批量加载
- **数据加载优化** - 智能批量加载机制
  - 异步加载避免UI阻塞
  - 自动坐标系转换
  - 加载进度提示

**新增文件**:
- `docs/GDB_SUPPORT.md` - GDB数据库支持完整文档

**影响文件**:
- `src-tauri/src/models.rs` - LayerInfo添加feature_dataset字段
- `src-tauri/src/services/gdal_service.rs` - 实现GDB要素集检测逻辑
- `src/components/Ribbon/RibbonMenu.tsx` - 添加GDB打开和图层选择界面

#### 多地图标签页系统
- **多地图管理** - 类似 ArcGIS Pro 的多地图标签页功能，支持同时管理多个独立地图
  - 每个标签页拥有独立的地图视图、图层列表、选中状态
  - 标签页间完全隔离，互不影响
  - 至少保留一个标签页
- **标签页操作** - 丰富的标签页管理功能
  - 新建地图：通过"插入"→"新建地图"或标签栏右上角"+"按钮
  - 重命名：右键菜单→"重命名"
  - 关闭：点击"×"或右键菜单→"关闭"
  - 拖拽排序：长按200ms拖动标签页调整顺序（@dnd-kit）
- **独立图层管理** - 每个地图标签页拥有独立的图层系统
  - 图层面板自动显示当前激活标签页的图层
  - 图层操作（添加、删除、排序等）仅影响当前标签页
  - 支持图层分组、符号系统、标注配置
- **状态持久化** - 完整的会话保存和恢复机制
  - 自动保存所有标签页状态（防抖1秒）
  - 保存内容：地图名称、视图状态、图层配置、属性表状态、UI布局
  - 启动时自动恢复上次会话
  - 智能过滤不存在的文件
  - 恢复时保持上次的缩放级别和位置，不自动缩放到图层

**新增文件**:
- `src/stores/mapTabsStore.ts` - 多地图标签页状态管理
- `src/components/Map/MapTabsContainer.tsx` - 标签页容器组件
- `src/components/Map/MapTabsContainer.css` - 标签页样式
- `docs/MAP_TABS_FEATURE.md` - 完整功能文档

**影响文件**:
- `src/services/storageService.ts` - 新增多地图标签页持久化接口
- `src/hooks/useRestoreSession.ts` - 实现多地图标签页恢复逻辑
- `src/components/Map/MapView.tsx` - 支持多标签页模式，避免恢复时自动缩放
- `src/components/Panels/LayerPanel.tsx` - 适配多地图模式
- `src/components/Ribbon/RibbonMenu.tsx` - 添加"新建地图"功能，适配多地图模式
- `src/App.tsx` - 集成标签页容器，实现自动保存

#### 要素识别增强
- **多图层要素识别** - 浏览模式下支持一次点击识别多个图层的要素
- **重叠要素显示** - 支持识别和显示同一位置的所有重叠要素
- **树形结构导航** - 新增GIS风格的树形结构选择器，按图层分组显示识别结果
  - 显示图层名称和要素数量（如 "道路图层 (3)"）
  - 显示要素ID和几何类型（如 "要素1 [Polygon]"）
  - 支持可折叠/展开图层节点
  - 点击要素节点自动切换显示属性
- **要素闪烁定位** - 切换要素时地图自动高亮闪烁定位
- **紧凑UI设计** - 优化面板布局，移除冗余标题，提升空间利用率

**影响文件**:
- `src/stores/selectionStore.ts` - 新增多要素存储结构
- `src/components/Map/MapView.tsx` - 优化识别逻辑收集所有重叠要素
- `src/components/Panels/FeatureInfoPanel.tsx` - 实现树形选择器
- `src/components/Panels/FeatureInfoPanel.css` - 紧凑样式优化

### 🐛 Bug 修复

#### 会话恢复相关修复
1. **会话被空标签页覆盖** - 修复了重新打开软件时无法恢复之前打开的图层和标签页的问题
   - **根本原因**: 应用启动时创建的空标签页在会话恢复前被自动保存，覆盖了之前的会话记录
   - **解决方案**: `useRestoreSession` Hook 现在返回恢复完成状态，自动保存功能只在会话恢复完成后启用
   - **详细说明**: 参见 `docs/SESSION_RESTORE_FIX.md`

2. **恢复后图层不显示** - 修复了会话恢复后图层和底图不显示，需要手动开关图层才能加载的问题
   - **根本原因1**: 使用 `array.splice()` 直接修改数组不会触发 Zustand 订阅更新，导致 MapView 组件不重新渲染
   - **根本原因2**: 图层加载循环中使用 `return` 语句退出整个 async 函数，导致只有第一个图层加载
   - **解决方案**: 改用 `setState` 触发状态更新，将 `return` 改为 `continue`，规范化图层数据结构
   - **详细说明**: 参见 `docs/LAYER_RENDER_FIX.md`

**影响文件**: 
- `src/hooks/useRestoreSession.ts` - 会话恢复逻辑
- `src/App.tsx` - 自动保存时序控制
- `src/stores/uiStore.ts` - 移除废弃字段
- `src/components/Map/MapView.tsx` - 图层加载循环修复

### 🔧 改进与优化

#### 坐标系统简化
- **固定CGCS2000坐标系** - 系统默认使用CGCS2000地理坐标系（EPSG:4490）
- **移除坐标系设置** - 简化用户界面，移除坐标系选择功能
- **自动坐标转换** - 所有数据自动转换到CGCS2000底图坐标系显示
- **统一经纬度显示** - 状态栏固定显示经纬度格式，不再区分投影坐标

**影响文件**:
- `src/stores/crsStore.ts` - 默认坐标系改为CGCS2000，阻止坐标系切换
- `src/stores/mapStore.ts` - 地图投影改为EPSG:4490
- `src/components/Ribbon/RibbonMenu.tsx` - 移除"坐标系"按钮
- `src/components/StatusBar/StatusBar.tsx` - 简化坐标显示逻辑，固定经纬度
- `src/components/Map/MapView.tsx` - 简化地图投影设置
- `src/components/Panels/WindowManager.tsx` - 移除CRSPanel引用
- `src/stores/windowStore.ts` - 移除crs-settings窗口配置
- `src/hooks/useRestoreSession.ts` - 移除坐标系会话恢复
- `src/utils/olHelpers.ts` - 更新注释为CGCS2000术语
- `src/App.tsx` - 移除useCRSProjection调用

**删除的文件**:
- `src/components/Panels/CRSPanel.tsx` - 坐标系设置面板
- `src/components/Dialogs/CRSDialog.tsx` - 坐标系选择对话框
- `src/hooks/useCRSProjection.ts` - 坐标系投影钩子

### ⚠️ 破坏性变更

#### 移除用户自定义坐标系功能
- **用户影响**: 用户不能再通过UI切换地图坐标系
- **原因**: 简化系统复杂度，统一使用国家标准CGCS2000坐标系
- **迁移指南**: 
  - 所有数据会自动转换到CGCS2000坐标系显示
  - 保存的会话不再恢复坐标系设置
  - 数据文件的原始坐标系会被自动识别并转换

### 📊 统计信息

- **新增功能**: 4 (添加数据对话框重构, GDB数据库支持, 多地图标签页系统, 要素识别增强)
- **Bug 修复**: 2 (会话恢复相关)
- **改进优化**: 1 (坐标系统简化)
- **破坏性变更**: 1 (移除用户自定义坐标系)

---

## [0.4.0] - 2025-10-20

### ✨ 新增功能 - 矢量数据导出

- **📤 完整的数据导出功能** - 支持多种格式的矢量数据导出
  - **支持格式**:
    - KML - Google Earth格式
    - KMZ - 压缩的KML格式
    - GeoJSON - Web标准地理数据格式
    - Shapefile - GIS标准矢量格式
    - GeoPackage - 现代GIS数据容器格式
  - **功能特性**:
    - 完整保留所有字段值和几何信息
    - 使用ogr2ogr工具确保转换准确性
    - 友好的导出对话框和进度提示
    - 自动文件命名和保存路径选择
  - **访问方式**:
    - 图层右键菜单 → "导出数据"
    - 工具栏 → "导出工具"窗口
  - **技术实现**:
    - 使用GDAL ogr2ogr命令行工具进行格式转换
    - 智能查找ogr2ogr可执行文件（应用目录/PATH环境变量）
    - 开发环境和打包环境自动适配
  - **打包配置**:
    - build.rs自动复制28个GDAL工具到应用目录
    - resources配置确保工具文件夹被打包进MSI
    - 优化复制策略：debug模式只复制到target，release模式同时复制到src-tauri供打包
  - **修改文件**:
    - `ExportPanel.tsx` - 新增导出工具面板组件
    - `LayerPanel.tsx` - 图层右键菜单添加导出选项
    - `windowStore.ts` - 添加导出工具窗口配置
    - `gdal_service.rs` - 添加export_vector函数和ogr2ogr查找逻辑
    - `build.rs` - 添加GDAL工具自动复制逻辑
    - `tauri.conf.json` - 配置gdal-tools资源打包

### ✨ 新增功能 - KML/KMZ格式支持

- **🗺️ 完整支持KML/KMZ格式** - 新增Google Earth格式的矢量数据支持
  - **功能特性**:
    - 支持打开和显示KML/KMZ文件
    - 自动使用UTF-8编码读取，确保中文正常显示
    - 智能解析description字段中的属性数据
    - 将打包的属性自动拆分为独立字段
    - 完整支持中文字段名和值（如"岸别"、"县（区）"等）
  - **解析能力**:
    - 正则表达式解析键值对格式：`"key":value` 或 `"key":"value"`
    - 自动识别数据类型（字符串、整数、浮点数）
    - 支持中文字段和复杂属性结构
  - **影响范围**:
    - 属性表完整显示所有解析后的字段
    - 要素信息面板显示完整属性
    - 地图标注可使用解析后的字段
  - **修改文件**:
    - `gdal_service.rs` - 添加`parse_kml_description`解析函数
    - `gdal_service.rs` - 更新3个读取函数支持KML
    - `RibbonMenu.tsx` - 优化文件类型映射逻辑
    - `Cargo.toml` - 添加regex依赖
  - **技术实现**:
    - 智能检测文件类型（KML/KMZ使用UTF-8，Shapefile使用GBK）
    - 在`read_vector_features`、`read_vector_features_with_geometry`和`read_vector_as_geojson`三个函数中都添加解析
    - 使用正则表达式提取description中的所有属性
    - 自动合并解析结果到properties对象

### 🐛 Bug修复 - 闪退问题

- **🔥 修复数据解析时的闪退问题** - 彻底解决个别电脑添加数据时软件崩溃的严重bug
  - **根本原因1**: 坐标转换失败时使用`expect()`导致panic，无错误提示直接崩溃
  - **根本原因2**: WGS84坐标系创建失败时直接panic
  - **修复方案**: 将所有`expect()`改为安全的`map_err()`错误处理
  - **影响文件**: `gdal_service.rs` 的3处关键位置（第73、291、424行）
  - **影响**: 修复前任何坐标转换失败都会导致软件闪退，修复后返回友好错误信息

### 🐛 Bug修复 - Shapefile中文乱码

- **🔤 修复Shapefile中文属性乱码问题** - 彻底解决中文属性显示为乱码的问题
  - **根本原因**: Shapefile的DBF文件使用GBK编码，但GDAL默认按UTF-8解析
  - **问题表现**: 中文字段名和属性值显示为"ͼ����"、"��ʩũ�õ�"等乱码
  - **修复方案**: 
    - 实现智能编码检测机制，自动识别UTF-8和GBK编码
    - 支持`.cpg`编码声明文件，标准化编码管理
    - 设置全局默认编码为GBK（中国shapefile最常用）
    - 文件级别可覆盖全局设置，支持混合编码文件
  - **编码检测优先级**: `.cpg文件` > `GBK` > `UTF-8` > `系统默认`
  - **影响文件**: 
    - `gdal_service.rs` - 添加智能编码检测函数
    - `gdal_init.rs` - 设置全局GBK默认编码
  - **影响**: 修复前中文属性完全不可读，修复后自动适配各种编码格式

### ✨ 改进功能

- **🚀 GDAL环境自动配置优化** - 开发环境统一启动体验
  - `npm run tauri:dev` 可直接启动，无需额外脚本
  - 智能环境检测：自动识别开发模式（vcpkg）和打包模式（应用目录）
  - PATH环境变量自动配置：同时支持vcpkg和应用目录
  - GDAL_DATA和PROJ_LIB自动检测和设置
  - 开发和打包环境使用统一的启动逻辑
  - debug模式也自动复制GDAL文件到target/debug
  - 详细的日志输出，方便问题排查

- **📊 增强GDAL初始化日志** - 详细的启动日志帮助诊断问题
  - 清晰的环境变量设置日志（GDAL_DATA、PROJ_LIB）
  - DLL加载路径验证日志
  - proj.db文件存在性检查
  - GDAL驱动数量统计
  - 使用✓/✗/⚠符号标记状态，方便快速识别问题

- **🔍 增强健康检查功能** - 更全面的GDAL环境诊断
  - 详细的驱动列表输出
  - 关键环境变量验证
  - 数据文件完整性检查
  - 更友好的错误提示信息

### 🛠️ 开发工具

- **新增自动诊断脚本** - `scripts/diagnose_crash.ps1`
  - 自动检查安装完整性
  - 验证PROJ/GDAL数据文件
  - 检查DLL依赖
  - 验证MSVC运行时
  - 生成详细诊断报告

- **新增故障排查文档** - `docs/CRASH_TROUBLESHOOTING.md`
  - 完整的问题诊断流程
  - 根本原因分析
  - 多种解决方案
  - 高级调试技巧
  - 预防措施说明

### 🎯 技术改进

- **安全性**: 移除所有可能导致panic的unsafe代码
- **容错性**: 增强错误处理机制，确保所有错误都能被优雅处理
- **可维护性**: 详细的日志便于问题定位和修复
- **用户体验**: 提供友好的错误信息而非直接崩溃

---

## [0.3.0] - 2025-10-16

### ✨ 新增功能

#### 会话恢复增强
- ✅ **完整状态保存** - 保存所有应用状态信息
  - 地图位置和缩放级别（不受"缩放到图层"影响）
  - 当前坐标系配置（EPSG代码、WKT定义）
  - 底图配置（用户选择的底图及其可见性）
  - 图层完整状态（可见性、透明度、样式、符号、标注）
  - UI布局状态（面板折叠、尺寸、位置）
  - 属性表打开状态（打开的图层、激活的标签页）

- ✅ **智能自动保存** - 多重触发机制
  - 图层变化后自动保存（2秒延迟）
  - 地图移动后自动保存（1秒延迟）
  - 坐标系切换后自动保存（0.1秒延迟）
  - UI状态变化后自动保存（1秒延迟）

- ✅ **完整恢复流程**
  - 启动时自动恢复上次会话（1秒延迟）
  - 验证文件存在性，自动跳过不存在的文件
  - 恢复底图配置（移除默认底图，使用保存的配置）
  - 恢复属性表状态（延迟0.5秒确保图层加载完成）
  - 容错处理，单个图层失败不影响其他恢复

### 🐛 Bug修复
- **🔥 会话恢复未生效** - 修复坐标系、底图、UI状态等完全不恢复的严重问题
  - **根本原因**：App.tsx 中有旧的恢复代码，新的 `useRestoreSession` hook 没有被调用
  - 旧代码只恢复了地图位置和部分图层，缺少坐标系、底图、UI状态等恢复
  - 移除旧代码，改用新的 `useRestoreSession` hook
  - 添加详细的控制台日志追踪恢复过程
  - **影响**：修复前，用户设置的坐标系、底图配置、面板布局等完全不会被记住

- **底图记忆问题** - 修复底图每次都恢复为默认星图的问题
  - layerStore 初始化时检查是否有保存的会话
  - 有会话时不添加默认底图，由恢复逻辑处理
  - 无保存底图时自动添加默认底图
  - 确保用户自定义的底图配置被正确保存和恢复

- **循环依赖警告** - 修复控制台循环依赖警告
  - 使用全局对象注册 store 避免循环依赖
  - 添加完善的空值检查和默认值处理
  - 导出必要的类型接口供其他模块使用

### 📖 文档更新
- 新增 `docs/SESSION_RESTORE.md` - 会话恢复功能详细文档
  - 保存的状态信息说明
  - 自动保存机制详解
  - 恢复流程和容错处理
  - 开发者扩展指南

---

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

[0.5.0]: https://github.com/xiaofuX1/MiniGIS/releases/tag/v0.5.0
[0.4.0]: https://github.com/xiaofuX1/MiniGIS/releases/tag/v0.4.0
[0.3.0]: https://github.com/xiaofuX1/MiniGIS/releases/tag/v0.3.0
[0.2.0]: https://github.com/xiaofuX1/MiniGIS/releases/tag/v0.2.0
[0.1.0]: https://github.com/xiaofuX1/MiniGIS/releases/tag/v0.1.0
