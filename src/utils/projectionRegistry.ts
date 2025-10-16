import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { get as getProjection } from 'ol/proj';
import { ALL_CRS_LIST } from '../stores/crsStore';

/**
 * 注册所有支持的投影坐标系到OpenLayers
 * 使得OpenLayers可以自动在不同坐标系之间转换
 */
export const registerAllProjections = () => {
  console.log('[投影注册] 开始注册所有坐标系...');
  
  let registeredCount = 0;
  
  // 注册所有CGCS2000和其他坐标系
  ALL_CRS_LIST.forEach(crs => {
    try {
      // WGS84已内置，跳过
      if (crs.code === 'EPSG:4326' || crs.code === 'EPSG:3857') {
        return;
      }
      
      // 检查是否已注册
      const existing = getProjection(crs.code);
      if (existing) {
        console.log(`[投影注册] ${crs.code} 已存在，跳过`);
        return;
      }
      
      // 使用WKT定义proj4
      proj4.defs(crs.code, crs.wkt);
      registeredCount++;
      
      // console.log(`[投影注册] 已注册 ${crs.code} - ${crs.name}`);
    } catch (error) {
      console.error(`[投影注册] 注册 ${crs.code} 失败:`, error);
    }
  });
  
  // 将proj4注册到OpenLayers
  register(proj4);
  
  console.log(`[投影注册] 完成! 共注册 ${registeredCount} 个坐标系`);
  
  // 验证关键坐标系
  const testCodes = ['EPSG:4490', 'EPSG:4513', 'EPSG:4534'];
  testCodes.forEach(code => {
    const proj = getProjection(code);
    if (proj) {
      console.log(`[投影验证] ✓ ${code} 可用`);
    } else {
      console.warn(`[投影验证] ✗ ${code} 不可用`);
    }
  });
};

/**
 * 获取坐标系的范围（extent）
 * 用于设置View的正确范围
 */
export const getProjectionExtent = (code: string): number[] | undefined => {
  // 地理坐标系使用全球范围
  if (code === 'EPSG:4326' || code === 'EPSG:4490') {
    return [-180, -90, 180, 90];
  }
  
  // 投影坐标系根据EPSG代码设置合理范围
  // CGCS2000投影坐标系通常使用中国范围
  if (code.startsWith('EPSG:4') && code !== 'EPSG:4326') {
    // 大致的中国投影范围（米）
    return [-3000000, 2000000, 5000000, 7000000];
  }
  
  // Web墨卡托
  if (code === 'EPSG:3857') {
    const extent = 20037508.342789244;
    return [-extent, -extent, extent, extent];
  }
  
  return undefined;
};
