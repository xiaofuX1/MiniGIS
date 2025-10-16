import { useEffect } from 'react';
import { useCRSStore } from '../stores/crsStore';
import { useLayerStore } from '../stores/layerStore';
import { gdalService } from '../services/gdalService';
import { message } from 'antd';

/**
 * 坐标系投影Hook
 * 
 * 注意：现已使用OpenLayers自动投影引擎，不再需要手动重投影图层数据
 * 当地图View的projection变化时，OpenLayers会自动将所有图层投影到新的地图坐标系
 * 这个功能已移至MapView.tsx中的useEffect监听
 */
export const useCRSProjection = () => {
  const { currentCRS } = useCRSStore();
  const { layers, updateLayer } = useLayerStore();

  useEffect(() => {
    const handleCRSChange = async (event: CustomEvent) => {
      const newCRS = event.detail;
      console.log(`[坐标系变更] 检测到坐标系变化: ${newCRS.code}`);
      console.log('[坐标系变更] 使用OpenLayers动态投影，无需手动重投影数据');
      
      // 不再需要手动重投影，OpenLayers会自动处理
      // 只需要触发地图刷新
      window.dispatchEvent(new Event('refreshMap'));
    };

    window.addEventListener('crsChanged', handleCRSChange as unknown as EventListener);

    return () => {
      window.removeEventListener('crsChanged', handleCRSChange as unknown as EventListener);
    };
  }, [layers, updateLayer]);
};
