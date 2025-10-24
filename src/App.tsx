import React, { useEffect, useState } from 'react';
import { Layout, App as AntdApp } from 'antd';
import TitleBar from './components/TitleBar/TitleBar';
import RibbonMenu from './components/Ribbon/RibbonMenu';
import MapTabsContainer from './components/Map/MapTabsContainer';
import WindowManager from './components/Panels/WindowManager';
import StatusBar from './components/StatusBar/StatusBar';
import { useProjectStore } from './stores/projectStore';
import { useLayerStore } from './stores/layerStore';
import { useMapTabsStore } from './stores/mapTabsStore';
import { useWindowStore } from './stores/windowStore';
import { useUiStore } from './stores/uiStore';
import { useRestoreSession } from './hooks/useRestoreSession';
import { saveMapTabsSession } from './services/storageService';
import { invoke } from '@tauri-apps/api/core';
import './App.css';

const { Content } = Layout;

function App() {
  const [appReady, setAppReady] = useState(false);
  const { currentProject } = useProjectStore();
  const mapTabsStore = useMapTabsStore();
  const uiStore = useUiStore();
  
  // 恢复上次会话，获取恢复状态
  const isSessionRestored = useRestoreSession();

  // 自动保存多地图标签页状态 - 只在会话恢复完成后启用
  useEffect(() => {
    // 如果会话还未恢复完成，不启用自动保存
    if (!isSessionRestored) {
      console.log('[自动保存] 等待会话恢复完成...');
      return;
    }
    
    const timer = setTimeout(() => {
      try {
        console.log('[自动保存] 开始保存多地图标签页状态');
        // 序列化标签页状态
        const sessionState = {
          tabs: mapTabsStore.tabs.map(tab => ({
            id: tab.id,
            name: tab.name,
            center: tab.center,
            zoom: tab.zoom,
            layers: tab.layers.map(layer => ({
              id: layer.id,
              name: layer.name,
              type: layer.type,
              sourceType: layer.source?.type || 'geo_json',
              path: layer.source?.path,
              url: layer.source?.url,
              layerIndex: layer.source?.layerIndex,
              visible: layer.visible,
              opacity: layer.opacity,
              projection: layer.projection,
              style: layer.style,
              labelConfig: layer.labelConfig,
              extent: layer.extent,
              groupId: layer.groupId,
              isGroup: layer.isGroup,
              expanded: layer.expanded,
              children: layer.children?.map(child => ({
                id: child.id,
                name: child.name,
                type: child.type,
                sourceType: child.source?.type || 'geo_json',
                path: child.source?.path,
                url: child.source?.url,
                layerIndex: child.source?.layerIndex,
                visible: child.visible,
                opacity: child.opacity,
                projection: child.projection,
                style: child.style,
                labelConfig: child.labelConfig,
                extent: child.extent,
                groupId: child.groupId,
              })),
            })),
            selectedLayerId: tab.selectedLayer?.id,
            attributeTableLayerIds: tab.attributeTableLayerIds,
            activeAttributeTableLayerId: tab.activeAttributeTableLayerId,
            createdAt: tab.createdAt,
          })),
          activeTabId: mapTabsStore.activeTabId,
          lastSaved: new Date().toISOString(),
          uiState: {
            leftPanelCollapsed: uiStore.leftPanelCollapsed,
            rightPanelCollapsed: uiStore.rightPanelCollapsed,
            bottomPanelCollapsed: uiStore.bottomPanelCollapsed,
            rightPanelType: uiStore.rightPanelType,
            leftPanelState: uiStore.leftPanelState,
            rightPanelState: uiStore.rightPanelState,
            bottomPanelState: uiStore.bottomPanelState,
          },
        };
        
        saveMapTabsSession(sessionState);
      } catch (error) {
        console.error('[自动保存] 保存多地图标签页状态失败:', error);
      }
    }, 1000); // 防抖延迟1秒
    
    return () => clearTimeout(timer);
  }, [
    isSessionRestored,
    mapTabsStore.tabs,
    mapTabsStore.activeTabId,
    uiStore.leftPanelCollapsed,
    uiStore.rightPanelCollapsed,
    uiStore.bottomPanelCollapsed,
    uiStore.rightPanelType,
    uiStore.leftPanelState,
    uiStore.rightPanelState,
    uiStore.bottomPanelState,
  ]);

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
      
      // 等待会话恢复和首次渲染完成
      if (!isSessionRestored) {
        console.log('[初始化] 等待会话恢复...');
        return;
      }
      
      // 使用 requestAnimationFrame 确保DOM渲染完成
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });
      
      console.log('[初始化] 完成，显示主界面');
      
      // 添加淡入动画类
      const root = document.getElementById('root');
      if (root) {
        root.classList.add('app-ready');
      }
      
      // 切换 body 背景色
      document.body.classList.add('app-loaded');
      
      // 等待淡入动画完成
      await new Promise(resolve => setTimeout(resolve, 200));
      
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
  }, [isSessionRestored]);

  return (
    <AntdApp>
      <Layout className="h-screen overflow-hidden">
        <TitleBar />
        <RibbonMenu />
        
        <Content className="flex-1 overflow-hidden" style={{ position: 'relative' }}>
          {/* 地图标签页容器 */}
          <MapTabsContainer />
          
          {/* 窗口管理器 */}
          <WindowManager />
        </Content>
        
        <StatusBar />
      </Layout>
    </AntdApp>
  );
}

export default App;
