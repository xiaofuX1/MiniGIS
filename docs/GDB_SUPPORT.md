# GDB 数据库支持文档

## 功能说明

MiniGIS 现在支持打开 FileGeoDatabase (GDB) 数据库，并能够处理其中的要素集和要素类。

## 使用方法

### 1. 打开 GDB 数据库

1. 点击主页面板的 **"添加数据"** 按钮
2. 从下拉菜单中选择 **"GDB数据库"**
3. 选择 `.gdb` 格式的文件夹（GDB是文件夹格式的数据库）

### 2. 选择图层

打开 GDB 后，系统会自动检测数据库中的所有图层，并按以下方式组织：

- **要素集（Feature Dataset）**：显示为文件夹图标，下方列出属于该要素集的所有要素类
- **独立要素类**：不属于任何要素集的要素类

### 3. 加载图层

1. 在图层列表中选中想要添加的图层（可多选）
2. 点击 **"添加选中图层"** 按钮
3. 系统会自动加载选中的图层到地图

## 技术实现

### 后端支持

- **GDAL 多图层读取**：使用 GDAL 的 `Dataset::layer_count()` 和 `Dataset::layer(index)` API
- **要素集检测**：通过图层名称中的 `.` 分隔符识别要素集关系
  - 例如：`WaterDataset.Rivers` 表示 `Rivers` 图层属于 `WaterDataset` 要素集
- **坐标系转换**：自动将图层数据转换到地图坐标系

### 前端支持

- **层级显示**：按要素集分组显示图层
- **批量加载**：支持同时选择多个图层进行加载
- **异步处理**：使用 `invoke` 调用后端 API，避免阻塞 UI

## 支持的功能

✅ 读取 GDB 数据库结构  
✅ 识别要素集和要素类  
✅ 多选图层加载  
✅ 自动坐标系转换  
✅ 显示图层要素数量和几何类型  

## 注意事项

1. GDB 必须是 ESRI FileGeoDatabase 格式（文件夹）
2. 需要 GDAL 支持 OpenFileGDB 驱动
3. 大型数据库加载可能需要一些时间，请耐心等待
4. 建议选择性加载图层，避免一次性加载过多数据导致性能问题

## 示例

假设有一个 GDB 数据库 `MyCity.gdb`，包含以下结构：

```
MyCity.gdb/
├── Transportation (要素集)
│   ├── Roads (要素类)
│   ├── Railways (要素类)
│   └── Bridges (要素类)
├── Hydrology (要素集)
│   ├── Rivers (要素类)
│   └── Lakes (要素类)
└── Buildings (独立要素类)
```

在图层选择对话框中，将显示为：

```
📁 Transportation
   ☑ Roads - LineString | 1500 要素
   ☐ Railways - LineString | 300 要素
   ☐ Bridges - Point | 50 要素

📁 Hydrology
   ☐ Rivers - LineString | 80 要素
   ☐ Lakes - Polygon | 25 要素

📄 独立要素类
   ☐ Buildings - Polygon | 5000 要素
```

## 开发者说明

### 相关文件

- **后端**：
  - `src-tauri/src/models.rs` - 数据模型定义
  - `src-tauri/src/services/gdal_service.rs` - GDB 读取逻辑
  - `src-tauri/src/commands/gdal.rs` - Tauri 命令接口

- **前端**：
  - `src/components/Ribbon/RibbonMenu.tsx` - GDB 打开和图层选择界面

### 扩展建议

1. 支持搜索和过滤图层
2. 显示图层的空间范围预览
3. 支持批量导出功能
4. 添加图层依赖关系检测
