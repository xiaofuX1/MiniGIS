import { CRSInfo } from './crsStore';

/**
 * 完整的CGCS2000坐标系数据
 * 包括：地理坐标系、3度带（带号/CM）、6度带（带号/CM）
 */

// 生成3度带投影坐标系（带号版本）- zone 25-45
const generate3DegreeZones = (): CRSInfo[] => {
  const zones: CRSInfo[] = [];
  for (let zone = 25; zone <= 45; zone++) {
    const centralMeridian = 75 + (zone - 25) * 3;
    const epsgCode = 4513 + (zone - 25);
    zones.push({
      code: `EPSG:${epsgCode}`,
      name: `CGCS2000 / 3度带 zone ${zone} (${centralMeridian}°E)`,
      type: 'projected',
      wkt: `PROJCS["CGCS2000 / 3-degree Gauss-Kruger zone ${zone}",GEOGCS["China Geodetic Coordinate System 2000",DATUM["China_2000",SPHEROID["CGCS2000",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",${centralMeridian}],PARAMETER["scale_factor",1],PARAMETER["false_easting",${zone}500000],PARAMETER["false_northing",0],UNIT["metre",1],AUTHORITY["EPSG","${epsgCode}"]]`
    });
  }
  return zones;
};

// 生成3度带投影坐标系（中央经线版本）- CM 75E-135E
const generate3DegreeCM = (): CRSInfo[] => {
  const cms: CRSInfo[] = [];
  const epsgStart = 4534;
  for (let i = 0; i <= 20; i++) {
    const centralMeridian = 75 + i * 3;
    const epsgCode = epsgStart + i;
    cms.push({
      code: `EPSG:${epsgCode}`,
      name: `CGCS2000 / 3度带 CM ${centralMeridian}°E`,
      type: 'projected',
      wkt: `PROJCS["CGCS2000 / 3-degree Gauss-Kruger CM ${centralMeridian}E",GEOGCS["China Geodetic Coordinate System 2000",DATUM["China_2000",SPHEROID["CGCS2000",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",${centralMeridian}],PARAMETER["scale_factor",1],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1],AUTHORITY["EPSG","${epsgCode}"]]`
    });
  }
  return cms;
};

// 生成6度带投影坐标系（带号版本）- zone 13-23
const generate6DegreeZones = (): CRSInfo[] => {
  const zones: CRSInfo[] = [];
  for (let zone = 13; zone <= 23; zone++) {
    const centralMeridian = 75 + (zone - 13) * 6;
    const epsgCode = 4491 + (zone - 13); // 从EPSG:4491开始
    zones.push({
      code: `EPSG:${epsgCode}`,
      name: `CGCS2000 / 6度带 zone ${zone} (${centralMeridian}°E)`,
      type: 'projected',
      wkt: `PROJCS["CGCS2000 / 6-degree Gauss-Kruger zone ${zone}",GEOGCS["China Geodetic Coordinate System 2000",DATUM["China_2000",SPHEROID["CGCS2000",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",${centralMeridian}],PARAMETER["scale_factor",1],PARAMETER["false_easting",${zone}500000],PARAMETER["false_northing",0],UNIT["metre",1],AUTHORITY["EPSG","${epsgCode}"]]`
    });
  }
  return zones;
};

// 生成6度带投影坐标系（中央经线版本）- CM 75E-135E
const generate6DegreeCM = (): CRSInfo[] => {
  const cms: CRSInfo[] = [];
  const epsgStart = 4502;
  for (let i = 0; i <= 10; i++) {
    const centralMeridian = 75 + i * 6;
    const epsgCode = epsgStart + i;
    cms.push({
      code: `EPSG:${epsgCode}`,
      name: `CGCS2000 / 6度带 CM ${centralMeridian}°E`,
      type: 'projected',
      wkt: `PROJCS["CGCS2000 / 6-degree Gauss-Kruger CM ${centralMeridian}E",GEOGCS["China Geodetic Coordinate System 2000",DATUM["China_2000",SPHEROID["CGCS2000",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",${centralMeridian}],PARAMETER["scale_factor",1],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1],AUTHORITY["EPSG","${epsgCode}"]]`
    });
  }
  return cms;
};

export const CGCS2000_FULL_LIST: CRSInfo[] = [
  // 地理坐标系
  {
    code: 'EPSG:4490',
    name: 'CGCS2000 地理坐标系',
    type: 'geographic',
    wkt: 'GEOGCS["China Geodetic Coordinate System 2000",DATUM["China_2000",SPHEROID["CGCS2000",6378137,298.257222101,AUTHORITY["EPSG","1024"]],AUTHORITY["EPSG","1043"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AXIS["Latitude",NORTH],AXIS["Longitude",EAST],AUTHORITY["EPSG","4490"]]'
  },
  
  // 3度带（带号）
  ...generate3DegreeZones(),
  
  // 3度带（中央经线）
  ...generate3DegreeCM(),
  
  // 6度带（带号）
  ...generate6DegreeZones(),
  
  // 6度带（中央经线）
  ...generate6DegreeCM(),
  
  // WGS84
  {
    code: 'EPSG:4326',
    name: 'WGS 84 地理坐标系',
    type: 'geographic',
    wkt: 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]'
  }
];
