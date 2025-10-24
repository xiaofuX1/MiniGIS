import type { Coordinate } from 'ol/coordinate';
import type { Extent } from 'ol/extent';

/**
 * OpenLayers辅助工具函数
 * 使用CGCS2000地理坐标系（EPSG:4490）
 */

/**
 * 将[lat, lng]转换为OpenLayers坐标
 * CGCS2000地理坐标系，格式：[经度, 纬度]
 */
export const latLngToOL = (latLng: [number, number]): Coordinate => {
  // 返回[lng, lat]（经度在前，纬度在后）
  return [latLng[1], latLng[0]];
};

/**
 * 将OpenLayers坐标转换为[lat, lng]
 * CGCS2000地理坐标系
 */
export const olToLatLng = (coordinate: Coordinate): [number, number] => {
  // 返回[lat, lng]（纬度在前，经度在后）
  return [coordinate[1], coordinate[0]];
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
  // CGCS2000地理坐标系，格式：[minX, minY, maxX, maxY]
  return [extent.minX, extent.minY, extent.maxX, extent.maxY];
};

/**
 * 将OpenLayers extent转换为GeoJSON extent
 * CGCS2000地理坐标系
 */
export const olExtentToGeoJson = (extent: Extent) => {
  // 返回原始值
  return {
    minX: extent[0],
    minY: extent[1],
    maxX: extent[2],
    maxY: extent[3],
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
