import { create } from 'zustand';

interface SelectionStore {
  selectedFeatures: any[];
  selectionMode: 'none' | 'single' | 'multiple';
  isSelecting: boolean;
  inspectedFeature: any | null; // 浏览模式下的要素
  selectedFeatureId: string | null; // 当前选中的要素ID
  setSelectedFeatures: (features: any[]) => void;
  addSelectedFeature: (feature: any) => void;
  clearSelection: () => void;
  setSelectionMode: (mode: 'none' | 'single' | 'multiple') => void;
  setIsSelecting: (isSelecting: boolean) => void;
  setInspectedFeature: (feature: any | null) => void;
  setSelectedFeatureId: (id: string | null) => void;
}

export const useSelectionStore = create<SelectionStore>((set) => ({
  selectedFeatures: [],
  selectionMode: 'single',
  isSelecting: false,
  inspectedFeature: null,
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
  
  setSelectedFeatureId: (id) => set({ selectedFeatureId: id })
}));
