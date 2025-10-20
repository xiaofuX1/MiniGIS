# MiniGIS v0.4.0 发布说明

**发布日期**: 2025-10-20  
**版本类型**: Minor Release  
**下载地址**: [GitHub Releases](https://github.com/xiaofuX1/MiniGIS/releases/tag/v0.4.0)

---

## 🎉 重大更新

MiniGIS v0.4.0 版本带来了矢量数据导出功能、KML/KMZ完整支持、重要bug修复和多项稳定性改进，大幅提升了软件的实用性和可靠性。

---

## ✨ 新增功能

### 📤 矢量数据导出

完整的矢量数据导出功能，支持5种主流GIS格式：

- **支持格式**:
  - KML - Google Earth格式
  - KMZ - 压缩的KML格式  
  - GeoJSON - Web标准地理数据格式
  - Shapefile - GIS标准矢量格式
  - GeoPackage - 现代GIS数据容器格式

- **功能特性**:
  - ✅ 完整保留所有字段值和几何信息
  - ✅ 使用GDAL ogr2ogr工具确保转换准确性
  - ✅ 友好的导出对话框和进度提示
  - ✅ 自动文件命名和保存路径选择

- **使用方式**:
  - 图层右键菜单 → "导出数据"
  - 工具栏 → "导出工具"窗口

### 🗺️ KML/KMZ格式完整支持

新增对Google Earth格式的完整支持：

- **文件读取**:
  - ✅ 支持打开和显示KML/KMZ文件
  - ✅ 自动使用UTF-8编码，确保中文正常显示
  
- **智能解析**:
  - ✅ 自动解析description字段中的属性数据
  - ✅ 将打包的键值对自动拆分为独立字段
  - ✅ 完整支持中文字段名和值
  
- **无缝集成**:
  - ✅ 属性表完整显示所有解析后的字段
  - ✅ 要素信息面板显示完整属性
  - ✅ 地图标注可使用解析后的字段

---

## 🐛 重要Bug修复

### 🔥 修复闪退问题

彻底解决个别电脑添加数据时软件崩溃的严重bug：

- **问题原因**:
  - 坐标转换失败时使用`expect()`导致panic
  - WGS84坐标系创建失败时直接panic
  
- **修复方案**:
  - ✅ 将所有`expect()`改为安全的`map_err()`错误处理
  - ✅ 返回友好错误信息而非直接崩溃
  - ✅ 修复3处关键位置的问题代码

### 🔤 修复Shapefile中文乱码

彻底解决中文属性显示为乱码的问题：

- **问题原因**:
  - Shapefile的DBF文件使用GBK编码
  - GDAL默认按UTF-8解析导致乱码
  
- **修复方案**:
  - ✅ 实现智能编码检测机制
  - ✅ 支持`.cpg`编码声明文件
  - ✅ 设置全局默认编码为GBK
  - ✅ 文件级别可覆盖全局设置
  
- **编码检测优先级**: `.cpg文件` > `GBK` > `UTF-8` > `系统默认`

---

## ✨ 改进与优化

### 🚀 GDAL环境自动配置

开发环境统一启动体验：

- ✅ `npm run tauri:dev` 可直接启动，无需额外脚本
- ✅ 智能环境检测：自动识别开发模式和打包模式
- ✅ PATH环境变量自动配置
- ✅ GDAL_DATA和PROJ_LIB自动检测和设置
- ✅ debug模式也自动复制GDAL文件

### 📊 增强GDAL初始化日志

详细的启动日志帮助诊断问题：

- ✅ 清晰的环境变量设置日志
- ✅ DLL加载路径验证日志
- ✅ proj.db文件存在性检查
- ✅ 使用✓/✗/⚠符号标记状态

### 🔍 增强健康检查功能

更全面的GDAL环境诊断：

- ✅ 详细的驱动列表输出
- ✅ 关键环境变量验证
- ✅ 数据文件完整性检查
- ✅ 更友好的错误提示信息

### 🛠️ 开发工具改进

- ✅ 新增自动诊断脚本 `scripts/diagnose_crash.ps1`
- ✅ 新增故障排查文档 `docs/CRASH_TROUBLESHOOTING.md`
- ✅ 完善开发文档和使用指南

---

## 🎯 技术改进

- **安全性**: 移除所有可能导致panic的unsafe代码
- **容错性**: 增强错误处理机制，确保所有错误都能被优雅处理
- **可维护性**: 详细的日志便于问题定位和修复
- **用户体验**: 提供友好的错误信息而非直接崩溃

---

## 📦 安装说明

### Windows 用户

1. 从 [Releases](https://github.com/xiaofuX1/MiniGIS/releases/tag/v0.4.0) 下载 `MiniGIS_0.4.0_x64_zh-CN.msi`
2. 双击安装包，按照向导完成安装
3. 首次运行时会自动配置GDAL环境

### 开发者

```bash
# 克隆仓库
git clone https://github.com/xiaofuX1/MiniGIS.git
cd MiniGIS

# 安装依赖
npm install

# 启动开发服务器
npm run tauri:dev
```

---

## 🔄 升级说明

从 v0.3.0 升级到 v0.4.0：

1. **直接覆盖安装** - 不会影响现有项目和数据
2. **会话自动迁移** - 之前的会话状态自动保留
3. **配置向后兼容** - 无需手动调整配置

---

## 📝 已知问题

- 暂无重大已知问题

---

## 🙏 致谢

感谢所有为本版本做出贡献的开发者和测试者！

特别感谢：
- 报告闪退问题的用户
- 反馈中文乱码问题的用户
- 提供KML文件测试的用户

---

## 📞 反馈与支持

如果您在使用过程中遇到任何问题：

- 🐛 [报告Bug](https://github.com/xiaofuX1/MiniGIS/issues/new?template=bug_report.md)
- 💡 [功能建议](https://github.com/xiaofuX1/MiniGIS/issues/new?template=feature_request.md)
- 💬 [参与讨论](https://github.com/xiaofuX1/MiniGIS/discussions)

---

## 🔮 下一版本计划

v0.5.0 规划中的功能：

- 栅格数据支持
- 空间分析工具
- 数据编辑功能
- 更多导出格式

敬请期待！

---

**MiniGIS Team**  
2025-10-20
