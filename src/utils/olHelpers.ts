import { fromLonLat, toLonLat } from 'ol/proj';
import type { Coordinate } from 'ol/coordinate';
import type { Extent } from 'ol/extent';

/**
 * OpenLayers辅助工具函数
 */

/**
 * 将[lat, lng]转换为OpenLayers的[lng, lat]投影坐标
 */
export const latLngToOL = (latLng: [number, number]): Coordinate => {
  return fromLonLat([latLng[1], latLng[0]]);
};

/**
 * 将OpenLayers投影坐标转换为[lat, lng]
 */
export const olToLatLng = (coordinate: Coordinate): [number, number] => {
  const lonLat = toLonLat(coordinate);
  return [lonLat[1], lonLat[0]];
};

/**
 * 将GeoJSON extent转换为OpenLayers extent
 * @param extent {minX, minY, maxX, maxY}格式
 */
export const geoJsonExtentToOL = (extent: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}): Extent => {
  const bottomLeft = fromLonLat([extent.minX, extent.minY]);
  const topRight = fromLonLat([extent.maxX, extent.maxY]);
  return [bottomLeft[0], bottomLeft[1], topRight[0], topRight[1]];
};

/**
 * 将OpenLayers extent转换为GeoJSON extent
 */
export const olExtentToGeoJson = (extent: Extent) => {
  const bottomLeft = toLonLat([extent[0], extent[1]]);
  const topRight = toLonLat([extent[2], extent[3]]);
  return {
    minX: bottomLeft[0],
    minY: bottomLeft[1],
    maxX: topRight[0],
    maxY: topRight[1],
  };
};

/**
 * 创建XYZ瓦片URL模板（处理{s}子域占位符）
 */
export const createXYZUrl = (template: string): string => {
  // OpenLayers使用{a-c}或{1-4}格式表示子域
  if (template.includes('{s}')) {
    // 检测是天地图还是谷歌
    if (template.includes('google')) {
      return template.replace('{s}', '{0-3}');
    } else {
      return template.replace('{s}', '{0-7}');
    }
  }
  return template;
};
