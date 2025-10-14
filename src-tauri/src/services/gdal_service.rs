use crate::errors::{AppError, Result};
use crate::models::{Extent, Feature, Geometry, VectorInfo, AttributeField};
use gdal::Dataset;
use gdal::spatial_ref::SpatialRef;
use gdal::vector::LayerAccess;
use gdal::DriverManager;
use std::collections::HashMap;

/// 使用GDAL读取矢量文件信息
pub async fn read_vector_info(path: &str) -> Result<VectorInfo> {
    // 尝试使用 GBK 编码打开（适用于中国 Shapefile）
    let dataset = if path.to_lowercase().ends_with(".shp") {
        // 对于 Shapefile，尝试使用 GBK 编码
        match Dataset::open_ex(
            path,
            gdal::DatasetOptions {
                open_flags: gdal::GdalOpenFlags::GDAL_OF_VECTOR | gdal::GdalOpenFlags::GDAL_OF_READONLY,
                open_options: Some(&["ENCODING=GBK"]),
                ..Default::default()
            },
        ) {
            Ok(ds) => ds,
            Err(_) => {
                // GBK 失败，尝试 UTF-8
                Dataset::open(path)
                    .map_err(|e| AppError::FileReadError(format!("无法打开文件: {}", e)))?
            }
        }
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
        
        let mut source = spatial_ref.unwrap_or_else(|| {
            SpatialRef::from_wkt(WGS84_WKT).expect("创建默认 WGS84 坐标系")
        });
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
    // 尝试使用 GBK 编码打开（适用于中国 Shapefile）
    let dataset = if path.to_lowercase().ends_with(".shp") {
        match Dataset::open_ex(
            path,
            gdal::DatasetOptions {
                open_flags: gdal::GdalOpenFlags::GDAL_OF_VECTOR | gdal::GdalOpenFlags::GDAL_OF_READONLY,
                open_options: Some(&["ENCODING=GBK"]),
                ..Default::default()
            },
        ) {
            Ok(ds) => ds,
            Err(_) => {
                Dataset::open(path)
                    .map_err(|e| AppError::FileReadError(format!("无法打开文件: {}", e)))?
            }
        }
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
    let dataset = Dataset::open(path)
        .map_err(|e| AppError::FileReadError(format!("无法打开文件: {}", e)))?;
    
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
        for (field_name, field_value) in feature.fields() {
            let json_value = match field_value {
                Some(gdal::vector::FieldValue::StringValue(s)) => serde_json::Value::String(s.clone()),
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
    // 尝试使用 GBK 编码打开（适用于中国 Shapefile）
    let dataset = if path.to_lowercase().ends_with(".shp") {
        match Dataset::open_ex(
            path,
            gdal::DatasetOptions {
                open_flags: gdal::GdalOpenFlags::GDAL_OF_VECTOR | gdal::GdalOpenFlags::GDAL_OF_READONLY,
                open_options: Some(&["ENCODING=GBK"]),
                ..Default::default()
            },
        ) {
            Ok(ds) => ds,
            Err(_) => {
                Dataset::open(path)
                    .map_err(|e| AppError::FileReadError(format!("无法打开文件: {}", e)))?
            }
        }
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
        
        let mut source = source_srs.unwrap_or_else(|| {
            SpatialRef::from_wkt(WGS84_WKT).expect("创建默认 WGS84 坐标系")
        });
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
        for (field_name, field_value) in feature.fields() {
            let json_value = match field_value {
                Some(gdal::vector::FieldValue::StringValue(s)) => serde_json::Value::String(s.clone()),
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
    // 尝试使用 GBK 编码打开（适用于中国 Shapefile）
    let dataset = if path.to_lowercase().ends_with(".shp") {
        match Dataset::open_ex(
            path,
            gdal::DatasetOptions {
                open_flags: gdal::GdalOpenFlags::GDAL_OF_VECTOR | gdal::GdalOpenFlags::GDAL_OF_READONLY,
                open_options: Some(&["ENCODING=GBK"]),
                ..Default::default()
            },
        ) {
            Ok(ds) => ds,
            Err(_) => {
                Dataset::open(path)
                    .map_err(|e| AppError::FileReadError(format!("无法打开文件: {}", e)))?
            }
        }
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
        
        let mut source = source_srs.unwrap_or_else(|| {
            SpatialRef::from_wkt(WGS84_WKT).expect("创建默认 WGS84 坐标系")
        });
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
        for (field_name, field_value) in feature.fields() {
            let json_value = match field_value {
                Some(gdal::vector::FieldValue::StringValue(s)) => serde_json::Value::String(s.clone()),
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
