import type { Symbolizer, PointSymbolizer, LineSymbolizer, PolygonSymbolizer } from '../types';

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
 * MapLibre GL Paint 构造：将符号配置转换为 MapLibre 的 paint 参数
 */
export const symbolizerToMapLibrePaints = (
  symbolizer?: Symbolizer,
  opacity: number = 1
): { fillPaint?: any; linePaint?: any; circlePaint?: any } => {
  if (!symbolizer) {
    // 默认符号：只返回多边形样式，不返回 circlePaint（避免显示顶点）
    return {
      fillPaint: {
        'fill-color': '#3388ff',
        'fill-opacity': 0.5 * opacity,
      },
      linePaint: {
        'line-color': '#3388ff',
        'line-width': 2,
        'line-opacity': 1 * opacity,
      },
    };
  }

  if (symbolizer.type === 'point' && symbolizer.point) {
    const p = symbolizer.point;
    return {
      circlePaint: {
        'circle-color': p.fillColor,
        'circle-opacity': (p.fillOpacity ?? 1) * opacity,
        'circle-radius': (p.size ?? 8) / 2,
        'circle-stroke-color': p.strokeColor,
        'circle-stroke-width': p.strokeWidth,
        'circle-stroke-opacity': (p.strokeOpacity ?? 1) * opacity,
      }
    };
  } else if (symbolizer.type === 'line' && symbolizer.line) {
    const l = symbolizer.line;
    return {
      linePaint: {
        'line-color': l.color,
        'line-width': l.width,
        'line-opacity': (l.opacity ?? 1) * opacity,
        'line-dasharray': l.dashArray ? l.dashArray.split(',').map(v => Number(v.trim())) : undefined,
      }
    };
  } else if (symbolizer.type === 'polygon' && symbolizer.polygon) {
    const g = symbolizer.polygon;
    return {
      fillPaint: {
        'fill-color': g.fillColor,
        'fill-opacity': (g.fillOpacity ?? 1) * opacity,
      },
      linePaint: {
        'line-color': g.strokeColor,
        'line-width': g.strokeWidth,
        'line-opacity': (g.strokeOpacity ?? 1) * opacity,
        'line-dasharray': g.strokeDashArray ? g.strokeDashArray.split(',').map(v => Number(v.trim())) : undefined,
      }
    };
  }

  return {};
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
