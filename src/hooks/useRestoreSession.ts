import { useEffect } from 'react';
import { loadProjectState, filterExistingLayers } from '../services/storageService';
import { useMapStore } from '../stores/mapStore';
import { useLayerStore } from '../stores/layerStore';
import { useProjectStore } from '../stores/projectStore';
import { message } from 'antd';

/**
 * 启动时恢复上次会话的Hook
 */
export const useRestoreSession = () => {
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // 加载上次的项目状态
        const savedState = loadProjectState();
        
        if (!savedState) return;
        
        // 恢复地图状态
        const mapStore = useMapStore.getState();
        if (savedState.mapState) {
          mapStore.setCenter(savedState.mapState.center);
          mapStore.setZoom(savedState.mapState.zoom);
        }
        
        // 过滤不存在的图层文件，传递完整的 layer 对象
        const layersWithSource = savedState.layers.map(layer => ({
          ...layer,
          source: {
            type: layer.sourceType,
            path: layer.path,
            url: layer.url
          }
        }));
        const existingLayers = await filterExistingLayers(layersWithSource);
        
        if (existingLayers.length === 0) return;
        
        // 恢复图层
        const layerStore = useLayerStore.getState();
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
          } catch (error) {
            console.warn('恢复图层失败:', layerData.name, error);
          }
        }
        
        // 显示成功消息
        if (restoredCount > 0) {
          message.success(`已恢复 ${restoredCount} 个图层`);
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
