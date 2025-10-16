# 坐标系功能重构整理报告

## 重构时间
2025年10月16日

## 重构目标
全面整理和规范化坐标系功能，修复错误，提升代码可维护性和可读性。

---

## 一、核心改进

### 1. 统一命名规范

**之前：** 混乱的命名
- `CGCS2000_CRS_LIST` - 实际包含WGS84
- `CGCS2000_FULL_LIST` - 导入源

**现在：** 清晰的命名
- `ALL_CRS_LIST` - 所有坐标系列表（主要使用）
- `CGCS2000_CRS_LIST` - 向后兼容别名（已标记@deprecated）
- `CGCS2000_FULL_LIST` - 数据源（仅内部使用）

### 2. 新增常量和枚举

```typescript
// 坐标系类型枚举
export enum CRSType {
  GEOGRAPHIC = 'geographic',
  PROJECTED = 'projected'
}

// 常用坐标系常量
export const COMMON_CRS = {
  WGS84: 'EPSG:4326',
  CGCS2000: 'EPSG:4490',
  WEB_MERCATOR: 'EPSG:3857',
} as const;

// CGCS2000 EPSG代码范围（修复后的正确值）
export const CGCS2000_EPSG_RANGES = {
  ZONE_6_DEGREE: { start: 4491, end: 4501, zoneStart: 13, zoneEnd: 23 },
  CM_6_DEGREE: { start: 4502, end: 4512 },
  ZONE_3_DEGREE: { start: 4513, end: 4533, zoneStart: 25, zoneEnd: 45 },
  CM_3_DEGREE: { start: 4534, end: 4554 },
} as const;
```

### 3. 新增工具函数集 `CRSUtils`

```typescript
export const CRSUtils = {
  // 根据zone号获取EPSG代码
  getEPSGFrom3DegreeZone(zone: number): string | null
  getEPSGFrom6DegreeZone(zone: number): string | null
  
  // 类型判断
  isCGCS2000(epsgCode: string): boolean
  isGeographic(crs: CRSInfo): boolean
  isProjected(crs: CRSInfo): boolean
  
  // 获取分类列表
  getGeographicCRS(): CRSInfo[]
  getProjectedCRS(): CRSInfo[]
}
```

### 4. 扩展Store接口

```typescript
interface CRSStore {
  currentCRS: CRSInfo;
  setCRS: (crs: CRSInfo) => void;
  getAllCRS: () => CRSInfo[];
  getCRSByCode: (code: string) => CRSInfo | undefined;
  getGeographicCRS: () => CRSInfo[];      // 新增
  getProjectedCRS: () => CRSInfo[];       // 新增
}
```

---

## 二、修复的错误

### 1. CRSPanel.tsx - WKT解析错误

**问题：** 旧的错误EPSG计算公式
```typescript
// ❌ 错误（修复前）
const epsgCode = `EPSG:${4490 + zone - 24}`;        // 3度带zone
const epsgCode = `EPSG:${4490 + 24 + zone - 12}`;   // 6度带zone
const epsgCode = `EPSG:${4513 + (cm - 75) / 3}`;    // 3度带CM（错误起始码）
```

**修复：** 使用工具函数和正确公式
```typescript
// ✅ 正确（修复后）
const epsgCode = CRSUtils.getEPSGFrom3DegreeZone(zone);  // 使用工具函数
const epsgCode = CRSUtils.getEPSGFrom6DegreeZone(zone);  // 使用工具函数
const epsgCode = `EPSG:${4534 + (cm - 75) / 3}`;         // 3度带CM（正确起始码4534）
const epsgCode = `EPSG:${4502 + (cm - 75) / 6}`;         // 6度带CM（新增）
```

### 2. 组件导入更新

所有组件从旧命名迁移到新命名：
- `CGCS2000_CRS_LIST` → `ALL_CRS_LIST`
- 导入 `CRSUtils` 工具函数
- 使用 `CRSType` 枚举

**修复的文件：**
- ✅ `src/stores/crsStore.ts`
- ✅ `src/components/Panels/CRSPanel.tsx`
- ✅ `src/components/Dialogs/CRSDialog.tsx`

---

## 三、代码结构优化

### 修复前的问题
1. **命名混乱**：`CGCS2000_CRS_LIST`实际包含WGS84
2. **硬编码**：EPSG计算公式分散在各处，难以维护
3. **重复代码**：多处重复的zone→EPSG转换逻辑
4. **缺少文档**：常量和函数缺少说明

### 修复后的改进
1. **清晰命名**：`ALL_CRS_LIST`明确表示所有坐标系
2. **集中管理**：EPSG范围和计算公式统一到常量和工具函数
3. **代码复用**：通过`CRSUtils`消除重复代码
4. **完善文档**：所有导出都有JSDoc注释

---

## 四、正确的EPSG映射（重要参考）

### CGCS2000完整EPSG范围

| 类型 | Zone/CM | EPSG范围 | 说明 |
|------|---------|----------|------|
| 地理坐标系 | - | 4490 | CGCS2000 |
| 6度带 zone | 13-23 | 4491-4501 | 带号前缀 |
| 6度带 CM | 75E-135E | 4502-4512 | 无带号 |
| 3度带 zone | 25-45 | 4513-4533 | 带号前缀 |
| 3度带 CM | 75E-135E | 4534-4554 | 无带号 |

### 计算公式

```typescript
// 3度带 zone (25-45) → EPSG (4513-4533)
EPSG = 4513 + (zone - 25)

// 6度带 zone (13-23) → EPSG (4491-4501)
EPSG = 4491 + (zone - 13)

// 3度带 CM (75E-135E) → EPSG (4534-4554)
EPSG = 4534 + (centralMeridian - 75) / 3

// 6度带 CM (75E-135E) → EPSG (4502-4512)
EPSG = 4502 + (centralMeridian - 75) / 6
```

---

## 五、使用示例

### 1. 基础使用

```typescript
import { useCRSStore, CRSUtils, COMMON_CRS } from '@/stores/crsStore';

// 获取所有坐标系
const { getAllCRS, getCRSByCode } = useCRSStore();
const allCRS = getAllCRS();

// 使用常量
const wgs84 = getCRSByCode(COMMON_CRS.WGS84);
const cgcs2000 = getCRSByCode(COMMON_CRS.CGCS2000);
```

### 2. Zone转换

```typescript
import { CRSUtils } from '@/stores/crsStore';

// 获取3度带zone 39的EPSG代码
const epsg = CRSUtils.getEPSGFrom3DegreeZone(39);
// 返回: "EPSG:4527"

// 获取6度带zone 20的EPSG代码
const epsg = CRSUtils.getEPSGFrom6DegreeZone(20);
// 返回: "EPSG:4498"
```

### 3. 类型判断

```typescript
import { CRSUtils, CRSType } from '@/stores/crsStore';

const crs = getCRSByCode('EPSG:4527');

// 判断坐标系类型
if (CRSUtils.isProjected(crs)) {
  console.log('投影坐标系');
}

if (CRSUtils.isCGCS2000('EPSG:4527')) {
  console.log('CGCS2000坐标系');
}
```

### 4. 获取分类列表

```typescript
import { CRSUtils } from '@/stores/crsStore';

// 获取所有地理坐标系
const geoCRS = CRSUtils.getGeographicCRS();

// 获取所有投影坐标系
const projCRS = CRSUtils.getProjectedCRS();
```

---

## 六、向后兼容性

为保证现有代码不受影响，保留了以下别名：

```typescript
// ⚠️ 已弃用，但仍可使用
export const CGCS2000_CRS_LIST: CRSInfo[] = ALL_CRS_LIST;
```

**建议：** 逐步将项目中所有`CGCS2000_CRS_LIST`替换为`ALL_CRS_LIST`

---

## 七、测试建议

1. **单元测试**
   - 测试`CRSUtils`中所有工具函数
   - 验证zone→EPSG转换的正确性
   - 测试边界值和异常输入

2. **集成测试**
   - 测试坐标系选择器
   - 验证WKT解析功能
   - 测试投影转换

3. **回归测试**
   - 确认所有使用坐标系的功能正常
   - 验证图层加载和显示
   - 检查坐标显示

---

## 八、后续优化建议

1. **性能优化**
   - 考虑对常用EPSG查询结果进行缓存
   - 优化大量坐标系数据的树形渲染

2. **功能增强**
   - 支持自定义坐标系添加
   - 支持坐标系收藏功能
   - 添加坐标系使用历史

3. **文档完善**
   - 编写坐标系使用指南
   - 添加API参考文档
   - 提供更多使用示例

---

## 九、参考资料

- EPSG官方数据库：https://epsg.io/
- CGCS2000标准文档
- 项目内文档：`docs/CGCS2000_EPSG_FIX.md`
