export interface Project {
  id: string;
  name: string;
  path?: string;
  layers: Layer[];
  mapConfig: MapConfig;
  createdAt: string;
  updatedAt: string;
}

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  source: LayerSource;
  visible: boolean;
  opacity: number;
  style?: LayerStyle;
  extent?: Extent;
  attributes?: AttributeField[];
  groupId?: string; // 所属分组ID
  isGroup?: boolean; // 是否为分组图层
  children?: Layer[]; // 子图层(用于分组显示)
  expanded?: boolean; // 分组是否展开
}

export type LayerType = 'vector' | 'raster' | 'basemap' | 'wms' | 'wfs';

export interface LayerSource {
  type: SourceType;
  path?: string;
  url?: string;
  params?: Record<string, string>;
}

export type SourceType = 'shapefile' | 'geojson' | 'postgis' | 'wms' | 'xyz';

export interface LayerStyle {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  pointSize?: number;
  icon?: string;
  // 符号系统扩展
  symbolizer?: Symbolizer;
}

// 符号系统类型定义
export interface Symbolizer {
  type: 'point' | 'line' | 'polygon';
  point?: PointSymbolizer;
  line?: LineSymbolizer;
  polygon?: PolygonSymbolizer;
}

// 点符号
export interface PointSymbolizer {
  shape: 'circle' | 'square' | 'triangle' | 'star' | 'cross' | 'diamond';
  size: number; // 点大小（像素）
  fillColor: string; // 填充颜色
  fillOpacity: number; // 填充透明度 0-1
  strokeColor: string; // 边框颜色
  strokeWidth: number; // 边框宽度
  strokeOpacity: number; // 边框透明度 0-1
  rotation?: number; // 旋转角度（度）
}

// 线符号
export interface LineSymbolizer {
  color: string; // 线颜色
  width: number; // 线宽（像素）
  opacity: number; // 透明度 0-1
  dashArray?: string; // 虚线样式，如 '5, 10'
  lineCap: 'butt' | 'round' | 'square'; // 线端点样式
  lineJoin: 'miter' | 'round' | 'bevel'; // 线连接样式
}

// 面符号
export interface PolygonSymbolizer {
  fillColor: string; // 填充颜色
  fillOpacity: number; // 填充透明度 0-1
  fillPattern?: string; // 填充图案（预留）
  strokeColor: string; // 边框颜色
  strokeWidth: number; // 边框宽度
  strokeOpacity: number; // 边框透明度 0-1
  strokeDashArray?: string; // 边框虚线样式
}

export interface Extent {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface AttributeField {
  name: string;
  fieldType: string;
  alias?: string;
  editable: boolean;
  visible: boolean;
}

export interface MapConfig {
  center: [number, number];
  zoom: number;
  projection: string;
  basemapUrl: string;
}

export interface Feature {
  id: string;
  geometry: Geometry;
  properties: Record<string, any>;
}

export interface Geometry {
  type: GeometryType;
  coordinates: any;
}

export type GeometryType = 
  | 'Point' 
  | 'LineString' 
  | 'Polygon' 
  | 'MultiPoint' 
  | 'MultiLineString' 
  | 'MultiPolygon';

// 矢量文件信息（由 GDAL 提供）
export interface VectorInfo {
  path: string;
  featureCount: number;
  geometryType: string;
  fields: AttributeField[];
  extent: Extent;
  projection?: string;
}

export interface TableColumn {
  title: string;
  dataIndex: string;
  key: string;
  width?: number;
  ellipsis?: boolean;
  sorter?: boolean | ((a: any, b: any) => number);
  render?: (value: any, record: any) => React.ReactNode;
}

export interface MapTool {
  id: string;
  name: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}
