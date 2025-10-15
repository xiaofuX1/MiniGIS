import type { Symbolizer, PointSymbolizer, LineSymbolizer, PolygonSymbolizer } from '../types';
import { Style, Fill, Stroke, Circle, RegularShape, Text } from 'ol/style';
import type { StyleLike } from 'ol/style/Style';

/**
 * 获取几何类型对应的符号类型
 */
export const getSymbolizerType = (geometryType: string): 'point' | 'line' | 'polygon' | null => {
  const type = geometryType.toLowerCase();
  if (type.includes('point')) return 'point';
  if (type.includes('line')) return 'line';
  if (type.includes('polygon')) return 'polygon';
  return null;
};

/**
 * 创建默认符号配置
 */
export const createDefaultSymbolizer = (geometryType: string): Symbolizer => {
  const type = getSymbolizerType(geometryType);
  
  if (type === 'point') {
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
  } else if (type === 'line') {
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

/**
 * 将符号配置转换为 OpenLayers Style
 */
export const symbolizerToOLStyle = (
  symbolizer?: Symbolizer,
  opacity: number = 1
): StyleLike => {
  if (!symbolizer) {
    // 默认符号：多边形样式
    return new Style({
      fill: new Fill({
        color: `rgba(51, 136, 255, ${0.5 * opacity})`,
      }),
      stroke: new Stroke({
        color: `rgba(51, 136, 255, ${1 * opacity})`,
        width: 2,
      }),
    });
  }

  if (symbolizer.type === 'point' && symbolizer.point) {
    const p = symbolizer.point;
    return createPointStyle(p, opacity);
  } else if (symbolizer.type === 'line' && symbolizer.line) {
    const l = symbolizer.line;
    return new Style({
      stroke: new Stroke({
        color: hexToRgba(l.color, (l.opacity ?? 1) * opacity),
        width: l.width,
        lineCap: l.lineCap,
        lineJoin: l.lineJoin,
        lineDash: l.dashArray ? l.dashArray.split(',').map(v => Number(v.trim())) : undefined,
      }),
    });
  } else if (symbolizer.type === 'polygon' && symbolizer.polygon) {
    const g = symbolizer.polygon;
    return new Style({
      fill: new Fill({
        color: hexToRgba(g.fillColor, (g.fillOpacity ?? 1) * opacity),
      }),
      stroke: new Stroke({
        color: hexToRgba(g.strokeColor, (g.strokeOpacity ?? 1) * opacity),
        width: g.strokeWidth,
        lineDash: g.strokeDashArray ? g.strokeDashArray.split(',').map(v => Number(v.trim())) : undefined,
      }),
    });
  }

  return new Style();
};

/**
 * 创建点符号样式
 */
const createPointStyle = (p: PointSymbolizer, opacity: number): Style => {
  let image;
  
  const fillColor = hexToRgba(p.fillColor, (p.fillOpacity ?? 1) * opacity);
  const strokeColor = hexToRgba(p.strokeColor, (p.strokeOpacity ?? 1) * opacity);
  const radius = (p.size ?? 8) / 2;

  switch (p.shape) {
    case 'circle':
      image = new Circle({
        radius,
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({ color: strokeColor, width: p.strokeWidth }),
      });
      break;
    case 'square':
      image = new RegularShape({
        points: 4,
        radius,
        angle: Math.PI / 4,
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({ color: strokeColor, width: p.strokeWidth }),
      });
      break;
    case 'triangle':
      image = new RegularShape({
        points: 3,
        radius,
        rotation: p.rotation ? (p.rotation * Math.PI) / 180 : 0,
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({ color: strokeColor, width: p.strokeWidth }),
      });
      break;
    case 'star':
      image = new RegularShape({
        points: 5,
        radius,
        radius2: radius * 0.5,
        rotation: p.rotation ? (p.rotation * Math.PI) / 180 : 0,
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({ color: strokeColor, width: p.strokeWidth }),
      });
      break;
    case 'cross':
      image = new RegularShape({
        points: 4,
        radius,
        radius2: 0,
        rotation: p.rotation ? (p.rotation * Math.PI) / 180 : 0,
        stroke: new Stroke({ color: strokeColor, width: p.strokeWidth }),
      });
      break;
    case 'diamond':
      image = new RegularShape({
        points: 4,
        radius,
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({ color: strokeColor, width: p.strokeWidth }),
      });
      break;
    default:
      image = new Circle({
        radius,
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({ color: strokeColor, width: p.strokeWidth }),
      });
  }

  return new Style({ image });
};

/**
 * 将十六进制颜色转换为rgba格式
 */
const hexToRgba = (hex: string, alpha: number = 1): string => {
  if (hex.startsWith('rgba')) return hex;
  if (hex.startsWith('rgb')) {
    return hex.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
  }
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
  }
  return `rgba(51, 136, 255, ${alpha})`;
};

/**
 * 创建文本标注样式
 */
export const createTextStyle = (
  field: string,
  config: {
    fontSize?: number;
    fontColor?: string;
    fontWeight?: 'normal' | 'bold';
    haloColor?: string;
    haloWidth?: number;
    offsetX?: number;
    offsetY?: number;
    textAlign?: 'left' | 'right' | 'center' | 'end' | 'start';
    textBaseline?: 'bottom' | 'top' | 'middle' | 'alphabetic' | 'hanging' | 'ideographic';
  }
): Text => {
  return new Text({
    font: `${config.fontWeight || 'normal'} ${config.fontSize || 12}px sans-serif`,
    fill: new Fill({ color: config.fontColor || '#000000' }),
    stroke: new Stroke({
      color: config.haloColor || '#ffffff',
      width: config.haloWidth || 1,
    }),
    offsetX: config.offsetX || 0,
    offsetY: config.offsetY || 0,
    textAlign: config.textAlign || 'center',
    textBaseline: config.textBaseline || 'middle',
  });
};

/**
 * 从 GeoJSON 数据判断包含的几何类型
 */
export const detectGeometryTypes = (geojson: any) => {
  const result = { hasPoint: false, hasLine: false, hasPolygon: false };
  if (!geojson) return result;
  const features = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];
  for (const f of features) {
    const t = (f.geometry?.type || '').toLowerCase();
    if (t.includes('point')) result.hasPoint = true;
    else if (t.includes('line')) result.hasLine = true;
    else if (t.includes('polygon')) result.hasPolygon = true;
    if (result.hasPoint && result.hasLine && result.hasPolygon) break;
  }
  return result;
};
