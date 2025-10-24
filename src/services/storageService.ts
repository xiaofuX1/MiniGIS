/**
 * 本地存储服务
 * 用于持久化项目状态、地图状态、图层信息等
 */

const STORAGE_KEYS = {
  PROJECT: 'minigis_project',
  MAP_STATE: 'minigis_map_state',
  LAYERS: 'minigis_layers',
  RECENT_FILES: 'minigis_recent_files',
  LAST_SESSION: 'minigis_last_session',
  MAP_TABS_SESSION: 'minigis_map_tabs_session',  // 多地图标签页会话
} as const;

export interface ProjectState {
  name: string;
  lastOpened: string;
  mapState: {
    center: [number, number];
    zoom: number;
    rotation?: number;  // 地图旋转角度
  };
  layers: Array<{
    id: string;
    name: string;
    type: string;
    sourceType: string;  // 图层源类型
    path?: string;
    url?: string;
    layerIndex?: number; // KML等多图层文件的图层索引
    visible: boolean;
    opacity: number;
    projection?: string;  // 源坐标系
    style?: {
      fillColor?: string;
      strokeColor?: string;
      strokeWidth?: number;
      pointSize?: number;
      symbolizer?: any;  // 符号系统配置
    };
    labelConfig?: any;  // 标注配置
    extent?: {  // 图层范围
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
    // 分组相关字段
    groupId?: string;
    isGroup?: boolean;
    expanded?: boolean;
    children?: Array<{
      id: string;
      name: string;
      type: string;
      sourceType: string;
      path?: string;
      url?: string;
      layerIndex?: number;
      visible: boolean;
      opacity: number;
      projection?: string;  // 源坐标系
      style?: any;
      labelConfig?: any;
      extent?: any;
      groupId?: string;
    }>;
  }>;
  // 坐标系信息
  crs?: {
    code: string;
    name: string;
    type: string;
    wkt: string;
  };
  // 底图配置
  basemaps?: Array<{
    id: string;
    name: string;
    url: string;
    visible: boolean;
    opacity: number;
  }>;
  // UI布局状态
  uiState?: {
    leftPanelCollapsed: boolean;
    rightPanelCollapsed: boolean;
    bottomPanelCollapsed: boolean;
    rightPanelType: 'feature' | 'symbology' | 'label' | null;
    leftPanelState: {
      dockPosition: 'left' | 'right' | 'bottom' | 'floating';
      width: number;
      height: number;
      floatingPosition?: { x: number; y: number };
    };
    rightPanelState: {
      dockPosition: 'left' | 'right' | 'bottom' | 'floating';
      width: number;
      height: number;
      floatingPosition?: { x: number; y: number };
    };
    bottomPanelState: {
      dockPosition: 'left' | 'right' | 'bottom' | 'floating';
      width: number;
      height: number;
      floatingPosition?: { x: number; y: number };
    };
  };
  // 属性表状态
  attributeTableState?: {
    openLayerIds: string[];
    activeLayerId: string | null;
  };
}

/**
 * 保存项目状态
 */
export const saveProjectState = (state: ProjectState): void => {
  try {
    const data = {
      ...state,
      lastOpened: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.LAST_SESSION, JSON.stringify(data));
  } catch (error) {
    console.error('保存项目状态失败:', error);
  }
};

/**
 * 加载上次的项目状态
 */
export const loadProjectState = (): ProjectState | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LAST_SESSION);
    if (!data) return null;
    
    const state = JSON.parse(data) as ProjectState;
    return state;
  } catch (error) {
    console.error('加载项目状态失败:', error);
    return null;
  }
};

/**
 * 清除项目状态
 */
export const clearProjectState = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.LAST_SESSION);
  } catch (error) {
    console.error('清除项目状态失败:', error);
  }
};

/**
 * 保存最近打开的文件列表
 */
export const saveRecentFile = (path: string): void => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECENT_FILES);
    let recentFiles: string[] = data ? JSON.parse(data) : [];
    
    // 移除重复项
    recentFiles = recentFiles.filter(f => f !== path);
    
    // 添加到开头
    recentFiles.unshift(path);
    
    // 只保留最近10个
    recentFiles = recentFiles.slice(0, 10);
    
    localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(recentFiles));
  } catch (error) {
    console.error('保存最近文件失败:', error);
  }
};

/**
 * 获取最近打开的文件列表
 */
export const getRecentFiles = (): string[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECENT_FILES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('❌ 获取最近文件失败:', error);
    return [];
  }
};

/**
 * 保存地图状态
 */
export const saveMapState = (center: [number, number], zoom: number): void => {
  try {
    const data = { center, zoom };
    localStorage.setItem(STORAGE_KEYS.MAP_STATE, JSON.stringify(data));
  } catch (error) {
    console.error('❌ 保存地图状态失败:', error);
  }
};

/**
 * 加载地图状态
 */
export const loadMapState = (): { center: [number, number]; zoom: number } | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MAP_STATE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('❌ 加载地图状态失败:', error);
    return null;
  }
};

/**
 * 检查文件是否存在（通过 Tauri）
 */
export const checkFileExists = async (path: string): Promise<boolean> => {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const exists = await invoke<boolean>('file_exists', { path });
    return exists;
  } catch (error) {
    console.warn('检查文件存在性失败:', path, error);
    return false;
  }
};

/**
 * 过滤不存在的图层文件
 */
export const filterExistingLayers = async (layers: any[]): Promise<any[]> => {
  const results = await Promise.all(
    layers.map(async (layer) => {
      // 底图直接保留
      if (layer.type === 'basemap') {
        return { layer, exists: true };
      }
      
      // 分组图层：检查所有子图层
      if (layer.isGroup && layer.children) {
        const childResults = await Promise.all(
          layer.children.map(async (child: any) => {
            if (!child.path) {
              return { child, exists: false };
            }
            const exists = await checkFileExists(child.path);
            return { child, exists };
          })
        );
        
        // 过滤存在的子图层
        const existingChildren = childResults
          .filter(r => r.exists)
          .map(r => r.child);
        
        // 如果有子图层存在，保留分组
        if (existingChildren.length > 0) {
          return {
            layer: {
              ...layer,
              children: existingChildren
            },
            exists: true
          };
        } else {
          return { layer, exists: false };
        }
      }
      
      // 普通图层：检查文件是否存在
      if (!layer.source?.path) {
        return { layer, exists: false };
      }
      
      const exists = await checkFileExists(layer.source.path);
      return { layer, exists };
    })
  );
  
  const existingLayers = results
    .filter(r => r.exists)
    .map(r => r.layer);
  
  const missingCount = results.filter(r => !r.exists).length;
  if (missingCount > 0) {
    console.warn(`${missingCount} 个图层文件不存在，已自动移除`);
  }
  
  return existingLayers;
};

/**
 * 多地图标签页状态
 */
export interface MapTabState {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  layers: Array<{
    id: string;
    name: string;
    type: string;
    sourceType: string;
    path?: string;
    url?: string;
    layerIndex?: number;
    visible: boolean;
    opacity: number;
    projection?: string;
    style?: any;
    labelConfig?: any;
    extent?: any;
    groupId?: string;
    isGroup?: boolean;
    expanded?: boolean;
    children?: any[];
  }>;
  selectedLayerId?: string | null;
  attributeTableLayerIds: string[];
  activeAttributeTableLayerId: string | null;
  createdAt: number;
}

export interface MapTabsSessionState {
  tabs: MapTabState[];
  activeTabId: string | null;
  lastSaved: string;
  // 全局UI状态
  uiState?: {
    leftPanelCollapsed: boolean;
    rightPanelCollapsed: boolean;
    bottomPanelCollapsed: boolean;
    rightPanelType: 'feature' | 'symbology' | 'label' | null;
    leftPanelState: any;
    rightPanelState: any;
    bottomPanelState: any;
  };
}

/**
 * 保存多地图标签页会话状态
 */
export const saveMapTabsSession = (state: MapTabsSessionState): void => {
  try {
    const data = {
      ...state,
      lastSaved: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.MAP_TABS_SESSION, JSON.stringify(data));
    console.log('[持久化] 保存多地图标签页会话:', data.tabs.length, '个标签页');
  } catch (error) {
    console.error('[持久化] 保存多地图标签页会话失败:', error);
  }
};

/**
 * 加载多地图标签页会话状态
 */
export const loadMapTabsSession = (): MapTabsSessionState | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MAP_TABS_SESSION);
    if (!data) return null;
    
    const state = JSON.parse(data) as MapTabsSessionState;
    console.log('[持久化] 加载多地图标签页会话:', state.tabs.length, '个标签页');
    return state;
  } catch (error) {
    console.error('[持久化] 加载多地图标签页会话失败:', error);
    return null;
  }
};

/**
 * 清除多地图标签页会话状态
 */
export const clearMapTabsSession = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.MAP_TABS_SESSION);
    console.log('[持久化] 清除多地图标签页会话');
  } catch (error) {
    console.error('[持久化] 清除多地图标签页会话失败:', error);
  }
};
