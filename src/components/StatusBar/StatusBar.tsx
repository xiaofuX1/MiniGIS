import React, { useState, useEffect } from 'react';
import { Button, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useMapTabsStore } from '../../stores/mapTabsStore';
import { useUiStore } from '../../stores/uiStore';
import { useCRSStore } from '../../stores/crsStore';
import './StatusBar.css';

interface StatusBarProps {
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
  onToggleBottomPanel?: () => void;
}

const StatusBar: React.FC<StatusBarProps> = () => {
  const mapTabsStore = useMapTabsStore();
  const currentTab = mapTabsStore.getCurrentTab();
  const center = currentTab?.center || [39.9093, 116.3974];
  const zoom = currentTab?.zoom || 10;
  
  const { mapHintText } = useUiStore();
  const { currentCRS } = useCRSStore();
  const [refreshing, setRefreshing] = useState(false);
  const [mouseCoords, setMouseCoords] = useState<[number, number]>(center);

  // 监听地图鼠标移动事件
  useEffect(() => {
    const handleMouseMove = (event: CustomEvent) => {
      const coords = event.detail as [number, number];
      setMouseCoords(coords);
    };

    window.addEventListener('mapMouseMove', handleMouseMove as EventListener);
    return () => {
      window.removeEventListener('mapMouseMove', handleMouseMove as EventListener);
    };
  }, []);

  const handleRefreshMap = () => {
    // 设置刷新状态
    setRefreshing(true);
    
    // 触发地图刷新事件
    window.dispatchEvent(new Event('refreshMap'));
    
    // 显示提示并恢复按钮状态
    message.success('地图已刷新');
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  };

  // 计算比例尺（多种DPI标准自动匹配）
  const calculateScale = () => {
    const latitude = center[0]; // 纬度
    
    // 地球赤道周长（米）- CGCS2000椭球体参数
    const EARTH_CIRCUMFERENCE = 40075016.686;
    
    // 在zoom级别下，每个像素代表的赤道米数
    const metersPerPixelAtEquator = EARTH_CIRCUMFERENCE / (256 * Math.pow(2, zoom));
    
    // 根据纬度调整（墨卡托投影）
    const metersPerPixelAtLatitude = metersPerPixelAtEquator * Math.cos(latitude * Math.PI / 180);
    
    // 尝试不同的DPI标准，自动选择最合理的
    // 96 DPI - Windows标准
    // 90.71 DPI - OGC标准（WMS规范）
    // 72 DPI - 传统印刷标准
    
    // 使用OGC WMS标准（与大多数GIS软件兼容，包括ArcGIS）
    // 0.28mm/pixel 是 OGC 标准的像素大小
    const METERS_PER_PIXEL_STANDARD = 0.00028; // OGC标准：0.28mm
    
    // 比例尺分母 = 地图分辨率 / 标准像素尺寸
    const scaleDenominator = metersPerPixelAtLatitude / METERS_PER_PIXEL_STANDARD;
    
    // 格式化显示
    return `1:${Math.round(scaleDenominator).toLocaleString('zh-CN')}`;
  };

  // 格式化坐标显示 - 固定显示经纬度（CGCS2000地理坐标系）
  const formatCoordinates = () => {
    return {
      x: mouseCoords[1].toFixed(6),
      y: mouseCoords[0].toFixed(6),
      xLabel: '经度',
      yLabel: '纬度',
      unit: '°'
    };
  };

  const coords = formatCoordinates();

  return (
    <div className="status-bar">
      <div className="status-bar-center">
        <span className="status-text status-hint">
          {mapHintText}
        </span>
        <span className="status-separator">|</span>
        <span className="status-text">
          坐标系: {currentCRS.code}
        </span>
        <span className="status-separator">|</span>
        <span className="status-text">
          {coords.xLabel}: {coords.x}{coords.unit} {coords.yLabel}: {coords.y}{coords.unit}
        </span>
        <span className="status-separator">|</span>
        <span className="status-text">
          比例尺: {calculateScale()}
        </span>
      </div>

      <div className="status-bar-right">
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined spin={refreshing} />}
          onClick={handleRefreshMap}
          loading={refreshing}
          title="刷新地图 - 重新渲染所有图层"
        />
      </div>
    </div>
  );
};

export default StatusBar;
