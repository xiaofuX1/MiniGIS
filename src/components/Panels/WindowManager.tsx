import React from 'react';
import { useWindowStore, WindowState } from '../../stores/windowStore';
import DraggablePanel from './DraggablePanel';
import DockContainer from './DockContainer';
import LayerPanel from './LayerPanel';
import AttributePanel from './AttributePanel';
import FeatureInfoPanel from './FeatureInfoPanel';
import SymbologyPanel from './SymbologyPanel';
import LabelPanel from './LabelPanel';
import ExportPanel from './ExportPanel';
import { useMapTabsStore } from '../../stores/mapTabsStore';

const WindowManager: React.FC = () => {
  const { 
    windows, 
    getWindowsInDock,
    setWindowDockPosition,
    setWindowFloatingPosition,
    bringToFront,
    dockSizes
  } = useWindowStore();
  
  const mapTabsStore = useMapTabsStore();
  const currentTab = mapTabsStore.getCurrentTab();
  const layers = currentTab?.layers || [];
  
  // 递归查找图层（包括分组中的子图层）
  const findLayerById = (layers: any[], id: string): any => {
    for (const layer of layers) {
      if (layer.id === id) return layer;
      if (layer.children) {
        const found = findLayerById(layer.children, id);
        if (found) return found;
      }
    }
    return null;
  };
  
  // 渲染窗口内容
  const renderWindowContent = (windowState: WindowState) => {
    switch (windowState.id) {
      case 'layer-panel':
        return <LayerPanel />;
        
      case 'attribute-table':
        return <AttributePanel />;
        
      case 'feature-info':
        return <FeatureInfoPanel />;
        
      case 'symbology':
        const symbologyLayer = windowState.metadata?.layerId 
          ? findLayerById(layers, windowState.metadata.layerId)
          : null;
        return symbologyLayer ? (
          <SymbologyPanel layer={symbologyLayer} />
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
            请在图层面板中选择图层并打开符号设置
          </div>
        );
        
      case 'label':
        const labelLayer = windowState.metadata?.layerId
          ? findLayerById(layers, windowState.metadata.layerId)
          : null;
        return labelLayer ? (
          <LabelPanel layer={labelLayer} />
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
            请在图层面板中选择图层并打开标注设置
          </div>
        );
        
      case 'export-tool':
        return <ExportPanel />;
        
      default:
        return null;
    }
  };
  
  // 获取所有可见的浮动窗口
  const floatingWindows = Array.from(windows.values()).filter(
    w => w.visible && w.dockPosition === 'floating'
  ).sort((a, b) => a.zIndex - b.zIndex); // 按zIndex排序
  
  // 获取各停靠位置的窗口
  const leftWindows = getWindowsInDock('left');
  const rightWindows = getWindowsInDock('right');
  const bottomWindows = getWindowsInDock('bottom');
  
  return (
    <>
      {/* 停靠窗口容器 */}
      {leftWindows.length > 0 && (
        <DockContainer position="left">
          {(windowState) => renderWindowContent(windowState)}
        </DockContainer>
      )}
      
      {rightWindows.length > 0 && (
        <DockContainer position="right">
          {(windowState) => renderWindowContent(windowState)}
        </DockContainer>
      )}
      
      {bottomWindows.length > 0 && (
        <div 
          className="dock-container-bottom-wrapper"
          style={{
            position: 'absolute',
            bottom: 0,
            left: leftWindows.length > 0 ? dockSizes.left : 0,
            right: rightWindows.length > 0 ? dockSizes.right : 0,
            height: dockSizes.bottom,
          }}
        >
          <DockContainer position="bottom">
            {(windowState) => renderWindowContent(windowState)}
          </DockContainer>
        </div>
      )}
      
      {/* 浮动窗口 */}
      {floatingWindows.map((windowState) => (
        <DraggablePanel
          key={windowState.id}
          id={windowState.id}
          title={windowState.title}
          dockPosition="floating"
          defaultWidth={windowState.width}
          defaultHeight={windowState.height}
          floatingPosition={windowState.floatingPosition}
          onDockChange={(position) => setWindowDockPosition(windowState.id, position)}
          onPositionChange={(x, y) => setWindowFloatingPosition(windowState.id, x, y)}
          onClose={() => useWindowStore.getState().hideWindow(windowState.id)}
          onMouseDown={() => bringToFront(windowState.id)}
        >
          {renderWindowContent(windowState)}
        </DraggablePanel>
      ))}
    </>
  );
};

export default WindowManager;
