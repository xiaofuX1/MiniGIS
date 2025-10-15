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
import { invoke } from '@tauri-apps/api/core';
import './App.css';

const { Content } = Layout;

function App() {
  const [appReady, setAppReady] = useState(false);
  const { currentProject } = useProjectStore();

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
      
      // 先执行会话恢复
      try {
        const { loadProjectState, filterExistingLayers } = await import('./services/storageService');
        const { useMapStore } = await import('./stores/mapStore');
        const { useLayerStore } = await import('./stores/layerStore');
        
        const savedState = loadProjectState();
        
        if (savedState) {
          console.log('[初始化] 恢复地图状态');
          // 恢复地图状态
          const mapStore = useMapStore.getState();
          if (savedState.mapState) {
            mapStore.setCenter(savedState.mapState.center);
            mapStore.setZoom(savedState.mapState.zoom);
          }
          
          console.log('[初始化] 恢复图层数据');
          // 恢复图层
          const layersWithSource = savedState.layers.map((layer: any) => ({
            ...layer,
            source: {
              type: layer.sourceType,
              path: layer.path,
              url: layer.url
            }
          }));
          const existingLayers = await filterExistingLayers(layersWithSource);
          
          if (existingLayers.length > 0) {
            const layerStore = useLayerStore.getState();
            const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
            
            console.log(`[初始化] 加载 ${existingLayers.length} 个图层`);
            for (const layerData of existingLayers) {
              try {
                if (layerData.type === 'basemap') continue;
                
                if (layerData.path) {
                  const info = await tauriInvoke('gdal_open_vector', { path: layerData.path });
                  const geojson = await tauriInvoke('gdal_get_geojson', { path: layerData.path });
                  
                  const layer = {
                    id: layerData.id || `layer-${Date.now()}`,
                    name: layerData.name,
                    type: layerData.type as 'vector' | 'raster' | 'basemap',
                    source: {
                      type: (layerData.sourceType || 'shapefile') as 'shapefile' | 'geojson' | 'wms' | 'xyz',
                      path: layerData.path,
                      url: layerData.url,
                    },
                    visible: layerData.visible !== false,
                    opacity: layerData.opacity || 1,
                    style: layerData.style,
                    labelConfig: layerData.labelConfig,
                    extent: layerData.extent || ((info as any).extent ? {
                      minX: (info as any).extent.min_x,
                      minY: (info as any).extent.min_y,
                      maxX: (info as any).extent.max_x,
                      maxY: (info as any).extent.max_y,
                    } : undefined),
                    geojson,
                  };
                  
                  await layerStore.addLayer(layer);
                  console.log(`[初始化] 已加载图层: ${layerData.name}`);
                }
              } catch (error) {
                console.warn('恢复图层失败:', layerData.name, error);
              }
            }
          }
        }
      } catch (error) {
        console.error('恢复会话失败:', error);
      }
      
      console.log('[初始化] 等待界面渲染');
      // 等待界面渲染完成
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      
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
