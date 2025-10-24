import { create } from 'zustand';
import { CGCS2000_FULL_LIST } from './cgcs2000Data';

/**
 * 坐标系信息接口
 */
export interface CRSInfo {
  code: string;      // EPSG代码，如 "EPSG:4490"
  name: string;      // 名称，如 "CGCS2000"
  wkt: string;       // WKT定义
  type: 'geographic' | 'projected';  // 地理坐标系或投影坐标系
}

/**
 * 坐标系类型枚举
 */
export enum CRSType {
  GEOGRAPHIC = 'geographic',
  PROJECTED = 'projected'
}

/**
 * 完整的坐标系列表（包括CGCS2000全系列和WGS84）
 */
export const ALL_CRS_LIST: CRSInfo[] = CGCS2000_FULL_LIST;

/**
 * 向后兼容的别名
 * @deprecated 使用 ALL_CRS_LIST 替代
 */
export const CGCS2000_CRS_LIST: CRSInfo[] = ALL_CRS_LIST;

/**
 * 常用坐标系常量
 */
export const COMMON_CRS = {
  /** WGS84 地理坐标系 */
  WGS84: 'EPSG:4326',
  /** CGCS2000 地理坐标系 */
  CGCS2000: 'EPSG:4490',
  /** Web墨卡托投影 */
  WEB_MERCATOR: 'EPSG:3857',
} as const;

/**
 * CGCS2000 EPSG代码范围常量（修复后的正确值）
 */
export const CGCS2000_EPSG_RANGES = {
  /** 6度带（带号）zone 13-23: EPSG:4491-4501 */
  ZONE_6_DEGREE: { start: 4491, end: 4501, zoneStart: 13, zoneEnd: 23 },
  /** 6度带（中央经线）CM 75E-135E: EPSG:4502-4512 */
  CM_6_DEGREE: { start: 4502, end: 4512 },
  /** 3度带（带号）zone 25-45: EPSG:4513-4533 */
  ZONE_3_DEGREE: { start: 4513, end: 4533, zoneStart: 25, zoneEnd: 45 },
  /** 3度带（中央经线）CM 75E-135E: EPSG:4534-4554 */
  CM_3_DEGREE: { start: 4534, end: 4554 },
} as const;

/**
 * 坐标系工具函数
 */
export const CRSUtils = {
  /**
   * 根据CGCS2000 3度带zone号获取EPSG代码
   * @param zone 带号 (25-45)
   * @returns EPSG代码，如 "EPSG:4513"
   */
  getEPSGFrom3DegreeZone: (zone: number): string | null => {
    const { start, zoneStart, zoneEnd } = CGCS2000_EPSG_RANGES.ZONE_3_DEGREE;
    if (zone < zoneStart || zone > zoneEnd) return null;
    return `EPSG:${start + (zone - zoneStart)}`;
  },

  /**
   * 根据CGCS2000 6度带zone号获取EPSG代码
   * @param zone 带号 (13-23)
   * @returns EPSG代码，如 "EPSG:4491"
   */
  getEPSGFrom6DegreeZone: (zone: number): string | null => {
    const { start, zoneStart, zoneEnd } = CGCS2000_EPSG_RANGES.ZONE_6_DEGREE;
    if (zone < zoneStart || zone > zoneEnd) return null;
    return `EPSG:${start + (zone - zoneStart)}`;
  },

  /**
   * 判断EPSG代码是否为CGCS2000坐标系
   */
  isCGCS2000: (epsgCode: string): boolean => {
    const code = parseInt(epsgCode.replace('EPSG:', ''));
    return code === 4490 || 
           (code >= 4491 && code <= 4554);
  },

  /**
   * 判断是否为地理坐标系
   */
  isGeographic: (crs: CRSInfo): boolean => {
    return crs.type === CRSType.GEOGRAPHIC;
  },

  /**
   * 判断是否为投影坐标系
   */
  isProjected: (crs: CRSInfo): boolean => {
    return crs.type === CRSType.PROJECTED;
  },

  /**
   * 获取所有地理坐标系
   */
  getGeographicCRS: (): CRSInfo[] => {
    return ALL_CRS_LIST.filter(crs => crs.type === CRSType.GEOGRAPHIC);
  },

  /**
   * 获取所有投影坐标系
   */
  getProjectedCRS: (): CRSInfo[] => {
    return ALL_CRS_LIST.filter(crs => crs.type === CRSType.PROJECTED);
  },
};

interface CRSStore {
  currentCRS: CRSInfo;
  setCRS: (crs: CRSInfo) => void;
  getAllCRS: () => CRSInfo[];
  getCRSByCode: (code: string) => CRSInfo | undefined;
  getGeographicCRS: () => CRSInfo[];
  getProjectedCRS: () => CRSInfo[];
}

// 默认使用CGCS2000
const defaultCRS: CRSInfo = {
  code: 'EPSG:4490',
  name: 'CGCS2000 地理坐标系',
  type: 'geographic',
  wkt: 'GEOGCS["China Geodetic Coordinate System 2000",DATUM["China_2000",SPHEROID["CGCS2000",6378137,298.257222101,AUTHORITY["EPSG","1024"]],AUTHORITY["EPSG","1043"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AXIS["Latitude",NORTH],AXIS["Longitude",EAST],AUTHORITY["EPSG","4490"]]'
};

export const useCRSStore = create<CRSStore>((set, get) => ({
  currentCRS: defaultCRS,

  setCRS: (crs: CRSInfo) => {
    // 坐标系固定为CGCS2000，不允许切换
    console.warn('[CRS] 坐标系已固定为CGCS2000，忽略切换请求');
    // 如果尝试设置为CGCS2000，静默接受
    if (crs.code === 'EPSG:4490') {
      set({ currentCRS: crs });
    }
  },

  getAllCRS: () => {
    return ALL_CRS_LIST;
  },

  getCRSByCode: (code: string) => {
    return ALL_CRS_LIST.find(crs => crs.code === code);
  },

  getGeographicCRS: () => {
    return CRSUtils.getGeographicCRS();
  },

  getProjectedCRS: () => {
    return CRSUtils.getProjectedCRS();
  },
}));

// 注册到全局对象供其他模块访问
if (typeof window !== 'undefined') {
  (window as any).__CRS_STORE__ = useCRSStore;
}
