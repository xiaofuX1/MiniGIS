import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Symbolizer } from '../types';
import { saveProjectState } from '../services/storageService';
import { useMapStore } from './mapStore';
import { useProjectStore } from './projectStore';
import type { CRSInfo } from './crsStore';
import type { UiStore } from './uiStore';

export interface LabelConfig {
  enabled: boolean;          // 是否启用标注
  field: string;             // 标注字段名
  fontSize?: number;         // 字体大小，默认12
  fontColor?: string;        // 字体颜色，默认'#000000'
  fontWeight?: 'normal' | 'bold'; // 字体粗细，默认'normal'（实际生效）
  haloColor?: string;        // 光晕颜色，默认'#ffffff'
  haloWidth?: number;        // 光晕宽度，默认1
  offset?: [number, number]; // 标注偏移，默认[0, 0]
  anchor?: 'center' | 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; // 标注位置，默认'center'
}

export interface Layer {
  id: string;
  name: string;
  type: 'vector' | 'raster' | 'basemap';
  source: {
    type: 'shapefile' | 'geojson' | 'wms' | 'xyz';
    path?: string;
    url?: string;
  };
  visible: boolean;
  opacity: number;
  projection?: string;  // 图层的源坐标系（从后端获取）
  style?: {
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    pointSize?: number;
    symbolizer?: Symbolizer;  // 符号系统
  };
  extent?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  geojson?: any;  // GeoJSON数据用于地图渲染
  labelConfig?: LabelConfig; // 标注配置
}

interface LayerStore {
  layers: Layer[];
  selectedLayer: Layer | null;
  attributeTableLayerIds: string[]; // 当前打开属性表的图层ID列表
  activeAttributeTableLayerId: string | null; // 当前激活的属性表标签页
  addLayer: (layer: Layer) => Promise<void>;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  toggleLayerVisibility: (layerId: string) => void;
  updateLayerOpacity: (layerId: string, opacity: number) => void;
  selectLayer: (layer: Layer | null) => void;
  reorderLayers: (layers: Layer[]) => void;
  clearLayers: () => void;
  addAttributeTableLayer: (layerId: string) => void;
  removeAttributeTableLayer: (layerId: string) => void;
  setActiveAttributeTableLayer: (layerId: string | null) => void;
  saveAllState: () => void; // 保存完整状态
}

// 默认底图 - 星图地球影像
const geovisToken = '488fb6d94c9f290d58a855e648fe70d7f02db5ef9e496a07165ecfe3d2ccc4da';

export const defaultBasemapAnnotation: Layer = {
  id: 'basemap-geovis-image-anno',
  name: '星图地球影像注记',
  type: 'basemap',
  source: {
    type: 'xyz',
    url: `https://tiles.geovisearth.com/base/v1/cia/{z}/{x}/{y}?token=${geovisToken}`,
  },
  visible: true,
  opacity: 1,
};

export const defaultBasemap: Layer = {
  id: 'basemap-geovis-image',
  name: '星图地球影像',
  type: 'basemap',
  source: {
    type: 'xyz',
    url: `https://tiles.geovisearth.com/base/v1/img/{z}/{x}/{y}?token=${geovisToken}`,
  },
  visible: true,
  opacity: 1,
};

// 检查是否有保存的会话
const hasSavedSession = () => {
  try {
    const saved = localStorage.getItem('minigis_last_session');
    return saved !== null;
  } catch {
    return false;
  }
};

// 初始图层：如果有保存的会话则为空，否则使用默认底图
const initialLayers = hasSavedSession() ? [] : [defaultBasemapAnnotation, defaultBasemap];

export const useLayerStore = create<LayerStore>((set, get) => ({
  layers: initialLayers,
  selectedLayer: null,
  attributeTableLayerIds: [],
  activeAttributeTableLayerId: null,

  addLayer: async (layer: Layer) => {
    try {
      // 检查是否已存在相同ID的图层
      const existingLayer = get().layers.find(l => l.id === layer.id);
      if (existingLayer) {
        console.warn(`Layer with id ${layer.id} already exists`);
        return;
      }

      // 如果是来自后端的图层，调用后端添加
      if (layer.source.path) {
        const projectId = 'current'; // TODO: 从projectStore获取当前项目ID
        
        // 映射前端字段到后端格式
        const backendLayer = {
          id: layer.id,
          name: layer.name,
          layer_type: layer.type,  // 前端: type -> 后端: layer_type
          source: {
            source_type: layer.source.type,  // 前端: type -> 后端: source_type
            path: layer.source.path,
            url: layer.source.url,
            params: null
          },
          visible: layer.visible,
          opacity: layer.opacity,
          style: {
            fill_color: layer.style?.fillColor || '#3388ff',
            stroke_color: layer.style?.strokeColor || '#0066cc',
            stroke_width: layer.style?.strokeWidth || 2
          },
          extent: layer.extent ? {
            min_x: layer.extent.minX,
            min_y: layer.extent.minY,
            max_x: layer.extent.maxX,
            max_y: layer.extent.maxY,
          } : null,
          attributes: null
        };
        
        await invoke('add_layer', { projectId, layer: backendLayer });
      }
      
      set((state) => {
        // 将底图和其他图层分开
        const basemaps = state.layers.filter(l => l.type === 'basemap');
        const otherLayers = state.layers.filter(l => l.type !== 'basemap');
        
        // 新图层根据类型决定位置
        if (layer.type === 'basemap') {
          // 底图添加到底图列表末尾
          return {
            layers: [...otherLayers, ...basemaps, layer],
            selectedLayer: layer,
          };
        } else {
          // 其他图层添加到顶部（底图之上）
          return {
            layers: [layer, ...otherLayers, ...basemaps],
            selectedLayer: layer,
          };
        }
      });
    } catch (error) {
      console.error('Failed to add layer:', error);
      throw error;
    }
  },

  removeLayer: (layerId: string) => {
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== layerId),
      selectedLayer: state.selectedLayer?.id === layerId ? null : state.selectedLayer,
    }));
  },

  updateLayer: (layerId: string, updates: Partial<Layer>) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, ...updates } : l
      ),
      selectedLayer:
        state.selectedLayer?.id === layerId
          ? { ...state.selectedLayer, ...updates }
          : state.selectedLayer,
    }));
  },

  toggleLayerVisibility: (layerId: string) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      ),
    }));
  },

  updateLayerOpacity: (layerId: string, opacity: number) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, opacity } : l
      ),
    }));
  },

  selectLayer: (layer: Layer | null) => {
    set({ selectedLayer: layer });
  },

  reorderLayers: (layers: Layer[]) => {
    set({ layers });
  },

  clearLayers: () => {
    set({ layers: [], selectedLayer: null });
  },

  addAttributeTableLayer: (layerId: string) => {
    const { attributeTableLayerIds } = get();
    if (!attributeTableLayerIds.includes(layerId)) {
      set({ 
        attributeTableLayerIds: [...attributeTableLayerIds, layerId],
        activeAttributeTableLayerId: layerId
      });
      // 自动选中该图层
      const layer = get().layers.find(l => l.id === layerId);
      if (layer) {
        set({ selectedLayer: layer });
      }
    } else {
      // 如果已经打开，则切换到该标签页
      set({ activeAttributeTableLayerId: layerId });
    }
  },

  removeAttributeTableLayer: (layerId: string) => {
    const { attributeTableLayerIds, activeAttributeTableLayerId } = get();
    const newLayerIds = attributeTableLayerIds.filter(id => id !== layerId);
    const newActiveId = activeAttributeTableLayerId === layerId 
      ? (newLayerIds.length > 0 ? newLayerIds[newLayerIds.length - 1] : null)
      : activeAttributeTableLayerId;
    
    set({ 
      attributeTableLayerIds: newLayerIds,
      activeAttributeTableLayerId: newActiveId
    });
  },

  setActiveAttributeTableLayer: (layerId: string | null) => {
    set({ activeAttributeTableLayerId: layerId });
  },
  
  saveAllState: () => {
    const allLayers = get().layers;
    const dataLayers = allLayers.filter(l => l.type !== 'basemap');
    const basemapLayers = allLayers.filter(l => l.type === 'basemap');
    const mapState = useMapStore.getState();
    const projectState = useProjectStore.getState();
    
    // 延迟导入 store，避免初始化时的循环依赖
    let crsState: { currentCRS: CRSInfo } | null = null;
    let uiState: Partial<UiStore> | null = null;
    
    try {
      // 使用动态import，在运行时加载
      const crsModule = (window as any).__CRS_STORE__;
      if (crsModule) {
        crsState = crsModule.getState();
      }
    } catch (e) {
      // 静默失败，CRS状态不是必需的
    }
    
    try {
      const uiModule = (window as any).__UI_STORE__;
      if (uiModule) {
        uiState = uiModule.getState();
      }
    } catch (e) {
      // 静默失败，UI状态不是必需的
    }
    
    const state = {
      name: projectState.currentProject?.name || '未命名项目',
      lastOpened: new Date().toISOString(),
      mapState: {
        center: mapState.center,
        zoom: mapState.zoom,
        rotation: 0,  // TODO: 如果支持地图旋转，从 mapStore 获取
      },
      layers: dataLayers.map(l => ({
        id: l.id,
        name: l.name,
        type: l.type,
        sourceType: l.source.type,
        path: l.source.path,
        url: l.source.url,
        visible: l.visible,
        opacity: l.opacity,
        style: l.style,
        labelConfig: l.labelConfig,
        extent: l.extent,
      })),
      // 坐标系信息
      crs: crsState ? {
        code: crsState.currentCRS.code,
        name: crsState.currentCRS.name,
        type: crsState.currentCRS.type,
        wkt: crsState.currentCRS.wkt,
      } : undefined,
      // 底图配置
      basemaps: basemapLayers.map(l => ({
        id: l.id,
        name: l.name,
        url: l.source.url || '',
        visible: l.visible,
        opacity: l.opacity,
      })),
      // UI布局状态
      uiState: (uiState && 
                uiState.leftPanelState && 
                uiState.rightPanelState && 
                uiState.bottomPanelState) ? {
        leftPanelCollapsed: uiState.leftPanelCollapsed ?? false,
        rightPanelCollapsed: uiState.rightPanelCollapsed ?? false,
        bottomPanelCollapsed: uiState.bottomPanelCollapsed ?? true,
        rightPanelType: uiState.rightPanelType ?? 'feature',
        leftPanelState: uiState.leftPanelState,
        rightPanelState: uiState.rightPanelState,
        bottomPanelState: uiState.bottomPanelState,
      } : undefined,
      // 属性表状态
      attributeTableState: {
        openLayerIds: get().attributeTableLayerIds,
        activeLayerId: get().activeAttributeTableLayerId,
      },
    };
    
    saveProjectState(state);
  },
}));

// 自动保存：监听图层变化
if (typeof window !== 'undefined') {
  let saveTimer: NodeJS.Timeout;
  useLayerStore.subscribe((state) => {
    // 延迟保存，避免频繁写入
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      state.saveAllState();
    }, 2000);
  });
}
