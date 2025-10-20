use crate::errors::{AppError, Result};
use crate::models::{Extent, Feature, Geometry, VectorInfo, AttributeField, MultiLayerVectorInfo, LayerInfo};
use gdal::Dataset;
use gdal::spatial_ref::SpatialRef;
use gdal::vector::LayerAccess;
use gdal::DriverManager;
use std::collections::HashMap;
use std::path::Path;
use regex::Regex;

/// 智能检测文件编码格式
/// KML/KMZ：固定使用UTF-8
/// Shapefile：优先级：.cpg文件 > GBK > UTF-8 > 系统默认
fn detect_file_encoding(file_path: &str) -> Vec<&'static str> {
    let path_lower = file_path.to_lowercase();
    
    // KML/KMZ 标准使用 UTF-8 编码
    if path_lower.ends_with(".kml") || path_lower.ends_with(".kmz") {
        log::info!("KML/KMZ文件，使用UTF-8编码");
        return vec!["UTF-8", ""];
    }
    
    detect_shapefile_encoding(file_path)
}

/// 智能检测 Shapefile 编码格式
/// 优先级：.cpg文件 > GBK > UTF-8 > 系统默认
fn detect_shapefile_encoding(shp_path: &str) -> Vec<&'static str> {
    let path = Path::new(shp_path);
    
    // 1. 检查 .cpg 文件（Shapefile 编码声明文件）
    if let Some(parent) = path.parent() {
        if let Some(stem) = path.file_stem() {
            let cpg_path = parent.join(format!("{}.cpg", stem.to_string_lossy()));
            if cpg_path.exists() {
                if let Ok(encoding) = std::fs::read_to_string(&cpg_path) {
                    let encoding = encoding.trim().to_uppercase();
                    log::info!("检测到 .cpg 文件，声明编码: {}", encoding);
                    
                    // 根据 .cpg 文件内容返回编码顺序
                    return match encoding.as_str() {
                        "UTF-8" | "UTF8" => vec!["UTF-8", "GBK", ""],
                        "GBK" | "GB2312" | "GB18030" => vec!["GBK", "UTF-8", ""],
                        "ISO-8859-1" | "LATIN1" => vec!["ISO-8859-1", "GBK", "UTF-8", ""],
                        _ => vec!["GBK", "UTF-8", ""],
                    };
                }
            }
        }
    }
    
    // 2. 没有 .cpg 文件，使用智能猜测
    // 优先尝试 GBK（中国shapefile常用），然后 UTF-8（现代标准），最后系统默认
    log::info!("未找到 .cpg 文件，自动尝试编码: GBK -> UTF-8 -> 系统默认");
    vec!["GBK", "UTF-8", ""]
}

/// 使用智能编码打开矢量文件（支持Shapefile、KML、KMZ等）
fn open_vector_with_encoding(path: &str) -> Result<Dataset> {
    let encodings = detect_file_encoding(path);
    
    for encoding in encodings {
        let encoding_name = if encoding.is_empty() { "系统默认" } else { encoding };
        log::info!("尝试使用编码打开矢量文件: {}", encoding_name);
        
        let result = if encoding.is_empty() {
            // 系统默认编码
            Dataset::open(path)
        } else {
            // 指定编码
            Dataset::open_ex(
                path,
                gdal::DatasetOptions {
                    open_flags: gdal::GdalOpenFlags::GDAL_OF_VECTOR | gdal::GdalOpenFlags::GDAL_OF_READONLY,
                    open_options: Some(&[&format!("ENCODING={}", encoding)]),
                    ..Default::default()
                },
            )
        };
        
        match result {
            Ok(ds) => {
                log::info!("✓ 成功使用编码打开: {}", encoding_name);
                return Ok(ds);
            }
            Err(e) => {
                log::warn!("✗ 编码 {} 打开失败: {}", encoding_name, e);
                continue;
            }
        }
    }
    
    Err(AppError::FileReadError(format!("无法打开文件: 尝试了所有编码都失败")))
}

/// 解析KML的description字段
/// KML文件通常将所有属性数据打包在description字段中
/// 格式如: "OBJECTID":1 "HNNM":"岷江" "RIVER":"杂谷脑河"
fn parse_kml_description(description: &str) -> HashMap<String, serde_json::Value> {
    let mut properties = HashMap::new();
    
    // 匹配键值对的正则表达式
    // 支持格式: "key":value 或 "key":"value"
    let re = Regex::new(r#""([^"]+)":([^"\s]+|"[^"]*")"#).unwrap();
    
    for cap in re.captures_iter(description) {
        let key = cap[1].to_string();
        let value_str = &cap[2];
        
        // 解析值
        let value = if value_str.starts_with('"') && value_str.ends_with('"') {
            // 字符串值
            let s = value_str[1..value_str.len()-1].to_string();
            serde_json::Value::String(s)
        } else if let Ok(i) = value_str.parse::<i64>() {
            // 整数值
            serde_json::Value::Number(i.into())
        } else if let Ok(f) = value_str.parse::<f64>() {
            // 浮点数值
            serde_json::Number::from_f64(f)
                .map(serde_json::Value::Number)
                .unwrap_or_else(|| serde_json::Value::String(value_str.to_string()))
        } else {
            // 其他情况作为字符串
            serde_json::Value::String(value_str.to_string())
        };
        
        properties.insert(key, value);
    }
    
    properties
}

/// 使用GDAL读取矢量文件信息
pub async fn read_vector_info(path: &str) -> Result<VectorInfo> {
    let path_lower = path.to_lowercase();
    
    // 使用智能编码打开 Shapefile、KML、KMZ
    let dataset = if path_lower.ends_with(".shp") 
        || path_lower.ends_with(".kml") 
        || path_lower.ends_with(".kmz") {
        open_vector_with_encoding(path)?
    } else {
        Dataset::open(path)
            .map_err(|e| AppError::FileReadError(format!("无法打开文件: {}", e)))?
    };
    
    let mut layer = dataset.layer(0)
        .map_err(|e| AppError::FileReadError(format!("无法读取图层: {}", e)))?;
    
    let feature_count = layer.feature_count() as usize;
    
    // 获取空间参考
    let spatial_ref = layer.spatial_ref();
    let projection = spatial_ref
        .as_ref()
        .map(|sr| sr.to_wkt().unwrap_or_default())
        .unwrap_or_default();
    
    // 获取原始范围
    let envelope = layer.get_extent()
        .map_err(|e| AppError::FileReadError(format!("无法获取范围: {}", e)))?;
    
    // 检测是否需要转换范围到 WGS84 (经纬度)
    let needs_transform = if let Some(ref srs) = spatial_ref {
        let epsg_code = srs.auth_code().unwrap_or_default();
        log::info!("源坐标系 EPSG: {}", epsg_code);
        // 如果不是 WGS84，需要转换
        epsg_code != 4326 && epsg_code != 4490  // 4490 是 CGCS2000，近似 WGS84
    } else {
        log::warn!("未检测到坐标系，假定为 WGS84");
        false  // 假定已经是 WGS84
    };
    
    // 转换范围到 WGS84 (经纬度) - MapLibre 需要经纬度坐标
    let extent = if needs_transform {
        // 使用WKT定义WGS84，避免依赖EPSG数据库
        const WGS84_WKT: &str = r#"GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]"#;
        
        let mut target_srs = SpatialRef::from_wkt(WGS84_WKT)
            .map_err(|e| AppError::InvalidFormat(format!("创建WGS84坐标系失败: {}", e)))?;
        
        // 设置轴映射为传统 GIS 顺序 (经度, 纬度)
        target_srs.set_axis_mapping_strategy(gdal::spatial_ref::AxisMappingStrategy::TraditionalGisOrder);
        
        let mut source = match spatial_ref {
            Some(s) => s,
            None => SpatialRef::from_wkt(WGS84_WKT)
                .map_err(|e| AppError::InvalidFormat(format!("创建默认WGS84坐标系失败: {}", e)))?
        };
        source.set_axis_mapping_strategy(gdal::spatial_ref::AxisMappingStrategy::TraditionalGisOrder);
        
        let transform = gdal::spatial_ref::CoordTransform::new(&source, &target_srs)
            .map_err(|e| AppError::InvalidFormat(format!("创建坐标转换失败: {}", e)))?;
        
        // 转换四个角点
        let mut xs = vec![envelope.MinX, envelope.MaxX, envelope.MinX, envelope.MaxX];
        let mut ys = vec![envelope.MinY, envelope.MinY, envelope.MaxY, envelope.MaxY];
        let mut zs = vec![0.0; 4];
        
        transform.transform_coords(&mut xs, &mut ys, &mut zs)
            .map_err(|e| AppError::InvalidFormat(format!("范围坐标转换失败: {}", e)))?;
        
        // 计算转换后的边界框（此时 xs=经度, ys=纬度）
        let min_x = xs.iter().cloned().fold(f64::INFINITY, f64::min);
        let max_x = xs.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let min_y = ys.iter().cloned().fold(f64::INFINITY, f64::min);
        let max_y = ys.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        
        log::info!("范围已转换到 WGS84 (经度,纬度): [{}, {}, {}, {}]", min_x, min_y, max_x, max_y);
        
        Extent {
            min_x,
            min_y,
            max_x,
            max_y,
        }
    } else {
        Extent {
            min_x: envelope.MinX,
            min_y: envelope.MinY,
            max_x: envelope.MaxX,
            max_y: envelope.MaxY,
        }
    };
    
    // 获取字段信息
    let layer_defn = layer.defn();
    let mut fields = Vec::new();
    for field in layer_defn.fields() {
        fields.push(AttributeField {
            name: field.name(),
            field_type: format!("{:?}", field.field_type()),
            alias: None,
            editable: false,
            visible: true,
        });
    }
    
    // 获取几何类型 - 尝试从第一个要素获取
    let mut geometry_type = "Unknown".to_string();
    if let Some(feature) = layer.features().next() {
        if let Some(geom) = feature.geometry() {
            geometry_type = format!("{:?}", geom.geometry_type());
        }
    }
    
    Ok(VectorInfo {
        path: path.to_string(),
        feature_count,
        geometry_type,
        fields,
        extent,
        projection: if projection.is_empty() { None } else { Some(projection) },
    })
}

/// 获取要素总数
pub async fn get_feature_count(path: &str) -> Result<usize> {
    let path_lower = path.to_lowercase();
    
    // 使用智能编码打开 Shapefile、KML、KMZ
    let dataset = if path_lower.ends_with(".shp") 
        || path_lower.ends_with(".kml") 
        || path_lower.ends_with(".kmz") {
        open_vector_with_encoding(path)?
    } else {
        Dataset::open(path)
            .map_err(|e| AppError::FileReadError(format!("无法打开文件: {}", e)))?
    };
    
    let layer = dataset.layer(0)
        .map_err(|e| AppError::FileReadError(format!("无法读取图层: {}", e)))?;
    
    Ok(layer.feature_count() as usize)
}

/// 使用GDAL读取要素（仅属性，不含几何）
pub async fn read_vector_features(path: &str, offset: Option<usize>, limit: Option<usize>) -> Result<Vec<Feature>> {
    let path_lower = path.to_lowercase();
    
    // 使用智能编码打开 Shapefile、KML、KMZ
    let dataset = if path_lower.ends_with(".shp") 
        || path_lower.ends_with(".kml") 
        || path_lower.ends_with(".kmz") {
        open_vector_with_encoding(path)?
    } else {
        Dataset::open(path)
            .map_err(|e| AppError::FileReadError(format!("无法打开文件: {}", e)))?
    };
    
    let mut layer = dataset.layer(0)
        .map_err(|e| AppError::FileReadError(format!("无法读取图层: {}", e)))?;
    
    let offset = offset.unwrap_or(0);
    let limit = limit.unwrap_or(usize::MAX);
    
    let mut features = Vec::new();
    
    for (idx, feature) in layer.features().enumerate() {
        if idx < offset {
            continue;
        }
        if idx >= offset + limit {
            break;
        }
        
        // 获取几何
        let geometry = if let Some(geom) = feature.geometry() {
            let geojson = geom.json()
                .map_err(|e| AppError::InvalidFormat(format!("几何转换失败: {}", e)))?;
            
            let geojson_value: serde_json::Value = serde_json::from_str(&geojson)
                .map_err(|e| AppError::InvalidFormat(format!("JSON解析失败: {}", e)))?;
            
            Geometry {
                geom_type: geojson_value["type"].as_str().unwrap_or("Unknown").to_string(),
                coordinates: geojson_value["coordinates"].clone(),
            }
        } else {
            Geometry {
                geom_type: "Null".to_string(),
                coordinates: serde_json::Value::Null,
            }
        };
        
        // 获取属性
        let mut properties = HashMap::new();
        let mut has_description = false;
        let mut description_content = String::new();
        
        for (field_name, field_value) in feature.fields() {
            let json_value = match field_value {
                Some(gdal::vector::FieldValue::StringValue(s)) => {
                    // 检测是否为KML的description字段
                    if field_name.to_lowercase() == "description" && (path_lower.ends_with(".kml") || path_lower.ends_with(".kmz")) {
                        has_description = true;
                        description_content = s.clone();
                    }
                    serde_json::Value::String(s.clone())
                },
                Some(gdal::vector::FieldValue::IntegerValue(i)) => serde_json::Value::Number(i.into()),
                Some(gdal::vector::FieldValue::Integer64Value(i)) => serde_json::Value::Number(i.into()),
                Some(gdal::vector::FieldValue::RealValue(r)) => {
                    serde_json::Number::from_f64(r)
                        .map(serde_json::Value::Number)
                        .unwrap_or(serde_json::Value::Null)
                },
                Some(gdal::vector::FieldValue::DateValue(d)) => serde_json::Value::String(format!("{:?}", d)),
                Some(gdal::vector::FieldValue::DateTimeValue(dt)) => serde_json::Value::String(format!("{:?}", dt)),
                _ => serde_json::Value::Null,
            };
            properties.insert(field_name.clone(), json_value);
        }
        
        // 如果是KML且有description字段，解析并合并属性
        if has_description && !description_content.is_empty() {
            let parsed_props = parse_kml_description(&description_content);
            log::info!("解析KML description字段，提取了 {} 个属性", parsed_props.len());
            // 将解析出的属性合并到properties中
            for (key, value) in parsed_props {
                properties.insert(key, value);
            }
        }
        
        features.push(Feature {
            id: feature.fid().unwrap_or(idx as u64).to_string(),
            geometry,
            properties,
        });
    }
    
    Ok(features)
}

/// 使用GDAL读取要素（包含几何信息，用于属性表）
pub async fn read_vector_features_with_geometry(path: &str, offset: Option<usize>, limit: Option<usize>) -> Result<Vec<Feature>> {
    let path_lower = path.to_lowercase();
    
    // 使用智能编码打开 Shapefile、KML、KMZ
    let dataset = if path_lower.ends_with(".shp") 
        || path_lower.ends_with(".kml") 
        || path_lower.ends_with(".kmz") {
        open_vector_with_encoding(path)?
    } else {
        Dataset::open(path)
            .map_err(|e| AppError::FileReadError(format!("无法打开文件: {}", e)))?
    };
    
    let mut layer = dataset.layer(0)
        .map_err(|e| AppError::FileReadError(format!("无法读取图层: {}", e)))?;
    
    let offset = offset.unwrap_or(0);
    let limit = limit.unwrap_or(usize::MAX);
    
    // 检测坐标系并创建转换器 - 转换到 WGS84
    let source_srs = layer.spatial_ref();
    let needs_transform = if let Some(ref srs) = source_srs {
        let epsg_code = srs.auth_code().unwrap_or_default();
        // 如果不是 WGS84 或 CGCS2000，需要转换
        epsg_code != 4326 && epsg_code != 4490
    } else {
        false  // 假定已经是 WGS84
    };
    
    let transform = if needs_transform {
        // 使用WKT定义WGS84，避免依赖EPSG数据库
        const WGS84_WKT: &str = r#"GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]"#;
        
        let mut target_srs = SpatialRef::from_wkt(WGS84_WKT)
            .map_err(|e| AppError::InvalidFormat(format!("创建WGS84坐标系失败: {}", e)))?;
        
        // 设置轴映射为传统 GIS 顺序 (经度, 纬度)
        target_srs.set_axis_mapping_strategy(gdal::spatial_ref::AxisMappingStrategy::TraditionalGisOrder);
        
        let mut source = match source_srs {
            Some(s) => s,
            None => SpatialRef::from_wkt(WGS84_WKT)
                .map_err(|e| AppError::InvalidFormat(format!("创建默认WGS84坐标系失败: {}", e)))?
        };
        source.set_axis_mapping_strategy(gdal::spatial_ref::AxisMappingStrategy::TraditionalGisOrder);
        
        Some(gdal::spatial_ref::CoordTransform::new(&source, &target_srs)
            .map_err(|e| AppError::InvalidFormat(format!("创建坐标转换失败: {}", e)))?)
    } else {
        None
    };
    
    let mut features = Vec::new();
    
    for (idx, feature) in layer.features().enumerate() {
        if idx < offset {
            continue;
        }
        if idx >= offset + limit {
            break;
        }
        
        // 获取几何并转换
        let geometry = if let Some(geom) = feature.geometry() {
            // 克隆几何对象以便修改
            let mut geom_owned = geom.clone();
            
            // 如果需要转换，执行坐标转换
            if let Some(ref trans) = transform {
                geom_owned.transform_inplace(trans)
                    .map_err(|e| AppError::InvalidFormat(format!("坐标转换失败: {}", e)))?;
            }
            
            let geojson = geom_owned.json()
                .map_err(|e| AppError::InvalidFormat(format!("几何转换失败: {}", e)))?;
            
            let geojson_value: serde_json::Value = serde_json::from_str(&geojson)
                .map_err(|e| AppError::InvalidFormat(format!("JSON解析失败: {}", e)))?;
            
            Geometry {
                geom_type: geojson_value["type"].as_str().unwrap_or("Unknown").to_string(),
                coordinates: geojson_value["coordinates"].clone(),
            }
        } else {
            Geometry {
                geom_type: "Null".to_string(),
                coordinates: serde_json::Value::Null,
            }
        };
        
        // 获取属性
        let mut properties = HashMap::new();
        let mut has_description = false;
        let mut description_content = String::new();
        
        for (field_name, field_value) in feature.fields() {
            let json_value = match field_value {
                Some(gdal::vector::FieldValue::StringValue(s)) => {
                    // 检测是否为KML的description字段
                    if field_name.to_lowercase() == "description" && (path_lower.ends_with(".kml") || path_lower.ends_with(".kmz")) {
                        has_description = true;
                        description_content = s.clone();
                    }
                    serde_json::Value::String(s.clone())
                },
                Some(gdal::vector::FieldValue::IntegerValue(i)) => serde_json::Value::Number(i.into()),
                Some(gdal::vector::FieldValue::Integer64Value(i)) => serde_json::Value::Number(i.into()),
                Some(gdal::vector::FieldValue::RealValue(r)) => {
                    serde_json::Number::from_f64(r)
                        .map(serde_json::Value::Number)
                        .unwrap_or(serde_json::Value::Null)
                },
                Some(gdal::vector::FieldValue::DateValue(d)) => serde_json::Value::String(format!("{:?}", d)),
                Some(gdal::vector::FieldValue::DateTimeValue(dt)) => serde_json::Value::String(format!("{:?}", dt)),
                _ => serde_json::Value::Null,
            };
            properties.insert(field_name.clone(), json_value);
        }
        
        // 如果是KML且有description字段，解析并合并属性
        if has_description && !description_content.is_empty() {
            let parsed_props = parse_kml_description(&description_content);
            log::info!("解析KML description字段，提取了 {} 个属性", parsed_props.len());
            // 将解析出的属性合并到properties中
            for (key, value) in parsed_props {
                properties.insert(key, value);
            }
        }
        
        features.push(Feature {
            id: feature.fid().unwrap_or(idx as u64).to_string(),
            geometry,
            properties,
        });
    }
    
    Ok(features)
}

/// 读取为GeoJSON格式，自动转换到 WGS84 (EPSG:4326)
pub async fn read_vector_as_geojson(path: &str) -> Result<serde_json::Value> {
    let path_lower = path.to_lowercase();
    
    // 使用智能编码打开 Shapefile、KML、KMZ
    let dataset = if path_lower.ends_with(".shp") 
        || path_lower.ends_with(".kml") 
        || path_lower.ends_with(".kmz") {
        open_vector_with_encoding(path)?
    } else {
        Dataset::open(path)
            .map_err(|e| AppError::FileReadError(format!("无法打开文件: {}", e)))?
    };
    
    let mut layer = dataset.layer(0)
        .map_err(|e| AppError::FileReadError(format!("无法读取图层: {}", e)))?;
    
    // 检测源坐标系
    let source_srs = layer.spatial_ref();
    let needs_transform = if let Some(ref srs) = source_srs {
        // 获取 EPSG 代码
        let epsg_code = srs.auth_code().unwrap_or_default();
        log::info!("源坐标系 EPSG: {}", epsg_code);
        
        // 如果不是 WGS84 或 CGCS2000，需要转换
        epsg_code != 4326 && epsg_code != 4490
    } else {
        log::warn!("未检测到坐标系，假定为 WGS84");
        false // 假定已经是 WGS84
    };
    
    log::info!("是否需要坐标转换到 WGS84: {}", needs_transform);
    
    // 创建坐标转换器 - 转换到 WGS84
    let transform = if needs_transform {
        // 使用WKT定义WGS84，避免依赖EPSG数据库
        const WGS84_WKT: &str = r#"GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]"#;
        
        let mut target_srs = SpatialRef::from_wkt(WGS84_WKT)
            .map_err(|e| AppError::InvalidFormat(format!("创建WGS84坐标系失败: {}", e)))?;
        
        // 设置轴映射为传统 GIS 顺序 (经度, 纬度)
        target_srs.set_axis_mapping_strategy(gdal::spatial_ref::AxisMappingStrategy::TraditionalGisOrder);
        
        let mut source = match source_srs {
            Some(s) => s,
            None => SpatialRef::from_wkt(WGS84_WKT)
                .map_err(|e| AppError::InvalidFormat(format!("创建默认WGS84坐标系失败: {}", e)))?
        };
        source.set_axis_mapping_strategy(gdal::spatial_ref::AxisMappingStrategy::TraditionalGisOrder);
        
        Some(gdal::spatial_ref::CoordTransform::new(&source, &target_srs)
            .map_err(|e| AppError::InvalidFormat(format!("创建坐标转换失败: {}", e)))?)
    } else {
        None
    };
    
    // 读取并转换要素
    let mut geojson_features = Vec::new();
    
    for feature in layer.features() {
        // 获取几何并转换
        let geometry = if let Some(geom) = feature.geometry() {
            // 克隆几何对象以便修改
            let mut geom_owned = geom.clone();
            
            // 如果需要转换，执行坐标转换
            if let Some(ref trans) = transform {
                geom_owned.transform_inplace(trans)
                    .map_err(|e| AppError::InvalidFormat(format!("坐标转换失败: {}", e)))?;
            }
            
            let geojson = geom_owned.json()
                .map_err(|e| AppError::InvalidFormat(format!("几何转换失败: {}", e)))?;
            
            let geojson_value: serde_json::Value = serde_json::from_str(&geojson)
                .map_err(|e| AppError::InvalidFormat(format!("JSON解析失败: {}", e)))?;
            
            geojson_value
        } else {
            serde_json::json!(null)
        };
        
        // 获取属性
        let mut properties = serde_json::Map::new();
        let mut has_description = false;
        let mut description_content = String::new();
        
        for (field_name, field_value) in feature.fields() {
            let json_value = match field_value {
                Some(gdal::vector::FieldValue::StringValue(s)) => {
                    // 检测是否为KML的description字段
                    if field_name.to_lowercase() == "description" && (path_lower.ends_with(".kml") || path_lower.ends_with(".kmz")) {
                        has_description = true;
                        description_content = s.clone();
                    }
                    serde_json::Value::String(s.clone())
                },
                Some(gdal::vector::FieldValue::IntegerValue(i)) => serde_json::Value::Number(i.into()),
                Some(gdal::vector::FieldValue::Integer64Value(i)) => serde_json::Value::Number(i.into()),
                Some(gdal::vector::FieldValue::RealValue(r)) => {
                    serde_json::Number::from_f64(r)
                        .map(serde_json::Value::Number)
                        .unwrap_or(serde_json::Value::Null)
                },
                Some(gdal::vector::FieldValue::DateValue(d)) => serde_json::Value::String(format!("{:?}", d)),
                Some(gdal::vector::FieldValue::DateTimeValue(dt)) => serde_json::Value::String(format!("{:?}", dt)),
                _ => serde_json::Value::Null,
            };
            properties.insert(field_name.clone(), json_value);
        }
        
        // 如果是KML且有description字段，解析并合并属性
        if has_description && !description_content.is_empty() {
            let parsed_props = parse_kml_description(&description_content);
            log::info!("解析KML description字段，提取了 {} 个属性", parsed_props.len());
            // 将解析出的属性合并到properties中
            for (key, value) in parsed_props {
                properties.insert(key, value);
            }
        }
        
        geojson_features.push(serde_json::json!({
            "type": "Feature",
            "id": feature.fid().unwrap_or(0),
            "properties": properties,
            "geometry": geometry
        }));
    }
    
    Ok(serde_json::json!({
        "type": "FeatureCollection",
        "features": geojson_features
    }))
}

/// 坐标转换
pub async fn transform_coordinates(
    from_srs: &str,
    to_srs: &str,
    coordinates: Vec<(f64, f64)>
) -> Result<Vec<(f64, f64)>> {
    let source = SpatialRef::from_definition(from_srs)
        .map_err(|e| AppError::InvalidFormat(format!("源坐标系无效: {}", e)))?;
    
    let target = SpatialRef::from_definition(to_srs)
        .map_err(|e| AppError::InvalidFormat(format!("目标坐标系无效: {}", e)))?;
    
    let transform = gdal::spatial_ref::CoordTransform::new(&source, &target)
        .map_err(|e| AppError::InvalidFormat(format!("创建坐标转换失败: {}", e)))?;
    
    let mut x_coords: Vec<f64> = coordinates.iter().map(|(x, _)| *x).collect();
    let mut y_coords: Vec<f64> = coordinates.iter().map(|(_, y)| *y).collect();
    let mut z_coords: Vec<f64> = vec![0.0; coordinates.len()];
    
    transform.transform_coords(&mut x_coords, &mut y_coords, &mut z_coords)
        .map_err(|e| AppError::InvalidFormat(format!("坐标转换失败: {}", e)))?;
    
    let result = x_coords.iter()
        .zip(y_coords.iter())
        .map(|(x, y)| (*x, *y))
        .collect();
    
    Ok(result)
}

/// 获取支持的驱动列表
pub fn get_supported_drivers() -> Vec<String> {
    let mut drivers = Vec::new();
    let count = DriverManager::count();
    
    for i in 0..count {
        if let Ok(driver) = DriverManager::get_driver(i) {
            drivers.push(driver.long_name());
        }
    }
    
    drivers
}

/// 获取GDAL版本信息
pub fn get_gdal_version() -> String {
    gdal::version::version_info("RELEASE_NAME")
}

/// 查找ogr2ogr可执行文件
fn find_ogr2ogr() -> Option<std::path::PathBuf> {
    use std::env;
    
    log::info!("开始查找ogr2ogr可执行文件...");
    
    // 1. 尝试应用程序目录（开发环境）
    if let Ok(exe_path) = env::current_exe() {
        if let Some(app_dir) = exe_path.parent() {
            let app_ogr2ogr = app_dir.join("ogr2ogr.exe");
            log::info!("检查应用目录: {:?}", app_ogr2ogr);
            if app_ogr2ogr.exists() {
                log::info!("✓ 找到ogr2ogr (应用目录): {:?}", app_ogr2ogr);
                return Some(app_ogr2ogr);
            }
            
            // 2. 尝试应用程序目录下的gdal-tools子目录（打包环境）
            let tools_ogr2ogr = app_dir.join("gdal-tools").join("ogr2ogr.exe");
            log::info!("检查gdal-tools子目录: {:?}", tools_ogr2ogr);
            if tools_ogr2ogr.exists() {
                log::info!("✓ 找到ogr2ogr (gdal-tools): {:?}", tools_ogr2ogr);
                return Some(tools_ogr2ogr);
            }
        }
    }
    
    // 3. 尝试PATH环境变量
    if let Ok(path_var) = env::var("PATH") {
        log::info!("在PATH中查找ogr2ogr...");
        for path_dir in env::split_paths(&path_var) {
            let candidate = path_dir.join("ogr2ogr.exe");
            if candidate.exists() {
                log::info!("✓ 找到ogr2ogr (PATH): {:?}", candidate);
                return Some(candidate);
            }
        }
    }
    
    log::error!("✗ 未找到ogr2ogr可执行文件");
    log::error!("  请确保ogr2ogr.exe在以下位置之一:");
    log::error!("  1. 应用程序目录或其gdal-tools子目录");
    log::error!("  2. PATH环境变量中");
    None
}

/// 导出矢量数据到指定格式
/// 支持的格式: KML, KMZ, GeoJSON, Shapefile等
/// 使用ogr2ogr方式转换以确保字段值正确导出
/// layer_index: 可选的图层索引，用于导出多图层文件（如KML）的特定子图层
pub async fn export_vector(
    input_path: &str,
    output_path: &str,
    format: &str,
    layer_index: Option<usize>,
) -> Result<()> {
    use std::process::Command;
    
    if let Some(idx) = layer_index {
        log::info!("开始导出图层{}: {} -> {} (格式: {})", idx, input_path, output_path, format);
    } else {
        log::info!("开始导出: {} -> {} (格式: {})", input_path, output_path, format);
    }
    
    // 查找ogr2ogr
    let ogr2ogr_path = find_ogr2ogr()
        .ok_or_else(|| AppError::FileWriteError(
            "未找到ogr2ogr工具。请确保GDAL已正确安装".to_string()
        ))?;
    
    log::info!("使用ogr2ogr: {:?}", ogr2ogr_path);
    
    // 确定GDAL格式名称
    let gdal_format = match format.to_uppercase().as_str() {
        "KML" => "KML",
        "KMZ" => "LIBKML",
        "GEOJSON" => "GeoJSON",
        "SHAPEFILE" | "SHP" => "ESRI Shapefile",
        "GPKG" => "GPKG",
        _ => return Err(AppError::InvalidFormat(format!("不支持的导出格式: {}", format))),
    };
    
    log::info!("目标格式: {}", gdal_format);
    
    // 删除已存在的输出文件
    if std::path::Path::new(output_path).exists() {
        log::info!("删除已存在的输出文件: {}", output_path);
        let _ = std::fs::remove_file(output_path);
    }
    
    // 如果指定了图层索引，需要获取图层名称
    let layer_name = if let Some(idx) = layer_index {
        let dataset = Dataset::open(input_path)
            .map_err(|e| AppError::FileReadError(format!("无法打开输入文件: {}", e)))?;
        
        let layer = dataset.layer(idx)
            .map_err(|e| AppError::FileReadError(format!("无法访问图层索引{}: {}", idx, e)))?;
        
        let name = layer.name();
        log::info!("图层索引{}对应的图层名称: {}", idx, name);
        Some(name)
    } else {
        None
    };
    
    // 使用ogr2ogr命令行工具进行转换（保留所有字段）
    let mut cmd = Command::new(ogr2ogr_path);
    cmd.arg("-f")
        .arg(gdal_format)
        .arg(output_path)
        .arg(input_path);
    
    // 如果有图层名称，则只导出该图层
    if let Some(name) = layer_name {
        cmd.arg(name);
    }
    
    // Windows下隐藏控制台窗口，避免弹出黑框
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    
    let output = cmd.output();
    
    match output {
        Ok(result) => {
            if result.status.success() {
                log::info!("成功导出到: {}", output_path);
                Ok(())
            } else {
                let error_msg = String::from_utf8_lossy(&result.stderr);
                log::error!("ogr2ogr导出失败: {}", error_msg);
                Err(AppError::FileWriteError(format!("导出失败: {}", error_msg)))
            }
        },
        Err(e) => {
            log::error!("无法执行ogr2ogr命令: {}", e);
            Err(AppError::FileWriteError(format!("无法执行ogr2ogr: {}", e)))
        }
    }
}

/// 读取多图层矢量文件信息（用于KML、GDB等格式）
pub async fn read_multi_layer_vector_info(path: &str) -> Result<MultiLayerVectorInfo> {
    let path_lower = path.to_lowercase();
    
    // 使用智能编码打开文件
    let dataset = if path_lower.ends_with(".shp") 
        || path_lower.ends_with(".kml") 
        || path_lower.ends_with(".kmz") {
        open_vector_with_encoding(path)?
    } else {
        Dataset::open(path)
            .map_err(|e| AppError::FileReadError(format!("无法打开文件: {}", e)))?
    };
    
    let layer_count = dataset.layer_count();
    log::info!("检测到 {} 个图层", layer_count);
    
    let mut layers = Vec::new();
    
    // 获取文件级别的坐标系（从第一个图层）
    let file_projection = if layer_count > 0 {
        if let Ok(first_layer) = dataset.layer(0) {
            first_layer.spatial_ref()
                .as_ref()
                .map(|sr| sr.to_wkt().unwrap_or_default())
        } else {
            None
        }
    } else {
        None
    };
    
    // 遍历所有图层
    for i in 0..layer_count {
        if let Ok(mut layer) = dataset.layer(i) {
            let layer_name = layer.name();
            let feature_count = layer.feature_count() as usize;
            
            log::info!("处理图层 {}: {} (要素数: {})", i, layer_name, feature_count);
            
            // 获取空间参考
            let spatial_ref = layer.spatial_ref();
            
            // 获取范围
            let envelope = match layer.get_extent() {
                Ok(env) => env,
                Err(e) => {
                    log::warn!("无法获取图层 {} 的范围: {}", layer_name, e);
                    continue;
                }
            };
            
            // 检测是否需要转换范围到 WGS84
            let needs_transform = if let Some(ref srs) = spatial_ref {
                let epsg_code = srs.auth_code().unwrap_or_default();
                epsg_code != 4326 && epsg_code != 4490
            } else {
                false
            };
            
            // 转换范围到 WGS84
            let extent = if needs_transform {
                const WGS84_WKT: &str = r#"GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]"#;
                
                let mut target_srs = SpatialRef::from_wkt(WGS84_WKT)
                    .map_err(|e| AppError::InvalidFormat(format!("创建WGS84坐标系失败: {}", e)))?;
                target_srs.set_axis_mapping_strategy(gdal::spatial_ref::AxisMappingStrategy::TraditionalGisOrder);
                
                let mut source = match spatial_ref {
                    Some(s) => s,
                    None => SpatialRef::from_wkt(WGS84_WKT)
                        .map_err(|e| AppError::InvalidFormat(format!("创建默认WGS84坐标系失败: {}", e)))?
                };
                source.set_axis_mapping_strategy(gdal::spatial_ref::AxisMappingStrategy::TraditionalGisOrder);
                
                let transform = gdal::spatial_ref::CoordTransform::new(&source, &target_srs)
                    .map_err(|e| AppError::InvalidFormat(format!("创建坐标转换失败: {}", e)))?;
                
                let mut xs = vec![envelope.MinX, envelope.MaxX, envelope.MinX, envelope.MaxX];
                let mut ys = vec![envelope.MinY, envelope.MinY, envelope.MaxY, envelope.MaxY];
                let mut zs = vec![0.0; 4];
                
                transform.transform_coords(&mut xs, &mut ys, &mut zs)
                    .map_err(|e| AppError::InvalidFormat(format!("范围坐标转换失败: {}", e)))?;
                
                let min_x = xs.iter().cloned().fold(f64::INFINITY, f64::min);
                let max_x = xs.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
                let min_y = ys.iter().cloned().fold(f64::INFINITY, f64::min);
                let max_y = ys.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
                
                Extent { min_x, min_y, max_x, max_y }
            } else {
                Extent {
                    min_x: envelope.MinX,
                    min_y: envelope.MinY,
                    max_x: envelope.MaxX,
                    max_y: envelope.MaxY,
                }
            };
            
            // 获取字段信息
            let layer_defn = layer.defn();
            let mut fields = Vec::new();
            for field in layer_defn.fields() {
                fields.push(AttributeField {
                    name: field.name(),
                    field_type: format!("{:?}", field.field_type()),
                    alias: None,
                    editable: false,
                    visible: true,
                });
            }
            
            // 获取几何类型
            let mut geometry_type = "Unknown".to_string();
            if let Some(feature) = layer.features().next() {
                if let Some(geom) = feature.geometry() {
                    geometry_type = format!("{:?}", geom.geometry_type());
                }
            }
            
            layers.push(LayerInfo {
                name: layer_name,
                index: i,
                feature_count,
                geometry_type,
                fields,
                extent,
            });
        }
    }
    
    Ok(MultiLayerVectorInfo {
        path: path.to_string(),
        layer_count,
        layers,
        projection: file_projection,
    })
}

/// 读取指定图层的GeoJSON数据
pub async fn read_layer_as_geojson(path: &str, layer_index: usize) -> Result<serde_json::Value> {
    let path_lower = path.to_lowercase();
    
    // 使用智能编码打开文件
    let dataset = if path_lower.ends_with(".shp") 
        || path_lower.ends_with(".kml") 
        || path_lower.ends_with(".kmz") {
        open_vector_with_encoding(path)?
    } else {
        Dataset::open(path)
            .map_err(|e| AppError::FileReadError(format!("无法打开文件: {}", e)))?
    };
    
    let mut layer = dataset.layer(layer_index)
        .map_err(|e| AppError::FileReadError(format!("无法读取图层 {}: {}", layer_index, e)))?;
    
    // 检测源坐标系
    let source_srs = layer.spatial_ref();
    let needs_transform = if let Some(ref srs) = source_srs {
        let epsg_code = srs.auth_code().unwrap_or_default();
        epsg_code != 4326 && epsg_code != 4490
    } else {
        false
    };
    
    // 创建坐标转换器
    let transform = if needs_transform {
        const WGS84_WKT: &str = r#"GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]"#;
        
        let mut target_srs = SpatialRef::from_wkt(WGS84_WKT)
            .map_err(|e| AppError::InvalidFormat(format!("创建WGS84坐标系失败: {}", e)))?;
        target_srs.set_axis_mapping_strategy(gdal::spatial_ref::AxisMappingStrategy::TraditionalGisOrder);
        
        let mut source = match source_srs {
            Some(s) => s,
            None => SpatialRef::from_wkt(WGS84_WKT)
                .map_err(|e| AppError::InvalidFormat(format!("创建默认WGS84坐标系失败: {}", e)))?
        };
        source.set_axis_mapping_strategy(gdal::spatial_ref::AxisMappingStrategy::TraditionalGisOrder);
        
        Some(gdal::spatial_ref::CoordTransform::new(&source, &target_srs)
            .map_err(|e| AppError::InvalidFormat(format!("创建坐标转换失败: {}", e)))?)
    } else {
        None
    };
    
    // 读取并转换要素
    let mut geojson_features = Vec::new();
    
    for feature in layer.features() {
        // 获取几何并转换
        let geometry = if let Some(geom) = feature.geometry() {
            let mut geom_owned = geom.clone();
            
            if let Some(ref trans) = transform {
                geom_owned.transform_inplace(trans)
                    .map_err(|e| AppError::InvalidFormat(format!("坐标转换失败: {}", e)))?;
            }
            
            let geojson = geom_owned.json()
                .map_err(|e| AppError::InvalidFormat(format!("几何转换失败: {}", e)))?;
            
            let geojson_value: serde_json::Value = serde_json::from_str(&geojson)
                .map_err(|e| AppError::InvalidFormat(format!("JSON解析失败: {}", e)))?;
            
            geojson_value
        } else {
            serde_json::json!(null)
        };
        
        // 获取属性
        let mut properties = serde_json::Map::new();
        let mut has_description = false;
        let mut description_content = String::new();
        
        for (field_name, field_value) in feature.fields() {
            let json_value = match field_value {
                Some(gdal::vector::FieldValue::StringValue(s)) => {
                    if field_name.to_lowercase() == "description" && (path_lower.ends_with(".kml") || path_lower.ends_with(".kmz")) {
                        has_description = true;
                        description_content = s.clone();
                    }
                    serde_json::Value::String(s.clone())
                },
                Some(gdal::vector::FieldValue::IntegerValue(i)) => serde_json::Value::Number(i.into()),
                Some(gdal::vector::FieldValue::Integer64Value(i)) => serde_json::Value::Number(i.into()),
                Some(gdal::vector::FieldValue::RealValue(r)) => {
                    serde_json::Number::from_f64(r)
                        .map(serde_json::Value::Number)
                        .unwrap_or(serde_json::Value::Null)
                },
                Some(gdal::vector::FieldValue::DateValue(d)) => serde_json::Value::String(format!("{:?}", d)),
                Some(gdal::vector::FieldValue::DateTimeValue(dt)) => serde_json::Value::String(format!("{:?}", dt)),
                _ => serde_json::Value::Null,
            };
            properties.insert(field_name.clone(), json_value);
        }
        
        // 解析KML的description字段
        if has_description && !description_content.is_empty() {
            let parsed_props = parse_kml_description(&description_content);
            for (key, value) in parsed_props {
                properties.insert(key, value);
            }
        }
        
        geojson_features.push(serde_json::json!({
            "type": "Feature",
            "id": feature.fid().unwrap_or(0),
            "properties": properties,
            "geometry": geometry
        }));
    }
    
    Ok(serde_json::json!({
        "type": "FeatureCollection",
        "features": geojson_features
    }))
}
