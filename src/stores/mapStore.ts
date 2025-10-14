import { create } from 'zustand';
import { saveMapState, loadMapState } from '../services/storageService';

interface MapStore {
  center: [number, number];
  zoom: number;
  basemapUrl: string;
  projection: string;
  extent: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setBasemapUrl: (url: string) => void;
  setProjection: (projection: string) => void;
  setExtent: (extent: MapStore['extent']) => void;
  zoomToExtent: (extent: MapStore['extent']) => void;
  panTo: (center: [number, number]) => void;
  saveState: () => void;
  restoreState: () => void;
}

// 尝试加载上次的地图状态
const savedMapState = loadMapState();

export const useMapStore = create<MapStore>((set) => ({
  center: savedMapState?.center || [39.9093, 116.3974], // 北京坐标
  zoom: savedMapState?.zoom || 10,
  basemapUrl: 'https://gac-geo.googlecnapps.club/maps/vt?lyrs=s&x={x}&y={y}&z={z}',
  projection: 'EPSG:4326',
  extent: null,

  setCenter: (center) => {
    set({ center });
    // 延迟保存，避免频繁写入
    setTimeout(() => {
      saveMapState(useMapStore.getState().center, useMapStore.getState().zoom);
    }, 1000);
  },
  
  setZoom: (zoom) => {
    set({ zoom });
    // 延迟保存，避免频繁写入
    setTimeout(() => {
      saveMapState(useMapStore.getState().center, useMapStore.getState().zoom);
    }, 1000);
  },
  
  setBasemapUrl: (basemapUrl) => set({ basemapUrl }),
  
  setProjection: (projection) => set({ projection }),
  
  setExtent: (extent) => set({ extent }),
  
  zoomToExtent: (extent) => {
    if (!extent) return;
    
    const centerX = (extent.minX + extent.maxX) / 2;
    const centerY = (extent.minY + extent.maxY) / 2;
    
    // 计算合适的缩放级别
    const width = extent.maxX - extent.minX;
    const height = extent.maxY - extent.minY;
    const maxDimension = Math.max(width, height);
    
    let zoom = 10;
    if (maxDimension < 0.01) zoom = 15;
    else if (maxDimension < 0.1) zoom = 12;
    else if (maxDimension < 1) zoom = 10;
    else if (maxDimension < 10) zoom = 8;
    else zoom = 5;
    
    set({
      center: [centerY, centerX],
      zoom,
      extent,
    });
  },
  
  panTo: (center) => {
    set({ center });
  },
  
  saveState: () => {
    const state = useMapStore.getState();
    saveMapState(state.center, state.zoom);
  },
  
  restoreState: () => {
    const savedState = loadMapState();
    if (savedState) {
      set({ center: savedState.center, zoom: savedState.zoom });
    }
  },
}));
