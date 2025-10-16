# 坐标系统功能说明

## 功能概述

MiniGIS 现在支持完整的坐标系统管理功能，包括：

1. **设置地图坐标系**：可以将地图坐标系设置为 CGCS2000 或其他支持的坐标系
2. **自动投影**：添加数据时自动投影到当前地图坐标系
3. **坐标系切换**：切换坐标系时，所有已加载的矢量图层自动重投影
4. **WKT显示**：在状态栏显示当前坐标系，点击可查看完整WKT定义

## 支持的坐标系

### CGCS2000 地理坐标系
- **EPSG:4490** - CGCS2000 地理坐标系

### CGCS2000 3度带投影坐标系（带号命名）
从东经75°开始，每3度一个分带，使用带号命名：

- **EPSG:4491** - CGCS2000 / 3-degree Gauss-Kruger zone 25 (中央经线 75°E)
- **EPSG:4492** - CGCS2000 / 3-degree Gauss-Kruger zone 26 (中央经线 78°E)
- **EPSG:4493** - CGCS2000 / 3-degree Gauss-Kruger zone 27 (中央经线 81°E)
- **EPSG:4494** - CGCS2000 / 3-degree Gauss-Kruger zone 28 (中央经线 84°E)
- **EPSG:4495** - CGCS2000 / 3-degree Gauss-Kruger zone 29 (中央经线 87°E)
- **EPSG:4496** - CGCS2000 / 3-degree Gauss-Kruger zone 30 (中央经线 90°E)
- **EPSG:4497** - CGCS2000 / 3-degree Gauss-Kruger zone 31 (中央经线 93°E)
- **EPSG:4498** - CGCS2000 / 3-degree Gauss-Kruger zone 32 (中央经线 96°E)
- **EPSG:4499** - CGCS2000 / 3-degree Gauss-Kruger zone 33 (中央经线 99°E)
- **EPSG:4500** - CGCS2000 / 3-degree Gauss-Kruger zone 34 (中央经线 102°E)
- **EPSG:4501** - CGCS2000 / 3-degree Gauss-Kruger zone 35 (中央经线 105°E)
- **EPSG:4502** - CGCS2000 / 3-degree Gauss-Kruger zone 36 (中央经线 108°E)
- **EPSG:4503** - CGCS2000 / 3-degree Gauss-Kruger zone 37 (中央经线 111°E)
- **EPSG:4504** - CGCS2000 / 3-degree Gauss-Kruger zone 38 (中央经线 114°E)
- **EPSG:4505** - CGCS2000 / 3-degree Gauss-Kruger zone 39 (中央经线 117°E)
- **EPSG:4506** - CGCS2000 / 3-degree Gauss-Kruger zone 40 (中央经线 120°E)
- **EPSG:4507** - CGCS2000 / 3-degree Gauss-Kruger zone 41 (中央经线 123°E)
- **EPSG:4508** - CGCS2000 / 3-degree Gauss-Kruger zone 42 (中央经线 126°E)
- **EPSG:4509** - CGCS2000 / 3-degree Gauss-Kruger zone 43 (中央经线 129°E)
- **EPSG:4510** - CGCS2000 / 3-degree Gauss-Kruger zone 44 (中央经线 132°E)
- **EPSG:4511** - CGCS2000 / 3-degree Gauss-Kruger zone 45 (中央经线 135°E)

### CGCS2000 3度带投影坐标系（中央经线命名）
使用中央经线命名，false_easting=500000：

- **EPSG:4513** - CGCS2000 / 3-degree Gauss-Kruger CM 75E
- **EPSG:4514** - CGCS2000 / 3-degree Gauss-Kruger CM 78E
- **EPSG:4515** - CGCS2000 / 3-degree Gauss-Kruger CM 81E
- **EPSG:4516** - CGCS2000 / 3-degree Gauss-Kruger CM 84E
- **EPSG:4517** - CGCS2000 / 3-degree Gauss-Kruger CM 87E
- ...（继续到135°E）

### WGS84
- **EPSG:4326** - WGS 84 地理坐标系（默认）

## 使用方法

### 1. 设置地图坐标系

1. 点击Ribbon菜单中的**数据** > **坐标系**按钮
2. 在弹出的对话框中选择需要的坐标系：
   - **CGCS2000 地理**：地理坐标系
   - **3度带（带号）**：带号命名的投影坐标系
   - **3度带（CM）**：中央经线命名的投影坐标系
   - **WGS84**：WGS 84地理坐标系
3. 可使用搜索框快速查找坐标系
4. 点击**应用**按钮完成设置

### 2. 查看当前坐标系

在状态栏中显示当前坐标系代码（如 `EPSG:4490`），点击可查看：
- 坐标系名称
- EPSG代码
- 坐标系类型（地理/投影）
- 完整WKT定义（可复制）

### 3. 自动投影功能

#### 加载数据时自动投影
- 添加矢量数据时，系统会自动将数据投影到当前地图坐标系
- 例如：地图坐标系为CGCS2000 zone 36，添加WGS84数据时会自动投影

#### 切换坐标系时自动重投影
- 切换地图坐标系时，所有已加载的矢量图层会自动重投影到新坐标系
- 系统会显示投影进度和结果

## 技术实现

### 前端架构

1. **crsStore.ts**：坐标系状态管理
   - 管理当前坐标系
   - 提供CGCS2000坐标系列表
   - 支持坐标系查询和切换

2. **CRSDialog.tsx**：坐标系选择对话框
   - 分类显示坐标系
   - 搜索和过滤功能
   - WKT查看和复制

3. **useCRSProjection.ts**：坐标系投影Hook
   - 监听坐标系变更事件
   - 自动重投影所有矢量图层
   - 错误处理和进度提示

4. **gdalService.ts**：GDAL服务扩展
   - `projectGeoJSON()` - GeoJSON投影
   - `getGeoJSONWithProjection()` - 获取投影后的GeoJSON

### 后端接口（需要实现）

建议后端实现以下Tauri命令：

```rust
// 投影GeoJSON
#[tauri::command]
async fn gdal_project_geojson(
    geojson: String,
    from_crs: String,
    to_crs: String
) -> Result<Value, String>

// 获取投影后的GeoJSON
#[tauri::command]
async fn gdal_get_geojson_projected(
    path: String,
    target_crs: String
) -> Result<Value, String>
```

## 注意事项

1. **坐标系选择**：
   - 地理坐标系适用于全球范围数据
   - 投影坐标系适用于区域性测绘工作
   - 选择合适的中央经线可减少投影变形

2. **性能考虑**：
   - 大量数据投影可能需要时间
   - 切换坐标系时会重投影所有图层
   - 建议在加载数据前设置好坐标系

3. **精度问题**：
   - 坐标系转换可能引入微小误差
   - 建议使用与数据来源一致的坐标系
   - 投影坐标系在中央经线附近精度最高

## 后续改进

1. 支持更多坐标系（如Beijing 54, Xi'an 80等）
2. 支持自定义坐标系（输入WKT或PROJ.4）
3. 图层级坐标系管理（不同图层使用不同坐标系）
4. 坐标系转换参数设置
5. 坐标系匹配建议（根据数据范围自动推荐）
