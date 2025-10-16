import React, { useEffect, useState } from 'react';
import { Layout } from 'antd';
import TitleBar from './components/TitleBar/TitleBar';
import RibbonMenu from './components/Ribbon/RibbonMenu';
import MapView from './components/Map/MapView';
import WindowManager from './components/Panels/WindowManager';
import StatusBar from './components/StatusBar/StatusBar';
import { useProjectStore } from './stores/projectStore';
import { useLayerStore } from './stores/layerStore';
import { useWindowStore } from './stores/windowStore';
import { useCRSProjection } from './hooks/useCRSProjection';
import { useRestoreSession } from './hooks/useRestoreSession';
import { invoke } from '@tauri-apps/api/core';
import './App.css';

const { Content } = Layout;

function App() {
  const [appReady, setAppReady] = useState(false);
  const { currentProject } = useProjectStore();
  
  // 启用坐标系投影功能
  useCRSProjection();
  
  // 恢复上次会话
  useRestoreSession();

  // 禁用右键菜单（保留开发者工具用于调试）
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // 应用初始化完成后关闭启动窗口
  useEffect(() => {
    const initApp = async () => {
      console.log('[初始化] 开始');
      
      // 等待界面渲染完成
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('[初始化] 完成，显示主界面');
      
      // 通知 Tauri 关闭启动窗口
      try {
        await invoke('close_splashscreen');
        setAppReady(true);
      } catch (error) {
        console.error('关闭启动窗口失败:', error);
        setAppReady(true);
      }
    };
    
    initApp();
  }, []);

  return (
    <Layout className="h-screen overflow-hidden">
      <TitleBar />
      <RibbonMenu />
      
      <Content className="flex-1 overflow-hidden" style={{ position: 'relative' }}>
        {/* 地图视图 */}
        <MapView />
        
        {/* 窗口管理器 */}
        <WindowManager />
      </Content>
      
      <StatusBar />
    </Layout>
  );
}

export default App;
