import React, { useState, useRef, useCallback } from 'react';
import { Tabs } from 'antd';
import { DockPosition, useWindowStore, WindowState, WindowId } from '../../stores/windowStore';
import './DockContainer.css';

interface DockContainerProps {
  position: DockPosition;
  children: (windowState: WindowState) => React.ReactNode;
}

const DockContainer: React.FC<DockContainerProps> = ({ position, children }) => {
  const { getWindowsInDock, getActiveWindowInDock, setActiveWindowInDock, hideWindow, setWindowDockPosition, dockSizes, setDockSize } = useWindowStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const windows = getWindowsInDock(position);
  const activeWindow = getActiveWindowInDock(position);
  
  if (windows.length === 0) {
    return null;
  }

  // 处理调整大小
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startPos = position === 'bottom' ? e.clientY : e.clientX;
    const startSize = position === 'left' ? dockSizes.left : position === 'right' ? dockSizes.right : dockSizes.bottom;
    
    // 在调整过程中直接操作容器尺寸，避免频繁更新状态
    const container = containerRef.current;
    if (!container) return;
    
    // 禁用过渡动画以获得更流畅的调整体验
    container.style.transition = 'none';
    
    // 节流更新，减少重渲染
    let animationFrameId: number | null = null;
    
    const handleResizeMove = (moveEvent: MouseEvent) => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      animationFrameId = requestAnimationFrame(() => {
        const currentPos = position === 'bottom' ? moveEvent.clientY : moveEvent.clientX;
        let delta = currentPos - startPos;
        
        // 根据位置调整增量方向
        if (position === 'right') {
          delta = -delta;
        } else if (position === 'bottom') {
          delta = -delta;
        }
        
        let newSize = startSize + delta;
        
        // 设置最小和最大尺寸
        const minSize = 200;
        const maxSize = position === 'bottom' ? window.innerHeight * 0.8 : window.innerWidth * 0.5;
        newSize = Math.max(minSize, Math.min(maxSize, newSize));
        
        // 直接更新容器尺寸
        if (position === 'left' || position === 'right') {
          container.style.width = `${newSize}px`;
        }
        
        // 同时更新状态（用于其他组件）
        setDockSize(position as 'left' | 'right' | 'bottom', newSize);
      });
    };
    
    const handleResizeEnd = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      // 恢复过渡动画
      if (container) {
        container.style.transition = '';
      }
      
      setIsResizing(false);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // 触发地图和面板重新计算尺寸
      setTimeout(() => {
        window.dispatchEvent(new Event('panelResize'));
      }, 50);
    };
    
    // 设置全局光标样式
    document.body.style.cursor = position === 'bottom' ? 'ns-resize' : 'ew-resize';
    document.body.style.userSelect = 'none';
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [position, dockSizes, setDockSize]);
  
  // 处理拖拽开始
  const handleMouseDown = (e: React.MouseEvent, windowId: WindowId) => {
    if ((e.target as HTMLElement).closest('.dock-window-close')) {
      return; // 点击关闭按钮时不拖拽
    }
    
    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;
    
    // 监听鼠标移动和释放
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // 移动超过10px时转为浮动
      if (distance > 10 && !hasMoved) {
        hasMoved = true;
        
        // 计算浮动窗口的初始位置 - 让鼠标在窗口标题栏中心
        const offsetX = 150; // 窗口宽度的一半
        const offsetY = 20;  // 标题栏中心
        
        const floatingX = moveEvent.clientX - offsetX;
        const floatingY = moveEvent.clientY - offsetY;
        
        // 先设置浮动位置，再改变停靠状态
        useWindowStore.getState().updateWindow(windowId, {
          floatingPosition: { x: floatingX, y: floatingY }
        });
        
        // 延迟一帧后改变停靠状态，确保位置先设置
        requestAnimationFrame(() => {
          setWindowDockPosition(windowId, 'floating');
        });
        
        cleanup();
      }
    };
    
    const handleMouseUp = () => {
      cleanup();
    };
    
    const cleanup = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    setIsDragging(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // 获取当前位置的尺寸
  const getSize = () => {
    if (position === 'left') return dockSizes.left;
    if (position === 'right') return dockSizes.right;
    return undefined; // bottom 不需要设置宽度
  };

  const containerStyle: React.CSSProperties = {};
  const size = getSize();
  if (size !== undefined) {
    containerStyle.width = `${size}px`;
  }

  // 单个窗口时不显示标签
  if (windows.length === 1) {
    return (
      <div 
        ref={containerRef} 
        className={`dock-container dock-container-${position} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
        style={containerStyle}
      >
        <div 
          className="dock-window-header"
          onMouseDown={(e) => handleMouseDown(e, windows[0].id)}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <span className="dock-window-title">{windows[0].title}</span>
          <button
            className="dock-window-close"
            onClick={() => hideWindow(windows[0].id)}
          >
            ✕
          </button>
        </div>
        <div className="dock-window-content">
          {children(windows[0])}
        </div>
        <div 
          className={`dock-resize-handle dock-resize-handle-${position}`}
          onMouseDown={handleResizeStart}
        />
      </div>
    );
  }
  
  // 多个窗口显示为标签页
  const items = windows.map(window => ({
    key: window.id,
    label: (
      <div 
        onMouseDown={(e) => handleMouseDown(e, window.id)}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
      >
        {window.title}
      </div>
    ),
    children: (
      <div className="dock-window-content">
        {children(window)}
      </div>
    ),
    closable: true,
  }));
  
  return (
    <div 
      ref={containerRef} 
      className={`dock-container dock-container-${position} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
      style={containerStyle}
    >
      <Tabs
        activeKey={activeWindow?.id}
        onChange={(key) => setActiveWindowInDock(position, key as any)}
        onEdit={(targetKey, action) => {
          if (action === 'remove') {
            hideWindow(targetKey as any);
          }
        }}
        type="editable-card"
        hideAdd
        items={items}
        className="dock-tabs"
        tabPosition={position === 'bottom' ? 'top' : 'top'}
      />
      <div 
        className={`dock-resize-handle dock-resize-handle-${position}`}
        onMouseDown={handleResizeStart}
      />
    </div>
  );
};

export default DockContainer;
