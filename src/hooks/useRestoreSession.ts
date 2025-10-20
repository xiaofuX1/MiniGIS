import { useEffect } from 'react';
import { loadProjectState, filterExistingLayers } from '../services/storageService';
import { useMapStore } from '../stores/mapStore';
import { useLayerStore } from '../stores/layerStore';
import { useProjectStore } from '../stores/projectStore';
import { useCRSStore } from '../stores/crsStore';
import { useUiStore } from '../stores/uiStore';
import { message } from 'antd';

/**
 * 启动时恢复上次会话的Hook
 */
export const useRestoreSession = () => {
  useEffect(() => {
    const restoreSession = async () => {
      try {
        console.log('[会话恢复] 开始恢复上次会话');
        
        // 加载上次的项目状态
        const savedState = loadProjectState();
        
        if (!savedState) {
          console.log('[会话恢复] 没有保存的会话');
          return;
        }
        
        console.log('[会话恢复] 找到保存的会话:', savedState);
        
        // 恢复地图状态
        console.log('[会话恢复] 恢复地图状态');
        const mapStore = useMapStore.getState();
        if (savedState.mapState) {
          mapStore.setCenter(savedState.mapState.center);
          mapStore.setZoom(savedState.mapState.zoom);
          console.log(`[会话恢复] 地图: center=${JSON.stringify(savedState.mapState.center)}, zoom=${savedState.mapState.zoom}`);
        }
        
        // 恢复坐标系
        if (savedState.crs) {
          console.log('[会话恢复] 恢复坐标系:', savedState.crs.code, savedState.crs.name);
          const crsStore = useCRSStore.getState();
          const crsInfo = crsStore.getCRSByCode(savedState.crs.code);
          if (crsInfo) {
            crsStore.setCRS(crsInfo);
            console.log('[会话恢复] 坐标系恢复成功');
          } else {
            // 如果找不到预定义的坐标系，使用保存的完整信息
            crsStore.setCRS(savedState.crs as any);
            console.log('[会话恢复] 使用自定义坐标系');
          }
        } else {
          console.log('[会话恢复] 没有保存的坐标系');
        }
        
        // 恢复UI布局状态
        if (savedState.uiState) {
          console.log('[会话恢复] 恢复UI布局状态');
          const uiStore = useUiStore.getState();
          uiStore.setLeftPanelCollapsed(savedState.uiState.leftPanelCollapsed);
          uiStore.setRightPanelCollapsed(savedState.uiState.rightPanelCollapsed);
          uiStore.setBottomPanelCollapsed(savedState.uiState.bottomPanelCollapsed);
          uiStore.setRightPanelType(savedState.uiState.rightPanelType);
          uiStore.setLeftPanelState(savedState.uiState.leftPanelState);
          uiStore.setRightPanelState(savedState.uiState.rightPanelState);
          uiStore.setBottomPanelState(savedState.uiState.bottomPanelState);
          console.log('[会话恢复] UI布局恢复成功');
        } else {
          console.log('[会话恢复] 没有保存的UI状态');
        }
        
        // 恢复底图
        console.log('[会话恢复] 恢复底图');
        const layerStore = useLayerStore.getState();
        if (savedState.basemaps && savedState.basemaps.length > 0) {
          console.log(`[会话恢复] 恢复 ${savedState.basemaps.length} 个保存的底图`);
          // 添加保存的底图
          for (const basemap of savedState.basemaps) {
            const basemapLayer = {
              id: basemap.id,
              name: basemap.name,
              type: 'basemap' as const,
              source: {
                type: 'xyz' as const,
                url: basemap.url,
              },
              visible: basemap.visible,
              opacity: basemap.opacity,
            };
            await layerStore.addLayer(basemapLayer);
            console.log(`[会话恢复] 底图: ${basemap.name} (visible=${basemap.visible})`);
          }
        } else {
          console.log('[会话恢复] 没有保存的底图，使用默认底图');
          // 如果没有保存的底图，添加默认底图
          const { defaultBasemap, defaultBasemapAnnotation } = await import('../stores/layerStore');
          await layerStore.addLayer(defaultBasemapAnnotation);
          await layerStore.addLayer(defaultBasemap);
        }
        
        // 过滤不存在的图层文件，传递完整的 layer 对象
        const layersWithSource = savedState.layers.map(layer => {
          const baseLayer = {
            ...layer,
            source: {
              type: layer.sourceType,
              path: layer.path,
              url: layer.url,
              layerIndex: layer.layerIndex
            }
          };
          
          // 如果是分组图层，处理children
          if (layer.isGroup && layer.children) {
            return {
              ...baseLayer,
              children: layer.children.map(child => ({
                ...child,
                source: {
                  type: child.sourceType,
                  path: child.path,
                  url: child.url,
                  layerIndex: child.layerIndex
                }
              }))
            };
          }
          
          return baseLayer;
        });
        const existingLayers = await filterExistingLayers(layersWithSource);
        
        // 恢复数据图层
        console.log(`[会话恢复] 恢复 ${existingLayers.length} 个数据图层`);
        let restoredCount = 0;
        
        for (const layerData of existingLayers) {
          try {
            // 跳过底图，底图不需要恢复
            if (layerData.type === 'basemap') {
              continue;
            }
            
            // 重新加载图层数据
            const { invoke } = await import('@tauri-apps/api/core');
            
            if (layerData.path) {
              // 如果是分组图层，恢复整个分组
              if (layerData.isGroup && layerData.children) {
                console.log(`[会话恢复] 恢复分组图层: ${layerData.name}, 包含 ${layerData.children.length} 个子图层`);
                
                // 创建分组图层
                const groupLayer: any = {
                  id: layerData.id,
                  name: layerData.name,
                  type: layerData.type,
                  source: {
                    type: layerData.sourceType || 'geo_json',
                    path: layerData.path,
                  },
                  visible: layerData.visible !== false,
                  opacity: layerData.opacity || 1,
                  projection: layerData.projection || 'EPSG:4326',
                  isGroup: true,
                  expanded: layerData.expanded !== false,
                  children: [],
                };
                
                // 恢复所有子图层
                for (const childData of layerData.children) {
                  try {
                    const geojson = await invoke('gdal_get_layer_geojson', {
                      path: childData.path,
                      layerIndex: childData.layerIndex,
                    });
                    
                    const childLayer = {
                      id: childData.id,
                      name: childData.name,
                      type: childData.type,
                      source: {
                        type: childData.sourceType || 'geo_json',
                        path: childData.path,
                        layerIndex: childData.layerIndex,
                      },
                      visible: childData.visible !== false,
                      opacity: childData.opacity || 1,
                      projection: childData.projection || 'EPSG:4326',
                      style: childData.style,
                      labelConfig: childData.labelConfig,
                      extent: childData.extent,
                      geojson,
                      groupId: childData.groupId,
                    };
                    
                    groupLayer.children.push(childLayer);
                  } catch (error) {
                    console.warn(`恢复子图层失败: ${childData.name}`, error);
                  }
                }
                
                await layerStore.addLayer(groupLayer);
                restoredCount++;
              } else {
                // 普通图层（非分组）
                // 使用 GDAL 重新打开矢量文件
                const info = await invoke('gdal_open_vector', { path: layerData.path });
                const geojson = await invoke('gdal_get_geojson', { path: layerData.path });
                
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
                  projection: layerData.projection || (info as any).projection || 'EPSG:4326',
                  style: layerData.style,  // 完整保留style，包括 symbolizer
                  labelConfig: layerData.labelConfig,  // 恢复标注配置
                  extent: layerData.extent || ((info as any).extent ? {
                    minX: (info as any).extent.min_x,
                    minY: (info as any).extent.min_y,
                    maxX: (info as any).extent.max_x,
                    maxY: (info as any).extent.max_y,
                  } : undefined),
                  geojson,
                };
                
                await layerStore.addLayer(layer);
                restoredCount++;
              }
            }
          } catch (error) {
            console.warn('恢复图层失败:', layerData.name, error);
          }
        }
        
        // 恢复属性表状态
        if (savedState.attributeTableState) {
          // 延迟恢复属性表，确保图层已经加载完成
          setTimeout(() => {
            const { openLayerIds, activeLayerId } = savedState.attributeTableState!;
            openLayerIds.forEach(layerId => {
              if (layerStore.layers.find(l => l.id === layerId)) {
                layerStore.addAttributeTableLayer(layerId);
              }
            });
            if (activeLayerId) {
              layerStore.setActiveAttributeTableLayer(activeLayerId);
            }
          }, 500);
        }
        
        // 显示成功消息
        console.log(`[会话恢复] 恢复完成: ${restoredCount} 个图层`);
        if (restoredCount > 0) {
          message.success(`已恢复 ${restoredCount} 个图层和界面布局`);
        } else if (savedState.basemaps || savedState.uiState) {
          message.success('已恢复界面布局');
        }
        
      } catch (error) {
        console.error('恢复会话失败:', error);
      }
    };
    
    // 延迟执行，等待组件挂载完成
    const timer = setTimeout(restoreSession, 1000);
    
    return () => clearTimeout(timer);
  }, []); // 只在组件挂载时执行一次
};
