# 底图记忆功能修复说明

## 问题描述
用户反馈：每次打开应用，底图都恢复为默认的"星图地球影像"，无法记住用户自定义的底图配置。

## 问题原因

### 1. 初始化时序问题
```typescript
// 之前的代码 - layerStore.ts
export const useLayerStore = create<LayerStore>((set, get) => ({
  layers: [defaultBasemapAnnotation, defaultBasemap],  // ❌ 直接添加默认底图
  ...
}));
```

**问题**：
- `layerStore` 在创建时就立即添加了默认底图
- `useRestoreSession` 在组件挂载后 1 秒才执行
- 即使有保存的底图配置，默认底图已经先加载了

### 2. 恢复逻辑不完整
恢复逻辑只在有保存的底图时才添加底图，如果没有保存，就不添加任何底图，导致地图空白。

## 解决方案

### 1. 智能初始化
```typescript
// 修复后的代码 - layerStore.ts
const hasSavedSession = () => {
  try {
    const saved = localStorage.getItem('minigis_last_session');
    return saved !== null;
  } catch {
    return false;
  }
};

// 有保存会话时初始化为空，否则使用默认底图
const initialLayers = hasSavedSession() ? [] : [defaultBasemapAnnotation, defaultBasemap];

export const useLayerStore = create<LayerStore>((set, get) => ({
  layers: initialLayers,  // ✅ 根据是否有保存会话决定初始图层
  ...
}));
```

**优点**：
- 避免默认底图和保存底图的冲突
- 首次启动时仍然显示默认底图
- 有保存会话时交由恢复逻辑处理

### 2. 完善恢复逻辑
```typescript
// 修复后的代码 - useRestoreSession.ts
if (savedState.basemaps && savedState.basemaps.length > 0) {
  // 恢复保存的底图
  for (const basemap of savedState.basemaps) {
    await layerStore.addLayer(basemapLayer);
  }
} else {
  // ✅ 如果没有保存的底图，添加默认底图
  const { defaultBasemap, defaultBasemapAnnotation } = await import('../stores/layerStore');
  await layerStore.addLayer(defaultBasemapAnnotation);
  await layerStore.addLayer(defaultBasemap);
}
```

**优点**：
- 确保总是有底图显示
- 优先使用保存的配置
- 无保存配置时使用默认底图

## 测试步骤

### 测试 1: 隐藏注记层
1. 启动应用
2. 在图层面板中隐藏 "星图地球影像注记" 层
3. 等待 3 秒（自动保存）
4. **重启应用**
5. **验证**：注记层应该保持隐藏状态 ✅

### 测试 2: 更换底图
1. 启动应用
2. 移除默认底图
3. 添加其他底图（如 Google 影像）
4. 等待 3 秒
5. **重启应用**
6. **验证**：应该显示 Google 影像，而不是星图 ✅

### 测试 3: 调整底图透明度
1. 启动应用
2. 调整底图透明度为 0.5
3. 等待 3 秒
4. **重启应用**
5. **验证**：底图透明度应该保持 0.5 ✅

### 测试 4: 首次启动（无保存）
1. 清除 localStorage: `localStorage.removeItem('minigis_last_session')`
2. **重启应用**
3. **验证**：应该显示默认的星图底图 ✅

## 技术细节

### 保存时机
底图配置在以下情况自动保存：
- 添加/删除图层后 2 秒
- 修改图层可见性后 2 秒
- 修改图层透明度后 2 秒

### 保存内容
```typescript
basemaps: [
  {
    id: 'basemap-geovis-image',
    name: '星图地球影像',
    url: 'https://tiles.geovisearth.com/...',
    visible: true,
    opacity: 1
  },
  {
    id: 'basemap-geovis-image-anno',
    name: '星图地球影像注记',
    url: 'https://tiles.geovisearth.com/...',
    visible: false,  // 用户隐藏了注记
    opacity: 1
  }
]
```

### 恢复流程
```
启动应用
  ↓
检查 localStorage
  ↓
有保存会话? 
  ├─ 是 → 初始化空图层列表
  │       ↓
  │     延迟 1 秒执行恢复
  │       ↓
  │     有保存底图?
  │       ├─ 是 → 恢复保存的底图
  │       └─ 否 → 添加默认底图
  │
  └─ 否 → 初始化默认底图
```

## 涉及文件

### 修改的文件
1. **src/stores/layerStore.ts**
   - 导出 `defaultBasemap` 和 `defaultBasemapAnnotation`
   - 添加 `hasSavedSession()` 函数
   - 根据是否有保存会话决定初始图层

2. **src/hooks/useRestoreSession.ts**
   - 完善底图恢复逻辑
   - 无保存底图时添加默认底图

3. **CHANGELOG.md**
   - 记录 bug 修复

### 未修改的文件
- 保存逻辑（`layerStore.saveAllState()`）已经是正确的，不需要修改
- 自动保存监听机制工作正常，不需要修改

## 注意事项

1. **首次启动**：如果用户从未使用过应用（或清除了 localStorage），会显示默认底图
2. **兼容性**：旧版本保存的会话可能没有 `basemaps` 字段，此时会自动添加默认底图
3. **性能**：检查 localStorage 是同步操作，不会影响启动性能

## 用户体验改进

### 修复前
- ❌ 用户隐藏注记层后，重启应用注记层又出现了
- ❌ 用户更换底图后，重启应用又变回星图
- ❌ 用户调整底图透明度，重启后恢复为 1.0

### 修复后
- ✅ 底图配置完全记忆
- ✅ 用户的所有底图设置都被保留
- ✅ 提供一致的用户体验
