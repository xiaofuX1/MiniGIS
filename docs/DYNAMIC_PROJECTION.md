# 动态投影功能说明

## 功能概述

MiniGIS 现已实现真正的动态投影功能，类似 ArcGIS Pro 的工作方式：

- **地图坐标系可配置**：可以将地图投影设置为任意支持的坐标系（如 EPSG:4503 CGCS2000 3度带 zone 37）
- **自动投影转换**：OpenLayers 自动将不同坐标系的数据和底图动态投影到地图坐标系
- **无需手动转换**：不再需要手动重投影图层数据，一切由 OpenLayers 投影引擎自动处理
- **高效性能**：避免了重复的数据转换和网络请求

## 技术架构

### 核心改造

#### 1. 投影注册系统 (`projectionRegistry.ts`)

- 在应用启动时注册所有 CGCS2000 坐标系到 OpenLayers
- 使用 proj4 和 OpenLayers 的 proj4 集成
- 支持 CGCS2000 全系列坐标系（EPSG:4490, EPSG:4491-4554）

```typescript
import { registerAllProjections } from '../utils/projectionRegistry';

// 在地图初始化时调用
registerAllProjections();
```

#### 2. 动态地图投影 (`MapView.tsx`)

**地图初始化**：
```typescript
const initialView = new View({
  center: latLngToOL(center),
  zoom: zoom,
  projection: currentCRS.code, // 使用当前坐标系作为地图投影
  // ...其他配置
});
```

**坐标系变化监听**：
```typescript
useEffect(() => {
  const map = mapInstance.current;
  if (!map || !mapLoaded) return;

  // 保存当前视图状态
  const oldView = map.getView();
  const oldCenter = oldView.getCenter();
  const oldZoom = oldView.getZoom();
  
  // 创建新的View，使用新的投影坐标系
  const newView = new View({
    projection: currentCRS.code,
    center: oldCenter, // OpenLayers会自动转换坐标
    zoom: oldZoom,
    // ...
  });
  
  // 设置新View
  map.setView(newView);
}, [currentCRS.code, mapLoaded]);
```

#### 3. 自动投影图层加载

**矢量图层加载**：
```typescript
// 使用图层的projection作为数据坐标系，地图的projection作为显示坐标系
const dataProjection = layer.projection || 'EPSG:4326';
const featureProjection = map.getView().getProjection().getCode();

const features = format.readFeatures(data, {
  dataProjection: dataProjection,      // 数据源坐标系
  featureProjection: featureProjection, // 地图显示坐标系
});
```

OpenLayers 会自动将数据从 `dataProjection` 投影到 `featureProjection`。

#### 4. 数据加载优化 (`RibbonMenu.tsx`)

```typescript
// 获取数据的原始坐标系
const sourceCrs = info.projection || 'EPSG:4326';

// 使用 GDAL 获取 GeoJSON 数据（保持原始坐标系）
const geojson = await invoke('gdal_get_geojson', { path: selected });

// 添加图层时保存原始坐标系信息
await addLayer({
  // ...
  projection: sourceCrs,  // 保存图层的源坐标系
  geojson: geojson,       // 原始坐标系的数据
});
```

不再手动投影数据，让 OpenLayers 在渲染时自动处理。

## 使用方法

### 设置地图坐标系为 CGCS2000 3度带 zone 37

1. 打开**数据** > **坐标系**面板
2. 选择 **EPSG:4513** (CGCS2000 / 3-degree Gauss-Kruger zone 37, 中央经线 111°E)
3. 点击**应用坐标系**

### 加载不同坐标系的数据

1. 地图设置为 EPSG:4513
2. 加载 WGS84 (EPSG:4326) 数据 → 自动投影到 EPSG:4513
3. 加载 CGCS2000 地理 (EPSG:4490) 数据 → 自动投影到 EPSG:4513
4. 加载其他 CGCS2000 投影数据 → 自动投影到 EPSG:4513

所有数据都会自动显示在同一地图上，无需手动转换。

### 切换地图坐标系

1. 地图当前为 EPSG:4513，已加载多个不同坐标系的图层
2. 切换到 EPSG:4490 (CGCS2000 地理坐标系)
3. 所有图层自动重新投影到 EPSG:4490 显示

## 优势对比

### 旧方案（手动投影）

```
用户加载文件
  ↓
检测数据坐标系
  ↓
调用后端 GDAL 投影转换
  ↓
返回已投影的 GeoJSON
  ↓
显示在地图上

切换坐标系：
  ↓
调用后端重新投影所有图层
  ↓
更新所有图层数据
  ↓
重新渲染
```

**问题**：
- 每次切换坐标系都要重新请求后端
- 网络传输大量 GeoJSON 数据
- 用户等待时间长
- 图层数据被修改，失去原始坐标系信息

### 新方案（动态投影）

```
用户加载文件
  ↓
获取原始 GeoJSON（保持原坐标系）
  ↓
保存 projection 信息
  ↓
OpenLayers 自动投影显示

切换坐标系：
  ↓
更新 View 的 projection
  ↓
OpenLayers 自动重投影所有图层
  ↓
立即完成
```

**优势**：
- 切换坐标系瞬间完成，无需请求后端
- 保留图层原始坐标系信息
- 减少网络传输和服务器负载
- 用户体验更流畅

## 技术细节

### 坐标系注册

使用 proj4 和 WKT 定义注册坐标系：

```typescript
ALL_CRS_LIST.forEach(crs => {
  if (crs.code === 'EPSG:4326' || crs.code === 'EPSG:3857') {
    return; // 内置坐标系，跳过
  }
  
  // 使用WKT定义proj4
  proj4.defs(crs.code, crs.wkt);
});

// 将proj4注册到OpenLayers
register(proj4);
```

### 投影转换流程

```
数据坐标系 (layer.projection)
         ↓
    OpenLayers proj4
         ↓
地图坐标系 (view.projection)
         ↓
      屏幕显示
```

### 支持的操作

- ✅ 加载不同坐标系的矢量数据
- ✅ 切换地图坐标系
- ✅ 高亮和选择要素
- ✅ 测量距离和面积
- ✅ 要素信息查看
- ✅ 底图自动投影（Web墨卡托 ↔ 其他坐标系）

## 注意事项

### 底图投影

Web 瓦片底图通常使用 EPSG:3857（Web墨卡托），OpenLayers 会自动将其投影到当前地图坐标系。但某些投影可能导致变形：

- EPSG:4326 (WGS84 地理) → 瓦片正常显示
- EPSG:3857 (Web墨卡托) → 瓦片正常显示  
- EPSG:4513 (CGCS2000 投影) → 瓦片会有变形，适合矢量数据操作

### 性能考虑

- 投影转换在客户端进行，复杂图层可能略有延迟
- 地理坐标系 ↔ 投影坐标系转换较快
- 投影坐标系 ↔ 投影坐标系转换稍慢

### 数据范围

某些投影坐标系有特定的有效范围：
- CGCS2000 3度带适合对应分带区域
- 跨带使用可能导致变形或精度损失

## 总结

动态投影功能使 MiniGIS 更接近专业 GIS 软件的工作方式，提供了更好的用户体验和更高的效率。用户可以自由选择适合的地图坐标系，加载各种坐标系的数据，一切投影转换都由系统自动完成。
