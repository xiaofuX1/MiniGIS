# GDAL 3.8.5 集成快速指南

## ✅ 已完成配置

### 后端 (Rust)

1. **build.rs** - 已配置 vcpkg GDAL 链接
   - GDAL 库路径：`C:\vcpkg\installed\x64-windows\lib`
   - 头文件路径：`C:\vcpkg\installed\x64-windows\include`
   - 自动设置环境变量

2. **Cargo.toml** - 已添加依赖
   ```toml
   gdal = { version = "0.16", features = ["bindgen"] }
   gdal-sys = "0.10"
   ```

3. **GDAL 服务模块** - 已创建
   - `src-tauri/src/services/gdal_service.rs` - 核心服务
   - `src-tauri/src/commands/gdal.rs` - Tauri 命令
   - `src-tauri/src/gis/gdal_init.rs` - 初始化模块

4. **Tauri 命令** - 已注册
   - `gdal_open_vector` - 打开矢量文件
   - `gdal_get_attribute_table` - 读取属性表
   - `gdal_get_geojson` - 读取GeoJSON
   - `gdal_transform_coordinates` - 坐标转换
   - `gdal_get_drivers` - 获取支持格式
   - `gdal_get_version` - 获取版本

### 前端 (TypeScript/React)

1. **GDAL 服务封装** - 已创建
   - `src/services/gdalService.ts` - 前端服务类
   - 完整的 TypeScript 类型定义
   - 单例模式，开箱即用

### 打包配置

1. **tauri.conf.json** - 已配置
   - 自动打包 GDAL 及所有依赖 DLL
   - 打包 GDAL 数据文件
   - Windows 安装包配置

## 📋 使用前检查

### 确认 vcpkg GDAL 安装

运行以下命令检查 GDAL 是否正确安装：

```powershell
# 检查 GDAL 库文件
dir C:\vcpkg\installed\x64-windows\lib\gdal*.lib

# 检查 GDAL DLL
dir C:\vcpkg\installed\x64-windows\bin\gdal*.dll

# 检查 GDAL 数据文件
dir C:\vcpkg\installed\x64-windows\share\gdal
```

如果文件不存在，请安装 GDAL：

```powershell
# 安装 GDAL
vcpkg install gdal:x64-windows

# 或安装完整版本（包含所有格式支持）
vcpkg install gdal[all]:x64-windows
```

## 🚀 快速开始

### 1. 构建项目

```bash
# 开发模式
npm run tauri:dev

# 生产构建
npm run tauri:build
```

首次编译可能需要较长时间，因为需要：
- 编译 GDAL Rust 绑定
- 链接 GDAL C++ 库
- 复制依赖文件

### 2. 前端使用示例

```typescript
import { gdalService } from '@/services/gdalService';

// 打开矢量文件
async function loadVectorFile(path: string) {
  try {
    // 获取文件信息
    const info = await gdalService.openVector(path);
    console.log('要素数量:', info.feature_count);
    console.log('几何类型:', info.geometry_type);
    
    // 读取 GeoJSON
    const geojson = await gdalService.getGeoJSON(path);
    
    // 读取属性表（分页）
    const attributes = await gdalService.getAttributeTable(path, 0, 100);
    
    return { info, geojson, attributes };
  } catch (error) {
    console.error('加载失败:', error);
  }
}

// 坐标转换示例
async function convertCoordinates() {
  const coords: Array<[number, number]> = [[116.4, 39.9]]; // 北京 WGS84
  
  // 转换到 Web 墨卡托
  const mercator = await gdalService.wgs84ToWebMercator(coords);
  console.log('Web墨卡托坐标:', mercator);
}

// 获取 GDAL 版本
async function checkGdalVersion() {
  const version = await gdalService.getVersion();
  console.log('GDAL 版本:', version);
}
```

### 3. React 组件示例

```tsx
import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { gdalService } from '@/services/gdalService';

function VectorLoader() {
  const [info, setInfo] = useState(null);

  const handleOpen = async () => {
    const file = await open({
      multiple: false,
      filters: [{
        name: 'Vector Files',
        extensions: ['shp', 'gpkg', 'geojson', 'kml']
      }]
    });

    if (file) {
      const vectorInfo = await gdalService.openVector(file);
      setInfo(vectorInfo);
    }
  };

  return (
    <div>
      <button onClick={handleOpen}>打开矢量文件</button>
      {info && (
        <div>
          <p>要素数: {info.feature_count}</p>
          <p>类型: {info.geometry_type}</p>
        </div>
      )}
    </div>
  );
}
```

## 🔧 故障排除

### 编译错误

**问题：** `error: linking with 'link.exe' failed`

**解决：**
```powershell
# 确认 GDAL 库存在
dir C:\vcpkg\installed\x64-windows\lib\gdal.lib

# 重新编译
cargo clean
npm run tauri:dev
```

**问题：** `GDAL_HOME not found`

**解决：** 检查 `build.rs` 中的路径是否正确，确保 vcpkg 安装在 `C:\vcpkg`

### 运行时错误

**问题：** 应用启动时提示 "找不到 gdal_*.dll"

**解决：**
1. 开发模式：确认 PATH 环境变量包含 `C:\vcpkg\installed\x64-windows\bin`
2. 生产模式：重新打包，确保 DLL 被复制

**问题：** "GDAL健康检查失败"

**解决：**
1. 检查 GDAL_DATA 环境变量
2. 确认 `gdal-data` 文件夹存在
3. 查看应用日志获取详细错误信息

### 打包问题

**问题：** 打包后无法运行

**解决：**
1. 检查 `tauri.conf.json` 中的 `bundle.resources` 配置
2. 确认所有 DLL 都在 `resources` 列表中
3. 手动检查输出目录中的文件

## 📦 支持的文件格式

### 矢量格式
- ✅ Shapefile (.shp)
- ✅ GeoPackage (.gpkg)
- ✅ GeoJSON (.geojson, .json)
- ✅ KML/KMZ (.kml, .kmz)
- ✅ MapInfo TAB (.tab)
- ✅ GML (.gml)
- ✅ DXF (.dxf)

### 栅格格式
- ✅ GeoTIFF (.tif, .tiff)
- ✅ JPEG2000 (.jp2)
- ✅ PNG (.png)
- ✅ JPEG (.jpg, .jpeg)

完整格式列表可通过 `gdalService.getSupportedDrivers()` 获取。

## 🎯 下一步

1. **集成到现有组件**
   - 更新文件打开对话框支持更多格式
   - 替换现有 shapefile 读取逻辑为 GDAL

2. **添加新功能**
   - 栅格数据支持
   - 空间分析功能
   - 格式转换功能

3. **性能优化**
   - 大数据集分页加载
   - 空间索引利用
   - 缓存机制

## 📚 参考文档

- [GDAL 集成详细文档](./docs/GDAL_INTEGRATION.md)
- [GDAL 官方文档](https://gdal.org/)
- [Rust GDAL 绑定](https://github.com/georust/gdal)

## ❓ 常见问题

**Q: 为什么选择 GDAL 3.8.5？**
A: 这是稳定版本，兼容性好，功能完整。

**Q: 可以使用其他版本的 GDAL 吗？**
A: 可以，修改 `build.rs` 中的版本号和路径即可。

**Q: 如何添加新的文件格式支持？**
A: GDAL 已包含大部分格式支持，无需额外配置。部分格式需要在 vcpkg 安装时指定特性。

**Q: 性能如何？**
A: GDAL 是 C++ 实现，性能优秀。大型数据集建议使用分页和空间索引。

**Q: 可以在 macOS/Linux 上使用吗？**
A: 可以，需要相应调整 `build.rs` 中的路径和配置。

---

**配置完成！** 🎉 现在可以开始使用 GDAL 强大的地理数据处理能力了。
