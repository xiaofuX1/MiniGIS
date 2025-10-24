import React, { useState, useEffect } from 'react';
import { Slider, Select, Input, ColorPicker, Divider, Space, Button } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { Layer } from '../../stores/layerStore';
import { useMapTabsStore } from '../../stores/mapTabsStore';
import type { Symbolizer, PointSymbolizer, LineSymbolizer, PolygonSymbolizer } from '../../types';
import './SymbologyPanel.css';

interface SymbologyPanelProps {
  layer: Layer;
  onClose?: () => void;
}

const SymbologyPanel: React.FC<SymbologyPanelProps> = ({ layer, onClose }) => {
  const mapTabsStore = useMapTabsStore();
  
  const updateLayer = (layerId: string, updates: Partial<Layer>) => {
    mapTabsStore.updateLayerInCurrentTab(layerId, updates);
  };
  
  // 检测几何类型
  const detectGeometryType = (layer: Layer): 'point' | 'line' | 'polygon' | null => {
    if (!layer.geojson?.features || layer.geojson.features.length === 0) {
      return null;
    }
    
    const firstFeature = layer.geojson.features[0];
    const geometryType = firstFeature.geometry?.type;
    
    if (!geometryType) return null;
    
    if (geometryType.toLowerCase().includes('point')) return 'point';
    if (geometryType.toLowerCase().includes('line')) return 'line';
    if (geometryType.toLowerCase().includes('polygon')) return 'polygon';
    
    return null;
  };

  const geometryType = detectGeometryType(layer);
  
  // 初始化符号配置
  const getDefaultSymbolizer = (): Symbolizer => {
    if (geometryType === 'point') {
      return {
        type: 'point',
        point: {
          shape: 'circle',
          size: 8,
          fillColor: '#3388ff',
          fillOpacity: 0.8,
          strokeColor: '#0066cc',
          strokeWidth: 2,
          strokeOpacity: 1,
          rotation: 0,
        }
      };
    } else if (geometryType === 'line') {
      return {
        type: 'line',
        line: {
          color: '#3388ff',
          width: 2,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round',
        }
      };
    } else {
      return {
        type: 'polygon',
        polygon: {
          fillColor: '#3388ff',
          fillOpacity: 0.5,
          strokeColor: '#0066cc',
          strokeWidth: 2,
          strokeOpacity: 1,
        }
      };
    }
  };

  const [symbolizer, setSymbolizer] = useState<Symbolizer>(
    layer.style?.symbolizer || getDefaultSymbolizer()
  );

  // 当 layer 变化时，同步更新 symbolizer 状态
  useEffect(() => {
    if (layer.style?.symbolizer) {
      setSymbolizer(layer.style.symbolizer);
    } else {
      setSymbolizer(getDefaultSymbolizer());
    }
  }, [layer.id]); // 仅在图层 ID 变化时更新

  // 应用符号更新
  const applySymbology = () => {
    updateLayer(layer.id, {
      style: {
        ...layer.style,
        symbolizer: symbolizer,
      }
    });
  };

  // 实时更新（可选）
  useEffect(() => {
    applySymbology();
  }, [symbolizer]);

  // 颜色转换辅助函数
  const colorToHex = (color: Color | string): string => {
    if (typeof color === 'string') return color;
    return color.toHexString();
  };

  // 渲染点符号编辑器
  const renderPointSymbolEditor = (pointSymbol: PointSymbolizer) => (
    <div className="symbolizer-editor">
      <div className="symbol-group">
        <label>点形状</label>
        <Select
          value={pointSymbol.shape}
          onChange={(value) => setSymbolizer({
            ...symbolizer,
            point: { ...pointSymbol, shape: value }
          })}
          options={[
            { label: '圆形', value: 'circle' },
            { label: '方形', value: 'square' },
            { label: '三角形', value: 'triangle' },
            { label: '星形', value: 'star' },
            { label: '十字', value: 'cross' },
            { label: '菱形', value: 'diamond' },
          ]}
        />
      </div>

      <div className="symbol-group">
        <label>大小: {pointSymbol.size}px</label>
        <Slider
          min={1}
          max={50}
          value={pointSymbol.size}
          onChange={(value) => setSymbolizer({
            ...symbolizer,
            point: { ...pointSymbol, size: value }
          })}
        />
      </div>

      <Divider plain orientationMargin={0}>填充</Divider>

      <div className="symbol-group">
        <label>填充颜色</label>
        <ColorPicker
          value={pointSymbol.fillColor}
          onChange={(color) => setSymbolizer({
            ...symbolizer,
            point: { ...pointSymbol, fillColor: colorToHex(color) }
          })}
          showText
        />
      </div>

      <div className="symbol-group">
        <label>填充透明度: {Math.round(pointSymbol.fillOpacity * 100)}%</label>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={pointSymbol.fillOpacity}
          onChange={(value) => setSymbolizer({
            ...symbolizer,
            point: { ...pointSymbol, fillOpacity: value }
          })}
        />
      </div>

      <Divider plain orientationMargin={0}>边框</Divider>

      <div className="symbol-group">
        <label>边框颜色</label>
        <ColorPicker
          value={pointSymbol.strokeColor}
          onChange={(color) => setSymbolizer({
            ...symbolizer,
            point: { ...pointSymbol, strokeColor: colorToHex(color) }
          })}
          showText
        />
      </div>

      <div className="symbol-group">
        <label>边框宽度: {pointSymbol.strokeWidth}px</label>
        <Slider
          min={0}
          max={10}
          value={pointSymbol.strokeWidth}
          onChange={(value) => setSymbolizer({
            ...symbolizer,
            point: { ...pointSymbol, strokeWidth: value }
          })}
        />
      </div>

      <div className="symbol-group">
        <label>边框透明度: {Math.round(pointSymbol.strokeOpacity * 100)}%</label>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={pointSymbol.strokeOpacity}
          onChange={(value) => setSymbolizer({
            ...symbolizer,
            point: { ...pointSymbol, strokeOpacity: value }
          })}
        />
      </div>

      <div className="symbol-group">
        <label>旋转角度: {pointSymbol.rotation || 0}°</label>
        <Slider
          min={0}
          max={360}
          value={pointSymbol.rotation || 0}
          onChange={(value) => setSymbolizer({
            ...symbolizer,
            point: { ...pointSymbol, rotation: value }
          })}
        />
      </div>
    </div>
  );

  // 渲染线符号编辑器
  const renderLineSymbolEditor = (lineSymbol: LineSymbolizer) => (
    <div className="symbolizer-editor">
      <div className="symbol-group">
        <label>线颜色</label>
        <ColorPicker
          value={lineSymbol.color}
          onChange={(color) => setSymbolizer({
            ...symbolizer,
            line: { ...lineSymbol, color: colorToHex(color) }
          })}
          showText
        />
      </div>

      <div className="symbol-group">
        <label>线宽: {lineSymbol.width}px</label>
        <Slider
          min={1}
          max={20}
          value={lineSymbol.width}
          onChange={(value) => setSymbolizer({
            ...symbolizer,
            line: { ...lineSymbol, width: value }
          })}
        />
      </div>

      <div className="symbol-group">
        <label>透明度: {Math.round(lineSymbol.opacity * 100)}%</label>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={lineSymbol.opacity}
          onChange={(value) => setSymbolizer({
            ...symbolizer,
            line: { ...lineSymbol, opacity: value }
          })}
        />
      </div>

      <div className="symbol-group">
        <label>虚线样式</label>
        <Select
          value={lineSymbol.dashArray || 'solid'}
          onChange={(value) => setSymbolizer({
            ...symbolizer,
            line: { ...lineSymbol, dashArray: value === 'solid' ? undefined : value }
          })}
          options={[
            { label: '实线', value: 'solid' },
            { label: '短虚线', value: '5, 5' },
            { label: '长虚线', value: '10, 10' },
            { label: '点划线', value: '10, 5, 2, 5' },
          ]}
        />
      </div>

      <div className="symbol-group">
        <label>端点样式</label>
        <Select
          value={lineSymbol.lineCap}
          onChange={(value) => setSymbolizer({
            ...symbolizer,
            line: { ...lineSymbol, lineCap: value }
          })}
          options={[
            { label: '方形', value: 'butt' },
            { label: '圆形', value: 'round' },
            { label: '突出方形', value: 'square' },
          ]}
        />
      </div>

      <div className="symbol-group">
        <label>连接样式</label>
        <Select
          value={lineSymbol.lineJoin}
          onChange={(value) => setSymbolizer({
            ...symbolizer,
            line: { ...lineSymbol, lineJoin: value }
          })}
          options={[
            { label: '尖角', value: 'miter' },
            { label: '圆角', value: 'round' },
            { label: '斜角', value: 'bevel' },
          ]}
        />
      </div>
    </div>
  );

  // 渲染面符号编辑器
  const renderPolygonSymbolEditor = (polygonSymbol: PolygonSymbolizer) => (
    <div className="symbolizer-editor">
      <Divider plain orientationMargin={0}>填充</Divider>

      <div className="symbol-group">
        <label>填充颜色</label>
        <ColorPicker
          value={polygonSymbol.fillColor}
          onChange={(color) => setSymbolizer({
            ...symbolizer,
            polygon: { ...polygonSymbol, fillColor: colorToHex(color) }
          })}
          showText
        />
      </div>

      <div className="symbol-group">
        <label>填充透明度: {Math.round(polygonSymbol.fillOpacity * 100)}%</label>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={polygonSymbol.fillOpacity}
          onChange={(value) => setSymbolizer({
            ...symbolizer,
            polygon: { ...polygonSymbol, fillOpacity: value }
          })}
        />
      </div>

      <Divider plain orientationMargin={0}>边框</Divider>

      <div className="symbol-group">
        <label>边框颜色</label>
        <ColorPicker
          value={polygonSymbol.strokeColor}
          onChange={(color) => setSymbolizer({
            ...symbolizer,
            polygon: { ...polygonSymbol, strokeColor: colorToHex(color) }
          })}
          showText
        />
      </div>

      <div className="symbol-group">
        <label>边框宽度: {polygonSymbol.strokeWidth}px</label>
        <Slider
          min={0}
          max={10}
          value={polygonSymbol.strokeWidth}
          onChange={(value) => setSymbolizer({
            ...symbolizer,
            polygon: { ...polygonSymbol, strokeWidth: value }
          })}
        />
      </div>

      <div className="symbol-group">
        <label>边框透明度: {Math.round(polygonSymbol.strokeOpacity * 100)}%</label>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={polygonSymbol.strokeOpacity}
          onChange={(value) => setSymbolizer({
            ...symbolizer,
            polygon: { ...polygonSymbol, strokeOpacity: value }
          })}
        />
      </div>

      <div className="symbol-group">
        <label>边框虚线样式</label>
        <Select
          value={polygonSymbol.strokeDashArray || 'solid'}
          onChange={(value) => setSymbolizer({
            ...symbolizer,
            polygon: { ...polygonSymbol, strokeDashArray: value === 'solid' ? undefined : value }
          })}
          options={[
            { label: '实线', value: 'solid' },
            { label: '短虚线', value: '5, 5' },
            { label: '长虚线', value: '10, 10' },
            { label: '点划线', value: '10, 5, 2, 5' },
          ]}
        />
      </div>
    </div>
  );

  if (!geometryType) {
    return (
      <div className="symbology-panel-content">
        <p className="text-gray-500">无法检测图层几何类型</p>
      </div>
    );
  }

  return (
    <div className="symbology-panel-content">
      <div className="symbology-layer-info">
        <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
          <strong>{layer.name}</strong>
          <span style={{ marginLeft: 8 }}>
            ({geometryType === 'point' && '点图层'}
            {geometryType === 'line' && '线图层'}
            {geometryType === 'polygon' && '面图层'})
          </span>
        </div>
      </div>
      
      {geometryType === 'point' && symbolizer.point && renderPointSymbolEditor(symbolizer.point)}
      {geometryType === 'line' && symbolizer.line && renderLineSymbolEditor(symbolizer.line)}
      {geometryType === 'polygon' && symbolizer.polygon && renderPolygonSymbolEditor(symbolizer.polygon)}
    </div>
  );
};

export default SymbologyPanel;
