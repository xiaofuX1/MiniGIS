import { invoke } from '@tauri-apps/api/core';

/**
 * 矢量文件信息
 */
export interface VectorInfo {
  path: string;
  feature_count: number;
  geometry_type: string;
  fields: Array<{
    name: string;
    type: string;
    width: number;
    precision: number;
  }>;
  extent: {
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
  };
  projection?: string;
}

/**
 * 属性表数据
 */
export interface AttributeTable {
  rows: Array<Record<string, any>>;
  total: number;
}

/**
 * GDAL 服务类
 */
class GDALService {
  /**
   * 打开矢量文件
   */
  async openVector(path: string): Promise<VectorInfo> {
    try {
      const info = await invoke<VectorInfo>('gdal_open_vector', { path });
      return info;
    } catch (error) {
      console.error('[GDAL] 打开文件失败:', error);
      throw new Error(`无法打开文件: ${error}`);
    }
  }

  /**
   * 获取属性表
   */
  async getAttributeTable(
    path: string,
    offset?: number,
    limit?: number
  ): Promise<Array<Record<string, any>>> {
    try {
      const table = await invoke<AttributeTable>('gdal_get_attribute_table', {
        path,
        offset,
        limit
      });
      return table.rows;
    } catch (error) {
      console.error('[GDAL] 读取属性表失败:', error);
      throw new Error(`无法读取属性表: ${error}`);
    }
  }

  /**
   * 获取 GeoJSON
   */
  async getGeoJSON(path: string): Promise<any> {
    try {
      const geojson = await invoke('gdal_get_geojson', { path });
      return geojson;
    } catch (error) {
      console.error('[GDAL] 读取 GeoJSON 失败:', error);
      throw new Error(`无法读取 GeoJSON: ${error}`);
    }
  }

  /**
   * 坐标转换
   * @param fromSrs 源坐标系 (EPSG代码、WKT或PROJ.4)
   * @param toSrs 目标坐标系 (EPSG代码、WKT或PROJ.4)
   * @param coordinates 坐标数组 [[x1, y1], [x2, y2], ...]
   */
  async transformCoordinates(
    fromSrs: string,
    toSrs: string,
    coordinates: Array<[number, number]>
  ): Promise<Array<[number, number]>> {
    try {
      const transformed = await invoke<Array<[number, number]>>(
        'gdal_transform_coordinates',
        { fromSrs, toSrs, coordinates }
      );
      return transformed;
    } catch (error) {
      console.error('[GDAL] 坐标转换失败:', error);
      throw new Error(`坐标转换失败: ${error}`);
    }
  }

  /**
   * 获取支持的驱动列表
   */
  async getSupportedDrivers(): Promise<string[]> {
    try {
      const drivers = await invoke<string[]>('gdal_get_drivers');
      return drivers;
    } catch (error) {
      console.error('[GDAL] 获取驱动列表失败:', error);
      throw new Error(`无法获取驱动列表: ${error}`);
    }
  }

  /**
   * 获取 GDAL 版本
   */
  async getVersion(): Promise<string> {
    try {
      const version = await invoke<string>('gdal_get_version');
      return version;
    } catch (error) {
      console.error('[GDAL] 获取版本失败:', error);
      throw new Error(`无法获取版本: ${error}`);
    }
  }

  /**
   * WGS84 转 Web墨卡托
   */
  async wgs84ToWebMercator(coordinates: Array<[number, number]>): Promise<Array<[number, number]>> {
    return this.transformCoordinates('EPSG:4326', 'EPSG:3857', coordinates);
  }

  /**
   * Web墨卡托 转 WGS84
   */
  async webMercatorToWgs84(coordinates: Array<[number, number]>): Promise<Array<[number, number]>> {
    return this.transformCoordinates('EPSG:3857', 'EPSG:4326', coordinates);
  }

  /**
   * 检查文件是否支持
   */
  isSupported(extension: string): boolean {
    const supportedExtensions = [
      'shp', 'gpkg', 'geojson', 'json', 'kml', 'kmz',
      'tab', 'gml', 'sqlite', 'csv', 'dxf', 'dgn',
      'tif', 'tiff', 'jp2', 'png', 'jpg', 'jpeg',
      'hdf', 'nc', 'grib', 'ecw', 'sid'
    ];
    return supportedExtensions.includes(extension.toLowerCase().replace('.', ''));
  }

  /**
   * 获取文件类型
   */
  getFileType(extension: string): 'vector' | 'raster' | 'unknown' {
    const vectorExts = ['shp', 'gpkg', 'geojson', 'json', 'kml', 'kmz', 'tab', 'gml', 'sqlite', 'csv', 'dxf', 'dgn'];
    const rasterExts = ['tif', 'tiff', 'jp2', 'png', 'jpg', 'jpeg', 'hdf', 'nc', 'grib', 'ecw', 'sid'];
    
    const ext = extension.toLowerCase().replace('.', '');
    
    if (vectorExts.includes(ext)) return 'vector';
    if (rasterExts.includes(ext)) return 'raster';
    return 'unknown';
  }
}

// 导出单例
export const gdalService = new GDALService();

// 导出类
export default GDALService;
