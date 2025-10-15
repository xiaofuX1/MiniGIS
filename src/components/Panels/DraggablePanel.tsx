import React, { useState, useRef, useEffect, CSSProperties } from 'react';
import './DraggablePanel.css';
import { useWindowStore } from '../../stores/windowStore';

export type PanelDockPosition = 'left' | 'right' | 'bottom' | 'floating';

export interface DraggablePanelProps {
  id: string;
  title: string;
  children: React.ReactNode;
  dockPosition: PanelDockPosition;
  onDockChange?: (position: PanelDockPosition) => void;
  onClose?: () => void;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  floatingPosition?: { x: number; y: number };
  onPositionChange?: (x: number, y: number) => void;
  onMouseDown?: () => void;
}

const SNAP_THRESHOLD = 50; // 吸附阈值（像素）

const DraggablePanel: React.FC<DraggablePanelProps> = ({
  id,
  title,
  children,
  dockPosition,
  onDockChange,
  onClose,
  defaultWidth = 300,
  defaultHeight = 400,
  minWidth = 200,
  minHeight = 200,
  floatingPosition,
  onPositionChange,
  onMouseDown,
}) => {
  const { dockSizes } = useWindowStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState(floatingPosition || { x: 100, y: 100 });
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [snapIndicator, setSnapIndicator] = useState<PanelDockPosition | null>(null);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<string | null>(null);
  const positionRef = useRef(position);
  const sizeRef = useRef(size);
  const onDockChangeRef = useRef(onDockChange);
  const onPositionChangeRef = useRef(onPositionChange);
  
  // 同步ref
  useEffect(() => {
    positionRef.current = position;
    sizeRef.current = size;
    onDockChangeRef.current = onDockChange;
    onPositionChangeRef.current = onPositionChange;
  }, [position, size, onDockChange, onPositionChange]);

  // 开始拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    // 只有在标题栏点击时才能拖拽
    if ((e.target as HTMLElement).closest('.draggable-panel-header')) {
      setIsDragging(true);
      
      if (dockPosition === 'floating') {
        // 浮动状态：记录鼠标相对于面板左上角的偏移
        setDragStart({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
      } else {
        // 停靠状态：记录鼠标点击位置
        setDragStart({
          x: e.clientX,
          y: e.clientY,
        });
      }
    }
  };

  // 拖拽中
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 如果是停靠状态，当拖拽超过一定距离后切换到浮动状态
      if (dockPosition !== 'floating') {
        const distance = Math.sqrt(Math.pow(e.clientX - dragStart.x, 2) + Math.pow(e.clientY - dragStart.y, 2));
        if (distance > 10) {
          // 切换到浮动状态，让面板跟随鼠标
          const panelElement = panelRef.current;
          const offsetX = panelElement ? Math.min(150, panelElement.offsetWidth / 2) : 150;
          const offsetY = 20;
          
          onDockChangeRef.current?.('floating');
          setPosition({ x: e.clientX - offsetX, y: e.clientY - offsetY });
          
          // 更新拖拽起始点为鼠标相对于面板的偏移
          setDragStart({ x: offsetX, y: offsetY });
        }
      } else {
        // 浮动状态下更新位置
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        setPosition({ x: newX, y: newY });

        // 检测是否靠近边缘
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const currentSize = sizeRef.current;
        
        let newSnapIndicator: PanelDockPosition | null = null;
        
        if (newX < SNAP_THRESHOLD) {
          newSnapIndicator = 'left';
        } else if (newX + currentSize.width > windowWidth - SNAP_THRESHOLD) {
          newSnapIndicator = 'right';
        } else if (newY + currentSize.height > windowHeight - SNAP_THRESHOLD) {
          newSnapIndicator = 'bottom';
        }
        
        setSnapIndicator(newSnapIndicator);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      
      // 如果有吸附指示器，执行吸附
      if (snapIndicator && dockPosition === 'floating') {
        onDockChangeRef.current?.(snapIndicator);
      } else if (dockPosition === 'floating' && onPositionChangeRef.current) {
        // 拖拽结束时保存浮动位置
        const finalPos = positionRef.current;
        onPositionChangeRef.current(finalPos.x, finalPos.y);
      }
      setSnapIndicator(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, dockPosition, snapIndicator]);

  // 调整大小
  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeHandleRef.current = handle;
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setSize(prevSize => {
        let newWidth = prevSize.width;
        let newHeight = prevSize.height;

        if (resizeHandleRef.current?.includes('right')) {
          newWidth = Math.max(minWidth, prevSize.width + deltaX);
        }
        if (resizeHandleRef.current?.includes('left')) {
          newWidth = Math.max(minWidth, prevSize.width - deltaX);
          if (dockPosition === 'floating') {
            setPosition(prev => ({ ...prev, x: prev.x + deltaX }));
          }
        }
        if (resizeHandleRef.current?.includes('bottom')) {
          newHeight = Math.max(minHeight, prevSize.height + deltaY);
        }
        if (resizeHandleRef.current?.includes('top')) {
          newHeight = Math.max(minHeight, prevSize.height - deltaY);
          if (dockPosition === 'floating') {
            setPosition(prev => ({ ...prev, y: prev.y + deltaY }));
          }
        }

        return { width: newWidth, height: newHeight };
      });

      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeHandleRef.current = null;
      
      // 调整大小结束时，如果是浮动状态且调整了左边或上边（位置会改变），保存位置
      if (dockPosition === 'floating' && onPositionChangeRef.current) {
        const finalPos = positionRef.current;
        onPositionChangeRef.current(finalPos.x, finalPos.y);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, dragStart, dockPosition, minWidth, minHeight]);

  // 根据停靠位置计算样式
  const getPanelStyle = (): CSSProperties => {
    const baseStyle: CSSProperties = {
      userSelect: isDragging || isResizing ? 'none' : 'auto',
    };

    switch (dockPosition) {
      case 'left':
        return {
          ...baseStyle,
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: size.width,
          height: '100%',
        };
      case 'right':
        return {
          ...baseStyle,
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: size.width,
          height: '100%',
        };
      case 'bottom':
        return {
          ...baseStyle,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: size.height,
          width: '100%',
        };
      case 'floating':
        return {
          ...baseStyle,
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          zIndex: 1000,
        };
    }
  };

  // 渲染调整大小的手柄
  const renderResizeHandles = () => {
    if (dockPosition === 'floating') {
      return (
        <>
          <div className="resize-handle resize-handle-top" onMouseDown={(e) => handleResizeMouseDown(e, 'top')} />
          <div className="resize-handle resize-handle-right" onMouseDown={(e) => handleResizeMouseDown(e, 'right')} />
          <div className="resize-handle resize-handle-bottom" onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')} />
          <div className="resize-handle resize-handle-left" onMouseDown={(e) => handleResizeMouseDown(e, 'left')} />
          <div className="resize-handle resize-handle-top-right" onMouseDown={(e) => handleResizeMouseDown(e, 'top-right')} />
          <div className="resize-handle resize-handle-bottom-right" onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-right')} />
          <div className="resize-handle resize-handle-bottom-left" onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-left')} />
          <div className="resize-handle resize-handle-top-left" onMouseDown={(e) => handleResizeMouseDown(e, 'top-left')} />
        </>
      );
    }

    // 停靠状态下的调整大小手柄
    switch (dockPosition) {
      case 'left':
        return <div className="resize-handle resize-handle-right" onMouseDown={(e) => handleResizeMouseDown(e, 'right')} />;
      case 'right':
        return <div className="resize-handle resize-handle-left" onMouseDown={(e) => handleResizeMouseDown(e, 'left')} />;
      case 'bottom':
        return <div className="resize-handle resize-handle-top" onMouseDown={(e) => handleResizeMouseDown(e, 'top')} />;
    }
  };

  // 获取吸附指示器的样式
  const getSnapIndicatorStyle = (): CSSProperties => {
    if (!snapIndicator) return {};
    
    const baseStyle: CSSProperties = {
      position: 'fixed',
      backgroundColor: 'rgba(24, 144, 255, 0.3)',
      border: '2px solid #1890ff',
      pointerEvents: 'none',
      zIndex: 9999,
    };
    
    switch (snapIndicator) {
      case 'left':
        return { ...baseStyle, left: 0, top: 0, bottom: 0, width: dockSizes.left };
      case 'right':
        return { ...baseStyle, right: 0, top: 0, bottom: 0, width: dockSizes.right };
      case 'bottom':
        return { ...baseStyle, left: 0, right: 0, bottom: 0, height: dockSizes.bottom };
      default:
        return baseStyle;
    }
  };

  return (
    <>
      {/* 吸附指示器 */}
      {snapIndicator && (
        <div style={getSnapIndicatorStyle()} />
      )}

      {/* 面板 */}
      <div
        ref={panelRef}
        className={`draggable-panel draggable-panel-${dockPosition} ${isDragging ? 'dragging' : ''}`}
        style={getPanelStyle()}
        onMouseDown={() => onMouseDown?.()}
      >
        {renderResizeHandles()}
        
        <div 
          className="draggable-panel-header"
          onMouseDown={handleMouseDown}
        >
          <span className="draggable-panel-title">{title}</span>
          {onClose && (
            <button
              className="draggable-panel-close"
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="draggable-panel-content">
          {children}
        </div>
      </div>
    </>
  );
};

export default DraggablePanel;
