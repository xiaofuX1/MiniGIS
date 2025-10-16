import { create } from 'zustand';

export type WindowId = 'layer-panel' | 'attribute-table' | 'feature-info' | 'symbology' | 'label' | 'crs-settings';
export type DockPosition = 'left' | 'right' | 'bottom' | 'floating';

export interface WindowState {
  id: WindowId;
  title: string;
  visible: boolean;
  dockPosition: DockPosition;
  width: number;
  height: number;
  floatingPosition?: { x: number; y: number };
  zIndex: number; // 用于浮动窗口的层级管理
  metadata?: any; // 额外的窗口数据，如layerId等
}

interface WindowStore {
  windows: Map<WindowId, WindowState>;
  activeWindowByDock: Map<DockPosition, WindowId>; // 每个停靠位置的激活窗口
  dockSizes: { left: number; right: number; bottom: number }; // 停靠面板的尺寸
  maxZIndex: number;
  
  // 窗口操作
  showWindow: (id: WindowId, metadata?: any) => void;
  hideWindow: (id: WindowId) => void;
  toggleWindow: (id: WindowId) => void;
  updateWindow: (id: WindowId, updates: Partial<WindowState>) => void;
  setWindowDockPosition: (id: WindowId, position: DockPosition) => void;
  setWindowFloatingPosition: (id: WindowId, x: number, y: number) => void;
  bringToFront: (id: WindowId) => void; // 将浮动窗口置于最前
  
  // 停靠位置管理
  setActiveWindowInDock: (position: DockPosition, windowId: WindowId) => void;
  getWindowsInDock: (position: DockPosition) => WindowState[];
  getActiveWindowInDock: (position: DockPosition) => WindowState | undefined;
  setDockSize: (position: 'left' | 'right' | 'bottom', size: number) => void;
}

const defaultWindows: WindowState[] = [
  {
    id: 'layer-panel',
    title: '图层管理',
    visible: true,
    dockPosition: 'left',
    width: 300,
    height: 400,
    zIndex: 1,
  },
  {
    id: 'attribute-table',
    title: '属性表',
    visible: false,
    dockPosition: 'bottom',
    width: 600,
    height: 300,
    zIndex: 1,
  },
  {
    id: 'feature-info',
    title: '要素信息',
    visible: true,
    dockPosition: 'right',
    width: 300,
    height: 400,
    zIndex: 1,
  },
  {
    id: 'symbology',
    title: '符号设置',
    visible: false,
    dockPosition: 'right',
    width: 300,
    height: 400,
    zIndex: 1,
  },
  {
    id: 'label',
    title: '标注',
    visible: false,
    dockPosition: 'right',
    width: 300,
    height: 400,
    zIndex: 1,
  },
  {
    id: 'crs-settings',
    title: '坐标系统设置',
    visible: false,
    dockPosition: 'right',
    width: 400,
    height: 600,
    zIndex: 1,
  },
];

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: new Map(defaultWindows.map(w => [w.id, w])),
  activeWindowByDock: new Map([
    ['left', 'layer-panel'],
    ['right', 'feature-info'],
  ]),
  dockSizes: { left: 300, right: 300, bottom: 300 },
  maxZIndex: 10,

  showWindow: (id, metadata) => set((state) => {
    const windows = new Map(state.windows);
    const window = windows.get(id);
    if (window) {
      windows.set(id, { 
        ...window, 
        visible: true, 
        metadata: metadata ?? window.metadata 
      });
      
      // 如果是停靠状态，设置为该停靠位置的激活窗口
      const activeWindowByDock = new Map(state.activeWindowByDock);
      if (window.dockPosition !== 'floating') {
        activeWindowByDock.set(window.dockPosition, id);
      }
      
      return { windows, activeWindowByDock };
    }
    return state;
  }),

  hideWindow: (id) => set((state) => {
    const windows = new Map(state.windows);
    const window = windows.get(id);
    if (window) {
      windows.set(id, { ...window, visible: false });
      
      // 如果隐藏的是激活窗口，切换到该位置的其他窗口
      const activeWindowByDock = new Map(state.activeWindowByDock);
      const dockPosition = window.dockPosition;
      
      if (dockPosition !== 'floating' && activeWindowByDock.get(dockPosition) === id) {
        // 找到该位置的其他可见窗口
        const otherWindows = Array.from(windows.values()).filter(
          w => w.id !== id && w.visible && w.dockPosition === dockPosition
        );
        
        if (otherWindows.length > 0) {
          activeWindowByDock.set(dockPosition, otherWindows[0].id);
        } else {
          activeWindowByDock.delete(dockPosition);
        }
      }
      
      return { windows, activeWindowByDock };
    }
    return state;
  }),

  toggleWindow: (id) => {
    const window = get().windows.get(id);
    if (window?.visible) {
      get().hideWindow(id);
    } else {
      get().showWindow(id);
    }
  },

  updateWindow: (id, updates) => set((state) => {
    const windows = new Map(state.windows);
    const window = windows.get(id);
    if (window) {
      windows.set(id, { ...window, ...updates });
    }
    return { windows };
  }),

  setWindowDockPosition: (id, position) => set((state) => {
    const windows = new Map(state.windows);
    const window = windows.get(id);
    if (window) {
      windows.set(id, { ...window, dockPosition: position });
      
      // 如果移动到停靠位置，设置为该位置的激活窗口
      const activeWindowByDock = new Map(state.activeWindowByDock);
      if (position !== 'floating' && window.visible) {
        activeWindowByDock.set(position, id);
      }
      
      return { windows, activeWindowByDock };
    }
    return state;
  }),

  setWindowFloatingPosition: (id, x, y) => set((state) => {
    const windows = new Map(state.windows);
    const window = windows.get(id);
    if (window) {
      windows.set(id, { ...window, floatingPosition: { x, y } });
    }
    return { windows };
  }),

  bringToFront: (id) => set((state) => {
    const windows = new Map(state.windows);
    const window = windows.get(id);
    if (window && window.dockPosition === 'floating') {
      const newZIndex = state.maxZIndex + 1;
      windows.set(id, { ...window, zIndex: newZIndex });
      return { windows, maxZIndex: newZIndex };
    }
    return state;
  }),

  setActiveWindowInDock: (position, windowId) => set((state) => {
    const activeWindowByDock = new Map(state.activeWindowByDock);
    activeWindowByDock.set(position, windowId);
    return { activeWindowByDock };
  }),

  getWindowsInDock: (position) => {
    const windows = get().windows;
    return Array.from(windows.values()).filter(
      w => w.visible && w.dockPosition === position
    );
  },

  getActiveWindowInDock: (position) => {
    const activeId = get().activeWindowByDock.get(position);
    return activeId ? get().windows.get(activeId) : undefined;
  },

  setDockSize: (position, size) => set((state) => ({
    dockSizes: { ...state.dockSizes, [position]: size }
  })),
}));
