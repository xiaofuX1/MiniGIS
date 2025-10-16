# 坐标系统功能更新日志

## 新增功能

### 1. 坐标系统管理 (CRS Store)
- 创建 `src/stores/crsStore.ts`
- 支持CGCS2000全系列坐标系（地理坐标系和投影坐标系）
- 包含21个3度带投影坐标系（带号命名）
- 包含5+个3度带投影坐标系（中央经线命名）
- 支持WGS84坐标系

### 2. 坐标系选择对话框
- 创建 `src/components/Dialogs/CRSDialog.tsx`
- 分类显示：
  - CGCS2000地理坐标系
  - 3度带（带号）
  - 3度带（CM）
  - WGS84
- 实时搜索和过滤
- WKT定义查看和复制功能

### 3. 状态栏坐标系显示
- 更新 `src/components/StatusBar/StatusBar.tsx`
- 显示当前坐标系EPSG代码
- 点击弹窗显示完整坐标系信息
- 支持WKT定义复制

### 4. Ribbon菜单集成
- 更新 `src/components/Ribbon/RibbonMenu.tsx`
- 在"数据"组添加"坐标系"按钮
- 自动投影功能集成到文件加载流程

### 5. 自动投影功能
- 创建 `src/hooks/useCRSProjection.ts`
- 监听坐标系切换事件
- 自动重投影所有矢量图层
- 进度提示和错误处理

### 6. GDAL服务扩展
- 更新 `src/services/gdalService.ts`
- 添加 `projectGeoJSON()` - GeoJSON投影方法
- 添加 `getGeoJSONWithProjection()` - 获取投影GeoJSON

### 7. 文档
- 创建 `docs/CRS_FEATURE.md` - 完整功能说明文档
- 包含使用方法、技术实现、注意事项

## 技术细节

### 文件变更列表

**新增文件：**
- `src/stores/crsStore.ts` - 坐标系状态管理
- `src/components/Dialogs/CRSDialog.tsx` - 坐标系选择对话框
- `src/hooks/useCRSProjection.ts` - 坐标系投影Hook
- `docs/CRS_FEATURE.md` - 功能文档

**修改文件：**
- `src/components/StatusBar/StatusBar.tsx` - 添加坐标系显示
- `src/components/Ribbon/RibbonMenu.tsx` - 添加坐标系设置入口和自动投影
- `src/services/gdalService.ts` - 扩展投影方法
- `src/App.tsx` - 集成坐标系投影Hook

### 核心功能流程

1. **坐标系设置**
   ```
   用户点击"坐标系"按钮 
   → 打开CRSDialog 
   → 选择坐标系 
   → 触发crsChanged事件
   ```

2. **数据加载投影**
   ```
   用户添加矢量数据 
   → 读取数据坐标系 
   → 比较与当前地图坐标系 
   → 如不同则自动投影 
   → 添加到图层列表
   ```

3. **坐标系切换投影**
   ```
   用户切换坐标系 
   → useCRSProjection监听事件 
   → 遍历所有矢量图层 
   → 逐个投影GeoJSON 
   → 更新图层数据 
   → 刷新地图显示
   ```

## 后端要求

需要在Rust后端实现以下Tauri命令：

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

**注意：** 当前前端已完成，如果后端未实现这些命令，投影功能会优雅降级（使用原始坐标系数据）。

## 使用示例

### 设置坐标系为CGCS2000 zone 36

1. 点击Ribbon菜单"数据" > "坐标系"
2. 选择"3度带（带号）"标签
3. 找到"CGCS2000 / 3-degree Gauss-Kruger zone 36"
4. 点击"应用"

### 查看坐标系WKT

1. 点击状态栏中的"坐标系: EPSG:4490"
2. 在弹窗中查看完整WKT定义
3. 点击复制按钮复制WKT文本

## 测试建议

1. **基础功能测试**
   - 打开坐标系对话框
   - 切换不同坐标系
   - 验证状态栏显示

2. **投影测试**（需要后端支持）
   - 设置坐标系为CGCS2000 zone 36
   - 添加WGS84数据
   - 验证数据是否正确投影

3. **切换测试**（需要后端支持）
   - 加载多个图层
   - 切换坐标系
   - 验证所有图层是否重投影

## 已知限制

1. 投影功能依赖后端GDAL实现
2. 大数据量投影可能较慢
3. 暂不支持自定义坐标系
4. 暂不支持图层级坐标系管理

## 未来改进

1. 支持更多中国常用坐标系（Beijing 54, Xi'an 80等）
2. 支持6度带投影坐标系
3. 支持自定义坐标系（WKT/PROJ.4输入）
4. 图层级坐标系管理
5. 坐标转换参数设置
6. 根据数据范围自动推荐坐标系
