# MiniGIS 开发指南

本文档包含 MiniGIS 项目的技术实现细节、架构说明和开发注意事项。

## 目录

- [技术架构](#技术架构)
- [GDAL 集成](#gdal-集成)
- [坐标转换系统](#坐标转换系统)
- [编码支持](#编码支持)
- [会话持久化](#会话持久化)
- [开发环境配置](#开发环境配置)

---

## 技术架构

### 前端架构

**框架与库**
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Zustand** - 状态管理
- **MapLibre GL** - 地图渲染引擎
- **Ant Design 5** - UI 组件库
- **TailwindCSS** - 样式方案
- **@turf/turf** - 空间分析

**目录结构**
```
src/
├── components/       # React 组件
│   ├── Map/         # 地图组件
│   ├── Panels/      # 面板组件
│   ├── Ribbon/      # Ribbon 菜单
│   └── StatusBar/   # 状态栏
├── stores/          # Zustand 状态管理
├── services/        # 服务层
├── utils/           # 工具函数
├── types/           # TypeScript 类型定义
└── hooks/           # 自定义 Hooks
```

### 后端架构

**技术栈**
- **Rust** - 系统编程语言
- **Tauri 2.0** - 桌面应用框架
- **GDAL 0.17** - 地理空间数据处理

**模块划分**
```
src-tauri/src/
├── commands/        # Tauri 命令
├── gis/            # GIS 处理模块
├── services/       # 业务服务
├── models.rs       # 数据模型
└── errors.rs       # 错误处理
```

---

## GDAL 集成

### 概述

MiniGIS 使用 GDAL 库提供强大的地理空间数据读取和转换能力。

### 核心功能

#### 1. 矢量数据读取

```rust
pub async fn read_vector_info(path: &str) -> Result<VectorInfo> {
    let dataset = Dataset::open_ex(
        path,
        gdal::DatasetOptions {
            open_flags: gdal::GdalOpenFlags::GDAL_OF_VECTOR | gdal::GdalOpenFlags::GDAL_OF_READONLY,
            open_options: Some(&["ENCODING=GBK"]),
            ..Default::default()
        },
    )?;
    
    let layer = dataset.layer(0)?;
    // ... 处理图层信息
}
```

#### 2. 坐标系转换

GDAL 自动检测坐标系并转换到 WGS84（EPSG:4326）：

```rust
let needs_transform = if let Some(ref srs) = spatial_ref {
    let epsg_code = srs.auth_code().unwrap_or_default();
    epsg_code != 4326 && epsg_code != 4490
} else {
    false
};

if needs_transform {
    let mut target_srs = SpatialRef::from_epsg(4326)?;
    target_srs.set_axis_mapping_strategy(
        gdal::spatial_ref::AxisMappingStrategy::TraditionalGisOrder
    );
    // ... 执行转换
}
```

#### 3. GeoJSON 生成

```rust
pub async fn read_vector_as_geojson(path: &str) -> Result<serde_json::Value> {
    let dataset = Dataset::open(path)?;
    let mut layer = dataset.layer(0)?;
    
    let mut geojson_features = Vec::new();
    for feature in layer.features() {
        // ... 转换要素
    }
    
    Ok(serde_json::json!({
        "type": "FeatureCollection",
        "features": geojson_features
    }))
}
```

### 支持的数据格式

**矢量格式**
- Shapefile (.shp)
- GeoPackage (.gpkg)
- GeoJSON (.geojson, .json)
- KML (.kml, .kmz)
- MapInfo (.tab)
- GML (.gml)

**栅格格式**
- GeoTIFF (.tif, .tiff)
- JPEG2000 (.jp2)
- PNG (.png)
- JPEG (.jpg, .jpeg)

### 环境配置

#### Windows

```powershell
# 设置 GDAL 环境变量
$env:GDAL_HOME = "D:\OSGeo4W\bin"
$env:GDAL_DATA = "D:\OSGeo4W\share\gdal"
$env:PROJ_LIB = "D:\OSGeo4W\share\proj"
$env:PATH = "$env:GDAL_HOME;$env:PATH"
```

#### Linux/macOS

```bash
export GDAL_HOME=/usr/local
export GDAL_DATA=/usr/local/share/gdal
export PROJ_LIB=/usr/local/share/proj
export PATH=$GDAL_HOME/bin:$PATH
```

---

## 坐标转换系统

### 转换流程

1. **检测源坐标系**
   ```rust
   let spatial_ref = layer.spatial_ref();
   let epsg_code = spatial_ref.auth_code().unwrap_or_default();
   ```

2. **创建转换器**
   ```rust
   let transform = gdal::spatial_ref::CoordTransform::new(&source, &target)?;
   ```

3. **执行转换**
   ```rust
   transform.transform_coords(&mut xs, &mut ys, &mut zs)?;
   ```

### 支持的坐标系

- **WGS84** (EPSG:4326) - GPS 坐标系
- **Web墨卡托** (EPSG:3857) - Web 地图坐标系
- **CGCS2000** (EPSG:4490) - 中国大地坐标系
- **其他** - GDAL 支持的所有坐标系

### 轴映射策略

为避免轴顺序问题，统一使用传统 GIS 顺序（经度、纬度）：

```rust
target_srs.set_axis_mapping_strategy(
    gdal::spatial_ref::AxisMappingStrategy::TraditionalGisOrder
);
```

---

## 编码支持

### 中文 Shapefile 支持

Shapefile 使用 DBF 存储属性数据，中国地区数据通常使用 GBK 编码。

#### 自动编码检测

```rust
let dataset = if path.to_lowercase().ends_with(".shp") {
    // 优先尝试 GBK 编码
    match Dataset::open_ex(
        path,
        gdal::DatasetOptions {
            open_flags: gdal::GdalOpenFlags::GDAL_OF_VECTOR,
            open_options: Some(&["ENCODING=GBK"]),
            ..Default::default()
        },
    ) {
        Ok(ds) => ds,
        Err(_) => {
            // GBK 失败，尝试 UTF-8
            Dataset::open(path)?
        }
    }
} else {
    Dataset::open(path)?
};
```

### 编码转换流程

1. 尝试 GBK 编码打开
2. 失败则尝试 UTF-8
3. 读取后统一转为 UTF-8 传递给前端

---

## 会话持久化

### 存储机制

使用浏览器 `localStorage` 保存会话状态：

```typescript
const STORAGE_KEYS = {
  PROJECT: 'minigis_project',
  MAP_STATE: 'minigis_map_state',
  LAYERS: 'minigis_layers',
  RECENT_FILES: 'minigis_recent_files',
  LAST_SESSION: 'minigis_last_session',
};
```

### 保存状态

```typescript
export const saveProjectState = (state: ProjectState): void => {
  const data = {
    ...state,
    lastOpened: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEYS.LAST_SESSION, JSON.stringify(data));
};
```

### 恢复流程

1. **启动时自动恢复**
   ```typescript
   useEffect(() => {
     const restoreSession = async () => {
       const savedState = loadProjectState();
       if (!savedState) return;
       
       // 恢复地图状态
       mapStore.setCenter(savedState.mapState.center);
       mapStore.setZoom(savedState.mapState.zoom);
       
       // 恢复图层
       // ...
     };
     
     setTimeout(restoreSession, 1000);
   }, []);
   ```

2. **文件存在性检查**
   ```typescript
   const filterExistingLayers = async (layers: any[]): Promise<any[]> => {
     const results = await Promise.all(
       layers.map(async (layer) => {
         const exists = await checkFileExists(layer.source.path);
         return { layer, exists };
       })
     );
     
     return results.filter(r => r.exists).map(r => r.layer);
   };
   ```

3. **自动保存**
   ```typescript
   // 监听图层变化，延迟保存
   useLayerStore.subscribe((state) => {
     clearTimeout(saveTimer);
     saveTimer = setTimeout(() => {
       state.saveAllState();
     }, 2000);
   });
   ```

---

## 开发环境配置

### 前置要求

- Node.js >= 18.0.0
- Rust >= 1.70.0
- GDAL >= 3.0.0

### 安装依赖

```bash
# 前端依赖
npm install

# Rust 依赖会在构建时自动安装
```

### 开发模式

```bash
# 标准模式
npm run tauri:dev

# GDAL 模式（已配置环境变量）
npm run dev:gdal
```

### 构建发布

```bash
# 构建生产版本
npm run tauri:build
```

### 调试技巧

1. **前端调试**
   - 使用浏览器开发者工具
   - React DevTools

2. **后端调试**
   - 在 `src-tauri/src/lib.rs` 启用日志：
     ```rust
     env_logger::init();
     log::info!("调试信息");
     ```

3. **GDAL 调试**
   - 检查环境变量是否正确
   - 查看 GDAL 日志输出

### 常见问题

**Q: GDAL 加载失败**
- 检查 GDAL_HOME、GDAL_DATA、PROJ_LIB 环境变量
- 确认 GDAL 库版本兼容

**Q: 坐标转换错误**
- 检查源数据坐标系
- 确认 PROJ 数据库完整

**Q: 中文乱码**
- 确认 Shapefile 编码
- 检查 GDAL 编码选项

---

## 代码规范

### TypeScript

- 使用严格模式
- 避免使用 `any` 类型
- 使用路径别名（@/、@components/等）

### Rust

- 使用 `Result<T>` 进行错误处理
- 避免使用 `unwrap()`，使用 `?` 操作符
- 遵循 Rust 命名规范

### Git 提交

- 使用语义化提交信息
- 格式：`<type>(<scope>): <subject>`
- 类型：feat、fix、docs、style、refactor、test、chore

---

## 性能优化

### 前端优化

1. **虚拟滚动** - 属性表使用虚拟化
2. **延迟保存** - 状态保存延迟 2 秒
3. **地图缓存** - 瓦片缓存

### 后端优化

1. **异步处理** - 使用 Tokio 异步运行时
2. **批量读取** - 支持分页加载属性表
3. **内存管理** - 及时释放 GDAL 资源

---

## 测试策略

### 单元测试

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_read_vector() {
        // ...
    }
}
```

### 集成测试

```typescript
describe('LayerStore', () => {
  it('should add layer', () => {
    // ...
  });
});
```

---

## 参考资源

- [Tauri 官方文档](https://tauri.app/)
- [GDAL 文档](https://gdal.org/)
- [MapLibre GL 文档](https://maplibre.org/)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)
