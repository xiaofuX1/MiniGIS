import React, { useState, useEffect } from 'react';
import { Slider } from 'antd';
import { useLayerStore } from '../../stores/layerStore';
import './HistoryImageControl.css';

const GEOVIS_TOKEN = '488fb6d94c9f290d58a855e648fe70d7f02db5ef9e496a07165ecfe3d2ccc4da';
const AVAILABLE_YEARS = [2021, 2022];

const HistoryImageControl: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(2021);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const { layers, addLayer, removeLayer } = useLayerStore();

  // 检测是否有历史影像图层，并设置当前年份
  useEffect(() => {
    const historyLayer = layers.find(layer => 
      layer.id.includes('geovis-history')
    );
    
    if (historyLayer) {
      setIsVisible(true);
      // 从图层ID中提取年份
      const match = historyLayer.id.match(/(\d{4})/);
      if (match) {
        setSelectedYear(parseInt(match[1]));
      }
    } else {
      setIsVisible(false);
    }
  }, [layers]);

  // 切换年份时更新图层
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    
    // 移除所有历史影像图层
    layers.forEach(layer => {
      if (layer.id.includes('geovis-history')) {
        removeLayer(layer.id);
      }
    });

    // 添加新的历史影像图层
    addLayer({
      id: `basemap-geovis-history-${year}`,
      name: `星图地球历史影像(${year})`,
      type: 'basemap',
      source: {
        type: 'xyz',
        url: `https://tiles.geovisearth.com/base/v1/${year}/img/{z}/{x}/{y}?format=webp&tmsIds=w&token=${GEOVIS_TOKEN}`,
      },
      visible: true,
      opacity: 1,
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="history-image-control">
      <div className="control-content">
        <div className="year-display">{selectedYear}</div>
        <Slider
          min={AVAILABLE_YEARS[0]}
          max={AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]}
          marks={{
            2021: '21',
            2022: '22',
          }}
          step={1}
          value={selectedYear}
          onChange={handleYearChange}
          tooltip={{ formatter: (value) => `${value}年` }}
        />
      </div>
    </div>
  );
};

export default HistoryImageControl;
