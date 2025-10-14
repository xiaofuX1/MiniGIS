import { create } from 'zustand';

type RightPanelType = 'feature' | 'symbology' | 'label' | null;

interface UiStore {
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  bottomPanelCollapsed: boolean;
  rightPanelType: RightPanelType;
  symbologyLayerId: string | null;
  labelLayerId: string | null;
  mapHintText: string;
  isSelectMode: boolean;
  measureMode: 'distance' | 'area' | 'coordinate' | null;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  setBottomPanelCollapsed: (collapsed: boolean) => void;
  setRightPanelType: (type: RightPanelType) => void;
  setSymbologyLayerId: (layerId: string | null) => void;
  setLabelLayerId: (layerId: string | null) => void;
  setMapHintText: (text: string) => void;
  setIsSelectMode: (isSelectMode: boolean) => void;
  setMeasureMode: (mode: 'distance' | 'area' | 'coordinate' | null) => void;
  openSymbologyPanel: (layerId: string) => void;
  closeSymbologyPanel: () => void;
  openLabelPanel: (layerId: string) => void;
  closeLabelPanel: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleBottomPanel: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  bottomPanelCollapsed: true,
  rightPanelType: 'feature',
  symbologyLayerId: null,
  labelLayerId: null,
  mapHintText: '平移模式：拖拽地图浏览',
  isSelectMode: false,
  measureMode: null,

  setLeftPanelCollapsed: (collapsed) => set({ leftPanelCollapsed: collapsed }),
  setRightPanelCollapsed: (collapsed) => set({ rightPanelCollapsed: collapsed }),
  setBottomPanelCollapsed: (collapsed) => set({ bottomPanelCollapsed: collapsed }),
  setRightPanelType: (type) => set({ rightPanelType: type }),
  setSymbologyLayerId: (layerId) => set({ symbologyLayerId: layerId }),
  setLabelLayerId: (layerId) => set({ labelLayerId: layerId }),
  setMapHintText: (text) => set({ mapHintText: text }),
  setIsSelectMode: (isSelectMode) => set({ isSelectMode }),
  setMeasureMode: (mode) => set({ measureMode: mode }),

  openSymbologyPanel: (layerId) => set({ 
    symbologyLayerId: layerId, 
    rightPanelType: 'symbology',
    rightPanelCollapsed: false 
  }),

  closeSymbologyPanel: () => set({ 
    symbologyLayerId: null,
    rightPanelType: 'feature'
  }),

  openLabelPanel: (layerId) => set({
    labelLayerId: layerId,
    rightPanelType: 'label',
    rightPanelCollapsed: false
  }),

  closeLabelPanel: () => set({
    labelLayerId: null,
    rightPanelType: 'feature'
  }),

  toggleLeftPanel: () => set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
  toggleRightPanel: () => set((state) => ({ rightPanelCollapsed: !state.rightPanelCollapsed })),
  toggleBottomPanel: () => set((state) => ({ bottomPanelCollapsed: !state.bottomPanelCollapsed })),
}));

// 辅助函数：根据状态生成提示文本
export const getMapHintText = (isSelectMode: boolean, measureMode: 'distance' | 'area' | 'coordinate' | null): string => {
  if (measureMode === 'distance') {
    return '距离测量：点击添加测量点，双击完成当前测量';
  } else if (measureMode === 'area') {
    return '面积测量：点击添加测量点（至少3个），双击完成当前测量';
  } else if (measureMode === 'coordinate') {
    return '坐标测量：点击地图获取坐标';
  } else if (isSelectMode) {
    return '选择模式：点击要素进行选择';
  } else {
    return '平移模式：拖拽地图浏览';
  }
};
