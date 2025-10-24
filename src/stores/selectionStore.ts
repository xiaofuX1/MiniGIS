import { create } from 'zustand';

// 识别到的要素信息
export interface InspectedFeatureInfo {
  feature: any; // GeoJSON要素
  layer: any; // 图层信息
  layerName: string; // 图层名称
  layerId: string; // 图层ID
}

interface SelectionStore {
  selectedFeatures: any[];
  selectionMode: 'none' | 'single' | 'multiple';
  isSelecting: boolean;
  inspectedFeature: any | null; // 浏览模式下的要素(向后兼容)
  inspectedFeatures: InspectedFeatureInfo[]; // 浏览模式下识别到的所有要素
  currentInspectedIndex: number; // 当前选中的识别要素索引
  selectedFeatureId: string | null; // 当前选中的要素ID
  setSelectedFeatures: (features: any[]) => void;
  addSelectedFeature: (feature: any) => void;
  clearSelection: () => void;
  setSelectionMode: (mode: 'none' | 'single' | 'multiple') => void;
  setIsSelecting: (isSelecting: boolean) => void;
  setInspectedFeature: (feature: any | null) => void;
  setInspectedFeatures: (features: InspectedFeatureInfo[]) => void;
  setCurrentInspectedIndex: (index: number) => void;
  setSelectedFeatureId: (id: string | null) => void;
}

export const useSelectionStore = create<SelectionStore>((set) => ({
  selectedFeatures: [],
  selectionMode: 'single',
  isSelecting: false,
  inspectedFeature: null,
  inspectedFeatures: [],
  currentInspectedIndex: 0,
  selectedFeatureId: null,

  setSelectedFeatures: (features) => set({ selectedFeatures: features }),
  
  addSelectedFeature: (feature) => set((state) => ({
    selectedFeatures: state.selectionMode === 'single' 
      ? [feature] 
      : [...state.selectedFeatures, feature]
  })),
  
  clearSelection: () => set({ selectedFeatures: [], selectedFeatureId: null }),
  
  setSelectionMode: (mode) => set({ selectionMode: mode }),
  
  setIsSelecting: (isSelecting) => set({ isSelecting }),
  
  setInspectedFeature: (feature) => set({ inspectedFeature: feature }),
  
  setInspectedFeatures: (features) => set({ 
    inspectedFeatures: features,
    currentInspectedIndex: 0,
    inspectedFeature: features.length > 0 ? features[0].feature : null
  }),
  
  setCurrentInspectedIndex: (index) => set((state) => ({
    currentInspectedIndex: index,
    inspectedFeature: state.inspectedFeatures[index]?.feature || null
  })),
  
  setSelectedFeatureId: (id) => set({ selectedFeatureId: id })
}));
