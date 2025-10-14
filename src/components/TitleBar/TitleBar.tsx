import React, { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import './TitleBar.css';

const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    
    // 监听窗口最大化状态变化
    const setupListener = async () => {
      const unlisten = await appWindow.onResized(async () => {
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      });

      // 初始化状态
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);

      return unlisten;
    };

    let unlistenFn: (() => void) | undefined;
    setupListener().then(fn => {
      unlistenFn = fn;
    });

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  const handleMinimize = async () => {
    try {
      console.log('点击最小化');
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
      console.log('最小化成功');
    } catch (error) {
      console.error('最小化失败:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      console.log('点击最大化');
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
      console.log('最大化成功');
    } catch (error) {
      console.error('最大化失败:', error);
    }
  };

  const handleClose = async () => {
    try {
      console.log('点击关闭');
      const appWindow = getCurrentWindow();
      await appWindow.close();
      console.log('关闭成功');
    } catch (error) {
      console.error('关闭失败:', error);
    }
  };

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        {/* Logo 图标 - 与启动页一致 */}
        <svg 
          className="titlebar-icon" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" 
          />
        </svg>
        <span className="titlebar-title">MiniGIS</span>
      </div>

      <div className="titlebar-right">
        <button 
          className="titlebar-button titlebar-button-minimize" 
          onClick={handleMinimize}
          onMouseDown={(e) => e.stopPropagation()}
          title="最小化"
          type="button"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="0" y="5" width="12" height="2" fill="currentColor" />
          </svg>
        </button>

        <button 
          className="titlebar-button titlebar-button-maximize" 
          onClick={handleMaximize}
          onMouseDown={(e) => e.stopPropagation()}
          title={isMaximized ? "还原" : "最大化"}
          type="button"
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="2" y="0" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1" />
              <rect x="0" y="2" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="0" y="0" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          )}
        </button>

        <button 
          className="titlebar-button titlebar-button-close" 
          onClick={handleClose}
          onMouseDown={(e) => e.stopPropagation()}
          title="关闭"
          type="button"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path 
              d="M1 1L11 11M11 1L1 11" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
