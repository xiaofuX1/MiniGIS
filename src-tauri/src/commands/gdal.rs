use crate::errors::Result;
use crate::models::{VectorInfo, MultiLayerVectorInfo};
use crate::services::gdal_service;

/// 使用GDAL打开矢量文件
#[tauri::command]
pub async fn gdal_open_vector(path: String) -> Result<VectorInfo> {
    log::info!("使用GDAL打开矢量文件: {}", path);
    gdal_service::read_vector_info(&path).await
}

/// 使用GDAL读取属性表
#[tauri::command]
pub async fn gdal_get_attribute_table(
    path: String,
    offset: Option<usize>,
    limit: Option<usize>
) -> Result<serde_json::Value> {
    log::info!("使用GDAL读取属性表: {} (offset={:?}, limit={:?})", path, offset, limit);
    
    // 先获取总数
    let total = gdal_service::get_feature_count(&path).await?;
    log::info!("要素总数: {}", total);
    
    // 读取指定范围的要素（包含几何信息）
    let features = gdal_service::read_vector_features_with_geometry(&path, offset, limit).await?;
    
    // 转换为属性表格式
    let rows: Vec<serde_json::Value> = features
        .into_iter()
        .map(|f| {
            serde_json::json!({
                "id": f.id,
                "properties": f.properties,
                "geometry": {
                    "type": f.geometry.geom_type,
                    "coordinates": f.geometry.coordinates
                }
            })
        })
        .collect();
    
    Ok(serde_json::json!({
        "features": rows,
        "total": total
    }))
}

/// 使用GDAL读取GeoJSON
#[tauri::command]
pub async fn gdal_get_geojson(path: String) -> Result<serde_json::Value> {
    log::info!("使用GDAL读取GeoJSON: {}", path);
    gdal_service::read_vector_as_geojson(&path).await
}

/// 坐标转换
#[tauri::command]
pub async fn gdal_transform_coordinates(
    from_srs: String,
    to_srs: String,
    coordinates: Vec<(f64, f64)>
) -> Result<Vec<(f64, f64)>> {
    log::info!("坐标转换: {} -> {}", from_srs, to_srs);
    gdal_service::transform_coordinates(&from_srs, &to_srs, coordinates).await
}

/// 获取支持的格式
#[tauri::command]
pub fn gdal_get_drivers() -> Result<Vec<String>> {
    log::info!("获取GDAL支持的驱动");
    Ok(gdal_service::get_supported_drivers())
}

/// 获取GDAL版本
#[tauri::command]
pub fn gdal_get_version() -> Result<String> {
    Ok(gdal_service::get_gdal_version())
}

/// GDAL诊断信息
#[tauri::command]
pub fn gdal_diagnose() -> Result<serde_json::Value> {
    use std::env;
    use std::path::Path;
    
    let gdal_data = env::var("GDAL_DATA").unwrap_or_else(|_| "未设置".to_string());
    let proj_lib = env::var("PROJ_LIB").unwrap_or_else(|_| "未设置".to_string());
    let proj_data = env::var("PROJ_DATA").unwrap_or_else(|_| "未设置".to_string());
    let driver_count = gdal::DriverManager::count();
    
    // 检查proj.db是否存在
    let proj_db_path = if proj_lib != "未设置" {
        format!("{}\\proj.db", proj_lib)
    } else {
        "N/A".to_string()
    };
    let proj_db_exists = Path::new(&proj_db_path).exists();
    
    log::info!("GDAL诊断信息:");
    log::info!("  GDAL_DATA: {}", gdal_data);
    log::info!("  PROJ_LIB: {}", proj_lib);
    log::info!("  PROJ_DATA: {}", proj_data);
    log::info!("  proj.db存在: {}", proj_db_exists);
    log::info!("  驱动数量: {}", driver_count);
    
    Ok(serde_json::json!({
        "version": gdal_service::get_gdal_version(),
        "gdal_data": gdal_data,
        "proj_lib": proj_lib,
        "proj_data": proj_data,
        "proj_db_exists": proj_db_exists,
        "proj_db_path": proj_db_path,
        "driver_count": driver_count,
        "drivers": gdal_service::get_supported_drivers().into_iter().take(10).collect::<Vec<_>>()
    }))
}

/// 导出矢量数据
#[tauri::command]
pub async fn gdal_export_vector(
    input_path: String,
    output_path: String,
    format: String,
    layer_index: Option<usize>,
) -> Result<()> {
    if let Some(idx) = layer_index {
        log::info!("导出矢量数据 (图层索引: {}): {} -> {} (格式: {})", idx, input_path, output_path, format);
    } else {
        log::info!("导出矢量数据: {} -> {} (格式: {})", input_path, output_path, format);
    }
    gdal_service::export_vector(&input_path, &output_path, &format, layer_index).await
}

/// 读取多图层矢量文件信息（用于KML、GDB等格式）
#[tauri::command]
pub async fn gdal_open_multi_layer_vector(path: String) -> Result<MultiLayerVectorInfo> {
    log::info!("读取多图层矢量文件: {}", path);
    gdal_service::read_multi_layer_vector_info(&path).await
}

/// 读取指定图层的GeoJSON数据
#[tauri::command]
pub async fn gdal_get_layer_geojson(path: String, layer_index: usize) -> Result<serde_json::Value> {
    log::info!("读取图层 {} 的GeoJSON: {}", layer_index, path);
    gdal_service::read_layer_as_geojson(&path, layer_index).await
}
