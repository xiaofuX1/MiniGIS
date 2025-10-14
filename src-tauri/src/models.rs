use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: Option<String>,
    pub layers: Vec<Layer>,
    pub map_config: MapConfig,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Layer {
    pub id: String,
    pub name: String,
    pub layer_type: LayerType,
    pub source: LayerSource,
    pub visible: bool,
    pub opacity: f32,
    pub style: LayerStyle,
    pub extent: Option<Extent>,
    pub attributes: Option<Vec<AttributeField>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LayerType {
    Vector,
    Raster,
    Basemap,
    WMS,
    WFS,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayerSource {
    pub source_type: SourceType,
    pub path: Option<String>,
    pub url: Option<String>,
    pub params: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SourceType {
    Shapefile,
    GeoJson,
    PostGIS,
    WMS,
    XYZ,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayerStyle {
    pub fill_color: Option<String>,
    pub stroke_color: Option<String>,
    pub stroke_width: Option<f32>,
    pub point_size: Option<f32>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Extent {
    pub min_x: f64,
    pub min_y: f64,
    pub max_x: f64,
    pub max_y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttributeField {
    pub name: String,
    pub field_type: String,
    pub alias: Option<String>,
    pub editable: bool,
    pub visible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapConfig {
    pub center: [f64; 2],
    pub zoom: u32,
    pub projection: String,
    pub basemap_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Feature {
    pub id: String,
    pub geometry: Geometry,
    pub properties: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Geometry {
    #[serde(rename = "type")]
    pub geom_type: String,
    pub coordinates: serde_json::Value,
}

// 矢量文件信息（由 GDAL 提供）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorInfo {
    pub path: String,
    pub feature_count: usize,
    pub geometry_type: String,
    pub fields: Vec<AttributeField>,
    pub extent: Extent,
    pub projection: Option<String>,
}

// 向后兼容的别名
pub type ShapefileInfo = VectorInfo;
