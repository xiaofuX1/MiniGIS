import { useEffect, useState } from 'react';
import { loadProjectState, loadMapTabsSession, filterExistingLayers, MapTabsSessionState } from '../services/storageService';
import { useMapStore } from '../stores/mapStore';
import { useLayerStore } from '../stores/layerStore';
import { useMapTabsStore, MapTab } from '../stores/mapTabsStore';
import { useProjectStore } from '../stores/projectStore';
import { useCRSStore } from '../stores/crsStore';
import { useUiStore } from '../stores/uiStore';
import { message } from 'antd';
import { invoke } from '@tauri-apps/api/core';

/**
 * 恢复多地图标签页会话
 */
const restoreMapTabsSession = async (sessionState: MapTabsSessionState) => {
  console.log('[会话恢复] 恢复多地图标签页会话');
  
  const mapTabsStore = useMapTabsStore.getState();
  const uiStore = useUiStore.getState();
  
  // 恢复UI布局状态
  if (sessionState.uiState) {
    console.log('[会话恢复] 恢复UI布局状态');
    uiStore.setLeftPanelCollapsed(sessionState.uiState.leftPanelCollapsed);
    uiStore.setRightPanelCollapsed(sessionState.uiState.rightPanelCollapsed);
    uiStore.setBottomPanelCollapsed(sessionState.uiState.bottomPanelCollapsed);
    uiStore.setRightPanelType(sessionState.uiState.rightPanelType);
    uiStore.setLeftPanelState(sessionState.uiState.leftPanelState);
    uiStore.setRightPanelState(sessionState.uiState.rightPanelState);
    uiStore.setBottomPanelState(sessionState.uiState.bottomPanelState);
  }
  
  // 清空现有标签页，准备恢复
  mapTabsStore.tabs.forEach(tab => {
    if (tab.id !== mapTabsStore.tabs[0].id) {
      mapTabsStore.removeTab(tab.id);
    }
  });
  
  let totalRestoredLayers = 0;
  const restoredTabs: MapTab[] = [];
  
  // 恢复每个标签页
  for (const tabData of sessionState.tabs) {
    console.log(`[会话恢复] 恢复标签页: ${tabData.name}`);
    
    // 过滤不存在的图层
    const layersWithSource = tabData.layers.map(layer => ({
      ...layer,
      source: {
        type: layer.sourceType,
        path: layer.path,
        url: layer.url,
        layerIndex: layer.layerIndex
      },
      children: layer.children?.map(child => ({
        ...child,
        source: {
          type: child.sourceType,
          path: child.path,
          url: child.url,
          layerIndex: child.layerIndex
        }
      }))
    }));
    
    const existingLayers = await filterExistingLayers(layersWithSource);
    
    // 恢复图层数据
    const restoredLayers = [];
    
    for (const layerData of existingLayers) {
      try {
        // 底图直接添加
        if (layerData.type === 'basemap') {
          const basemapLayer = {
            id: layerData.id,
            name: layerData.name,
            type: 'basemap' as const,
            source: {
              type: (layerData.sourceType || 'xyz') as any,
              url: layerData.url,
            },
            visible: layerData.visible !== false, // 默认可见
            opacity: layerData.opacity || 1,
            skipAutoZoom: true,  // 恢复时不自动缩放
          };
          restoredLayers.push(basemapLayer);
          console.log(`[会话恢复] 恢复底图: ${basemapLayer.name}, visible=${basemapLayer.visible}`);
          continue;
        }
        
        // 分组图层
        if (layerData.isGroup && layerData.children) {
          const groupLayer: any = {
            ...layerData,
            children: [],
          };
          
          for (const childData of layerData.children) {
            try {
              // 优化：不立即加载 geojson，标记为延迟加载
              groupLayer.children.push({
                ...childData,
                geojson: null, // 先不加载数据
                deferredLoad: true, // 标记为延迟加载
              });
            } catch (error) {
              console.warn(`恢复子图层失败: ${childData.name}`, error);
            }
          }
          
          if (groupLayer.children.length > 0) {
            restoredLayers.push({
              ...groupLayer,
              skipAutoZoom: true,  // 恢复时不自动缩放
            });
            totalRestoredLayers += groupLayer.children.length;
          }
        } else if (layerData.path) {
          // 普通图层 - 优化：不立即加载 geojson
          try {
            const vectorLayer = {
              ...layerData,
              source: {
                type: layerData.sourceType || 'geo_json',
                path: layerData.path,
              },
              geojson: null, // 先不加载数据
              deferredLoad: true, // 标记为延迟加载
              visible: layerData.visible !== false,
              opacity: layerData.opacity || 1,
              skipAutoZoom: true,  // 恢复时不自动缩放
            };
            restoredLayers.push(vectorLayer);
            totalRestoredLayers++;
            console.log(`[会话恢复] 恢复矢量图层(延迟加载): ${vectorLayer.name}, visible=${vectorLayer.visible}`);
          } catch (error) {
            console.warn(`恢复图层失败: ${layerData.name}`, error);
          }
        }
      } catch (error) {
        console.warn('恢复图层失败:', layerData.name, error);
      }
    }
    
    // 创建恢复的标签页
    const restoredTab: MapTab = {
      id: tabData.id,
      name: tabData.name,
      center: tabData.center,
      zoom: tabData.zoom,
      layers: restoredLayers,
      selectedLayer: tabData.selectedLayerId ? 
        restoredLayers.find(l => l.id === tabData.selectedLayerId) || null : 
        null,
      attributeTableLayerIds: tabData.attributeTableLayerIds,
      activeAttributeTableLayerId: tabData.activeAttributeTableLayerId,
      createdAt: tabData.createdAt,
    };
    
    restoredTabs.push(restoredTab);
  }
  
  // 更新 store - 使用Zustand的setState触发状态更新
  if (restoredTabs.length > 0) {
    console.log(`[会话恢复] 准备更新store，标签页数: ${restoredTabs.length}`);
    restoredTabs.forEach((tab, idx) => {
      console.log(`[会话恢复] 标签页${idx+1}: ${tab.name}, 图层数: ${tab.layers.length}`);
      tab.layers.forEach(layer => {
        console.log(`  - ${layer.name} (${layer.type}): visible=${layer.visible}, hasGeojson=${!!layer.geojson}, hasSource=${!!layer.source}`);
      });
    });
    
    // 使用setState触发React重新渲染
    useMapTabsStore.setState({
      tabs: restoredTabs,
      activeTabId: sessionState.activeTabId || restoredTabs[0].id,
    });
    
    console.log(`[会话恢复] Store已更新，等待地图渲染...`);
    
    // 延迟一下确保状态已传播，然后触发地图刷新
    setTimeout(() => {
      console.log(`[会话恢复] 触发地图刷新事件`);
      window.dispatchEvent(new Event('refreshMap'));
    }, 100);
    
    console.log(`[会话恢复] 恢复完成: ${restoredTabs.length} 个标签页, ${totalRestoredLayers} 个图层`);
    message.success(`已恢复 ${restoredTabs.length} 个地图和 ${totalRestoredLayers} 个图层`);
  }
};

/**
 * 启动时恢复上次会话的Hook
 * @returns {boolean} 会话恢复是否完成
 */
export const useRestoreSession = () => {
  const [isRestored, setIsRestored] = useState(false);
  
  useEffect(() => {
    const restoreSession = async () => {
      try {
        console.log('[会话恢复] 开始恢复上次会话');
        
        // 加载多地图标签页会话
        const mapTabsSession = loadMapTabsSession();
        
        if (mapTabsSession && mapTabsSession.tabs.length > 0) {
          await restoreMapTabsSession(mapTabsSession);
        } else {
          console.log('[会话恢复] 没有保存的会话');
        }
      } catch (error) {
        console.error('恢复会话失败:', error);
      } finally {
        // 无论成功或失败，都标记恢复完成
        setIsRestored(true);
        console.log('[会话恢复] 恢复流程完成');
      }
    };
    
    // 快速执行，减少启动延迟
    const timer = setTimeout(restoreSession, 100);
    
    return () => clearTimeout(timer);
  }, []); // 只在组件挂载时执行一次
  
  return isRestored;
};
