import { create } from 'zustand';
import { Layer } from './layerStore';

// 单个地图标签页的状态
export interface MapTab {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  layers: Layer[];
  selectedLayer: Layer | null;
  attributeTableLayerIds: string[];
  activeAttributeTableLayerId: string | null;
  createdAt: number;
}

interface MapTabsStore {
  tabs: MapTab[];
  activeTabId: string | null;
  
  // 标签页操作
  addTab: (name?: string) => string;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabName: (tabId: string, name: string) => void;
  reorderTabs: (tabs: MapTab[]) => void;
  
  // 当前激活标签页的状态操作
  getCurrentTab: () => MapTab | null;
  updateCurrentTabCenter: (center: [number, number]) => void;
  updateCurrentTabZoom: (zoom: number) => void;
  updateCurrentTabLayers: (layers: Layer[]) => void;
  setCurrentTabSelectedLayer: (layer: Layer | null) => void;
  
  // 图层操作（针对当前激活的标签页）
  addLayerToCurrentTab: (layer: Layer) => void;
  removeLayerFromCurrentTab: (layerId: string) => void;
  updateLayerInCurrentTab: (layerId: string, updates: Partial<Layer>) => void;
  toggleLayerVisibilityInCurrentTab: (layerId: string) => void;
  reorderLayersInCurrentTab: (layers: Layer[]) => void;
  clearLayersInCurrentTab: () => void;
  
  // 属性表操作
  addAttributeTableLayerToCurrentTab: (layerId: string) => void;
  removeAttributeTableLayerFromCurrentTab: (layerId: string) => void;
  setActiveAttributeTableLayerInCurrentTab: (layerId: string | null) => void;
}

let tabCounter = 1;

const createNewTab = (name?: string): MapTab => {
  const tabName = name || `地图 ${tabCounter++}`;
  return {
    id: `map-tab-${Date.now()}-${Math.random()}`,
    name: tabName,
    center: [39.9093, 116.3974], // 北京坐标
    zoom: 10,
    layers: [],
    selectedLayer: null,
    attributeTableLayerIds: [],
    activeAttributeTableLayerId: null,
    createdAt: Date.now(),
  };
};

const initialTab = createNewTab('地图 1');

export const useMapTabsStore = create<MapTabsStore>((set, get) => ({
  tabs: [initialTab],
  activeTabId: initialTab.id,

  addTab: (name?: string) => {
    const newTab = createNewTab(name);
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
    return newTab.id;
  },

  removeTab: (tabId: string) => {
    set((state) => {
      const newTabs = state.tabs.filter((tab) => tab.id !== tabId);
      // 如果删除的是当前激活的标签页，激活最后一个标签页
      let newActiveTabId = state.activeTabId;
      if (state.activeTabId === tabId) {
        newActiveTabId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      }
      return {
        tabs: newTabs,
        activeTabId: newActiveTabId,
      };
    });
  },

  setActiveTab: (tabId: string) => {
    set({ activeTabId: tabId });
  },

  updateTabName: (tabId: string, name: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, name } : tab
      ),
    }));
  },

  reorderTabs: (tabs: MapTab[]) => {
    set({ tabs });
  },

  getCurrentTab: () => {
    const { tabs, activeTabId } = get();
    if (!activeTabId) {
      // 如果没有激活的标签页，激活第一个
      if (tabs.length > 0) {
        set({ activeTabId: tabs[0].id });
        return tabs[0];
      }
      return null;
    }
    return tabs.find((tab) => tab.id === activeTabId) || null;
  },

  updateCurrentTabCenter: (center: [number, number]) => {
    const { activeTabId } = get();
    if (!activeTabId) return;
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, center } : tab
      ),
    }));
  },

  updateCurrentTabZoom: (zoom: number) => {
    const { activeTabId } = get();
    if (!activeTabId) return;
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, zoom } : tab
      ),
    }));
  },

  updateCurrentTabLayers: (layers: Layer[]) => {
    const { activeTabId } = get();
    if (!activeTabId) return;
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, layers } : tab
      ),
    }));
  },

  setCurrentTabSelectedLayer: (layer: Layer | null) => {
    const { activeTabId } = get();
    if (!activeTabId) return;
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, selectedLayer: layer } : tab
      ),
    }));
  },

  addLayerToCurrentTab: (layer: Layer) => {
    const { activeTabId } = get();
    if (!activeTabId) return;
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        
        // 将底图和其他图层分开
        const basemaps = tab.layers.filter(l => l.type === 'basemap');
        const otherLayers = tab.layers.filter(l => l.type !== 'basemap');
        
        // 新图层根据类型决定位置
        if (layer.type === 'basemap') {
          return {
            ...tab,
            layers: [...otherLayers, ...basemaps, layer],
            selectedLayer: layer,
          };
        } else {
          return {
            ...tab,
            layers: [layer, ...otherLayers, ...basemaps],
            selectedLayer: layer,
          };
        }
      }),
    }));
  },

  removeLayerFromCurrentTab: (layerId: string) => {
    const { activeTabId } = get();
    if (!activeTabId) return;
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        
        // 递归删除图层（包括从分组中删除子图层）
        const removeLayers = (layers: Layer[]): Layer[] => {
          return layers.filter(l => {
            if (l.id === layerId) {
              return false;
            }
            if (l.children) {
              l.children = removeLayers(l.children);
            }
            return true;
          }).map(l => {
            // 如果分组为空，删除该分组
            if (l.isGroup && l.children && l.children.length === 0) {
              return null;
            }
            return l;
          }).filter(l => l !== null) as Layer[];
        };
        
        return {
          ...tab,
          layers: removeLayers(tab.layers),
          selectedLayer: tab.selectedLayer?.id === layerId ? null : tab.selectedLayer,
        };
      }),
    }));
  },

  updateLayerInCurrentTab: (layerId: string, updates: Partial<Layer>) => {
    const { activeTabId } = get();
    if (!activeTabId) return;
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        
        // 递归更新图层（包括分组中的子图层）
        const updateLayers = (layers: Layer[]): Layer[] => {
          return layers.map(l => {
            if (l.id === layerId) {
              return { ...l, ...updates };
            }
            if (l.children) {
              return { ...l, children: updateLayers(l.children) };
            }
            return l;
          });
        };
        
        return {
          ...tab,
          layers: updateLayers(tab.layers),
          selectedLayer:
            tab.selectedLayer?.id === layerId
              ? { ...tab.selectedLayer, ...updates }
              : tab.selectedLayer,
        };
      }),
    }));
  },

  toggleLayerVisibilityInCurrentTab: (layerId: string) => {
    const { activeTabId } = get();
    if (!activeTabId) return;
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        
        // 递归切换图层可见性（包括分组中的子图层）
        const toggleLayers = (layers: Layer[]): Layer[] => {
          return layers.map(l => {
            if (l.id === layerId) {
              const newVisible = !l.visible;
              // 如果是分组，同时切换所有子图层的可见性
              if (l.isGroup && l.children) {
                return {
                  ...l,
                  visible: newVisible,
                  children: l.children.map(child => ({ ...child, visible: newVisible }))
                };
              }
              return { ...l, visible: newVisible };
            }
            if (l.children) {
              return { ...l, children: toggleLayers(l.children) };
            }
            return l;
          });
        };
        
        return { ...tab, layers: toggleLayers(tab.layers) };
      }),
    }));
  },

  reorderLayersInCurrentTab: (layers: Layer[]) => {
    const { activeTabId } = get();
    if (!activeTabId) return;
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, layers } : tab
      ),
    }));
  },

  clearLayersInCurrentTab: () => {
    const { activeTabId } = get();
    if (!activeTabId) return;
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, layers: [], selectedLayer: null } : tab
      ),
    }));
  },

  addAttributeTableLayerToCurrentTab: (layerId: string) => {
    const { activeTabId } = get();
    if (!activeTabId) return;
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        
        if (!tab.attributeTableLayerIds.includes(layerId)) {
          return {
            ...tab,
            attributeTableLayerIds: [...tab.attributeTableLayerIds, layerId],
            activeAttributeTableLayerId: layerId,
          };
        } else {
          return {
            ...tab,
            activeAttributeTableLayerId: layerId,
          };
        }
      }),
    }));
  },

  removeAttributeTableLayerFromCurrentTab: (layerId: string) => {
    const { activeTabId } = get();
    if (!activeTabId) return;
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        
        const newLayerIds = tab.attributeTableLayerIds.filter(id => id !== layerId);
        const newActiveId = tab.activeAttributeTableLayerId === layerId 
          ? (newLayerIds.length > 0 ? newLayerIds[newLayerIds.length - 1] : null)
          : tab.activeAttributeTableLayerId;
        
        return {
          ...tab,
          attributeTableLayerIds: newLayerIds,
          activeAttributeTableLayerId: newActiveId,
        };
      }),
    }));
  },

  setActiveAttributeTableLayerInCurrentTab: (layerId: string | null) => {
    const { activeTabId } = get();
    if (!activeTabId) return;
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, activeAttributeTableLayerId: layerId } : tab
      ),
    }));
  },
}));
