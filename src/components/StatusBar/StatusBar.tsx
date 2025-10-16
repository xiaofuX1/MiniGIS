import React, { useState, useEffect } from 'react';
import { Button, message, Popover, Typography } from 'antd';
import { ReloadOutlined, GlobalOutlined } from '@ant-design/icons';
import { useMapStore } from '../../stores/mapStore';
import { useUiStore } from '../../stores/uiStore';
import { useCRSStore } from '../../stores/crsStore';
import proj4 from 'proj4';
import './StatusBar.css';

const { Text, Paragraph } = Typography;

interface StatusBarProps {
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
  onToggleBottomPanel?: () => void;
}

const StatusBar: React.FC<StatusBarProps> = () => {
  const { center, zoom } = useMapStore();
  const { mapHintText } = useUiStore();
  const { currentCRS } = useCRSStore();
  const [refreshing, setRefreshing] = useState(false);
  const [mouseCoords, setMouseCoords] = useState<[number, number]>(center);
  const [projectedCoords, setProjectedCoords] = useState<[number, number] | null>(null);

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

  // 当坐标系或鼠标坐标变化时，转换坐标
  useEffect(() => {
    if (currentCRS.type === 'projected') {
      try {
        // 使用proj4进行坐标转换
        // 定义WGS84（源坐标系）
        const wgs84 = 'EPSG:4326';
        
        // 使用当前坐标系的WKT定义目标坐标系
        proj4.defs(currentCRS.code, currentCRS.wkt);
        
        // 转换坐标：[经度, 纬度] -> [X, Y]
        const result = proj4(wgs84, currentCRS.code, [mouseCoords[1], mouseCoords[0]]);
        
        setProjectedCoords([result[0], result[1]]);
      } catch (error) {
        console.error('[坐标转换] proj4转换失败:', error);
        setProjectedCoords(null);
      }
    } else {
      setProjectedCoords(null);
    }
  }, [mouseCoords, currentCRS]);

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
    
    // 地球赤道周长（米）- WGS84标准
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

  // 格式化坐标显示
  const formatCoordinates = () => {
    const isGeographic = currentCRS.type === 'geographic';
    
    if (isGeographic) {
      // 地理坐标系：显示经纬度（度）
      return {
        x: mouseCoords[1].toFixed(6),
        y: mouseCoords[0].toFixed(6),
        xLabel: '经度',
        yLabel: '纬度',
        unit: '°'
      };
    } else {
      // 投影坐标系：显示米坐标
      if (projectedCoords) {
        return {
          x: projectedCoords[0].toFixed(2),
          y: projectedCoords[1].toFixed(2),
          xLabel: 'X',
          yLabel: 'Y',
          unit: 'm'
        };
      } else {
        // 转换中或转换失败，显示经纬度
        return {
          x: mouseCoords[1].toFixed(6),
          y: mouseCoords[0].toFixed(6),
          xLabel: '经度',
          yLabel: '纬度',
          unit: '°'
        };
      }
    }
  };

  const coords = formatCoordinates();

  // WKT信息弹窗内容
  const wktContent = (
    <div style={{ maxWidth: 600 }}>
      <Paragraph>
        <Text strong>坐标系: </Text>
        <Text>{currentCRS.name}</Text>
      </Paragraph>
      <Paragraph>
        <Text strong>代码: </Text>
        <Text code>{currentCRS.code}</Text>
      </Paragraph>
      <Paragraph>
        <Text strong>类型: </Text>
        <Text>{currentCRS.type === 'geographic' ? '地理坐标系' : '投影坐标系'}</Text>
      </Paragraph>
      <Paragraph>
        <Text strong>单位: </Text>
        <Text>{currentCRS.type === 'geographic' ? '度 (°)' : '米 (m)'}</Text>
      </Paragraph>
      <Paragraph>
        <Text strong>WKT定义:</Text>
      </Paragraph>
      <Paragraph 
        code 
        copyable 
        style={{ 
          fontSize: 11, 
          fontFamily: 'monospace',
          background: '#f5f5f5',
          padding: 12,
          borderRadius: 4,
          maxHeight: 300,
          overflowY: 'auto',
          wordBreak: 'break-all'
        }}
      >
        {currentCRS.wkt}
      </Paragraph>
    </div>
  );

  return (
    <div className="status-bar">
      <div className="status-bar-center">
        <span className="status-text status-hint">
          {mapHintText}
        </span>
        <span className="status-separator">|</span>
        <Popover 
          content={wktContent} 
          title={
            <span>
              <GlobalOutlined style={{ marginRight: 8 }} />
              坐标系统信息
            </span>
          }
          trigger="click"
          placement="topLeft"
        >
          <span 
            className="status-text" 
            style={{ 
              cursor: 'pointer',
              padding: '0 4px',
              borderRadius: 2,
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            坐标系: {currentCRS.code}
          </span>
        </Popover>
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
