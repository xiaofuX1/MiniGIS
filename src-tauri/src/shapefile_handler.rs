use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::path::Path;
use std::fs::File;
use std::io::BufReader;
use std::fs;
use shapefile::{Reader, ShapeType};
use geojson::{Feature, FeatureCollection, Geometry, Value as GeojsonValue};
use regex::Regex;
use encoding_rs::GBK;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShapefileInfo {
    pub filename: String,
    pub geometry_type: String,
    pub feature_count: usize,
    pub bounds: Vec<f64>,
    pub fields: Vec<FieldInfo>,
    pub crs: Option<String>,  // 坐标参考系统（WKT格式）
    pub epsg_code: Option<i32>,  // EPSG代码（如果能识别）
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FieldInfo {
    pub name: String,
    pub field_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AttributeData {
    pub features: Vec<FeatureAttributes>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FeatureAttributes {
    pub id: usize,
    pub properties: HashMap<String, String>,
}

pub struct ShapefileHandler;

impl ShapefileHandler {
    
    pub fn read_shapefile_info<P: AsRef<Path>>(path: P) -> Result<ShapefileInfo> {
        let path = path.as_ref();
        let reader = Reader::from_path(path)
            .context("无法读取Shapefile文件")?;
        
        let filename = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();
        
        let geometry_type = Self::shape_type_to_string(&reader.header().shape_type);
        let feature_count = reader.shape_count()
            .unwrap_or(0);
        
        let bbox = &reader.header().bbox;
        let bounds = vec![
            bbox.min.x,
            bbox.min.y,
            bbox.max.x,
            bbox.max.y,
        ];
        
        // 读取DBF字段信息
        // 使用dbase crate直接读取字段信息
        let dbf_path = path.with_extension("dbf");
        let fields = if dbf_path.exists() {
            let dbf_reader = shapefile::dbase::Reader::from_path(&dbf_path)?;
            dbf_reader.fields().iter()
                .map(|field| FieldInfo {
                    name: field.name().to_string(),
                    field_type: format!("{:?}", field.field_type()),
                })
                .collect()
        } else {
            Vec::new()
        };
        
        // 读取.prj文件获取坐标系信息
        let prj_path = path.with_extension("prj");
        let (crs, epsg_code) = if prj_path.exists() {
            let prj_content = fs::read_to_string(&prj_path).ok();
            let epsg = prj_content.as_ref().and_then(|wkt| Self::extract_epsg_from_wkt(wkt));
            (prj_content, epsg)
        } else {
            (None, None)
        };
        
        Ok(ShapefileInfo {
            filename,
            geometry_type,
            feature_count,
            bounds,
            fields,
            crs,
            epsg_code,
        })
    }
    
    pub fn read_attributes<P: AsRef<Path>>(path: P) -> Result<AttributeData> {
        let path = path.as_ref();
        let dbf_path = path.with_extension("dbf");
        
        if !dbf_path.exists() {
            return Ok(AttributeData { features: Vec::new() });
        }
        
        // 使用GBK编码读取DBF文件
        let encoding = shapefile::dbase::encoding::EncodingRs::from(GBK);
        let mut dbf_reader = shapefile::dbase::Reader::from_path_with_encoding(&dbf_path, encoding)
            .context("无法读取DBF文件")?;
        
        let mut features = Vec::new();
        
        // 遍历所有记录
        for (id, record_result) in dbf_reader.iter_records().enumerate() {
            if let Ok(record) = record_result {
                let mut properties = HashMap::new();
                
                // 遍历每个字段
                for (field_name, field_value) in record.into_iter() {
                    let value_str = match field_value {
                        shapefile::dbase::FieldValue::Character(Some(s)) => s,
                        shapefile::dbase::FieldValue::Numeric(Some(n)) => n.to_string(),
                        shapefile::dbase::FieldValue::Logical(Some(b)) => b.to_string(),
                        shapefile::dbase::FieldValue::Date(Some(d)) => format!("{:?}", d),
                        shapefile::dbase::FieldValue::Float(Some(f)) => f.to_string(),
                        shapefile::dbase::FieldValue::Integer(i) => i.to_string(),
                        _ => "NULL".to_string(),
                    };
                    properties.insert(field_name, value_str);
                }
                
                features.push(FeatureAttributes {
                    id,
                    properties,
                });
            }
        }
        
        Ok(AttributeData { features })
    }
    
    pub fn shapefile_to_geojson<P: AsRef<Path>>(path: P) -> Result<String> {
        let path = path.as_ref();
        
        // 分别创建shape reader和dbase reader
        let shp_file = File::open(path).context("无法打开.shp文件")?;
        let shp_reader = shapefile::ShapeReader::new(BufReader::new(shp_file))?;
        
        let dbf_path = path.with_extension("dbf");
        let encoding = shapefile::dbase::encoding::EncodingRs::from(GBK);
        let dbf_file = File::open(&dbf_path).context("无法打开.dbf文件")?;
        let dbf_reader = shapefile::dbase::Reader::new_with_encoding(BufReader::new(dbf_file), encoding)?;
        
        // 组合创建Reader
        let mut reader = Reader::new(shp_reader, dbf_reader);
        
        let mut features = Vec::new();
        
        // 遍历所有要素
        for (id, shape_record) in reader.iter_shapes_and_records().enumerate() {
            if let Ok((shape, record)) = shape_record {
                // 转换属性
                let mut properties = serde_json::Map::new();
                properties.insert("_id".to_string(), json!(id));
                
                for (field_name, field_value) in record.into_iter() {
                    let value = match field_value {
                        shapefile::dbase::FieldValue::Character(Some(s)) => json!(s),
                        shapefile::dbase::FieldValue::Numeric(Some(n)) => json!(n),
                        shapefile::dbase::FieldValue::Logical(Some(b)) => json!(b),
                        shapefile::dbase::FieldValue::Date(Some(d)) => json!(format!("{:?}", d)),
                        shapefile::dbase::FieldValue::Float(Some(f)) => json!(f),
                        shapefile::dbase::FieldValue::Integer(i) => json!(i),
                        _ => json!(null),
                    };
                    properties.insert(field_name, value);
                }
                
                // 转换几何对象
                if let Some(geometry) = Self::shape_to_geojson_geometry(&shape) {
                    let feature = Feature {
                        bbox: None,
                        geometry: Some(geometry),
                        id: Some(geojson::feature::Id::Number(id.into())),
                        properties: Some(properties),
                        foreign_members: None,
                    };
                    features.push(feature);
                }
            }
        }
        
        let collection = FeatureCollection {
            bbox: None,
            features,
            foreign_members: None,
        };
        
        Ok(collection.to_string())
    }
    
    fn shape_type_to_string(shape_type: &ShapeType) -> String {
        match shape_type {
            ShapeType::Point => "Point",
            ShapeType::PointZ => "PointZ",
            ShapeType::PointM => "PointM",
            ShapeType::Polyline => "LineString",
            ShapeType::PolylineZ => "LineStringZ",
            ShapeType::PolylineM => "LineStringM",
            ShapeType::Polygon => "Polygon",
            ShapeType::PolygonZ => "PolygonZ",
            ShapeType::PolygonM => "PolygonM",
            ShapeType::Multipoint => "MultiPoint",
            ShapeType::MultipointZ => "MultiPointZ",
            ShapeType::MultipointM => "MultiPointM",
            ShapeType::NullShape => "Null",
            _ => "Unknown",
        }.to_string()
    }
    
    fn shape_to_geojson_geometry(shape: &shapefile::Shape) -> Option<Geometry> {
        match shape {
            shapefile::Shape::Point(point) => {
                Some(Geometry::new(GeojsonValue::Point(vec![point.x, point.y])))
            }
            shapefile::Shape::PointZ(point) => {
                Some(Geometry::new(GeojsonValue::Point(vec![point.x, point.y, point.z])))
            }
            shapefile::Shape::Polyline(polyline) => {
                let lines: Vec<Vec<Vec<f64>>> = polyline.parts()
                    .iter()
                    .map(|part| part.iter()
                        .map(|p| vec![p.x, p.y])
                        .collect())
                    .collect();
                
                if lines.len() == 1 {
                    Some(Geometry::new(GeojsonValue::LineString(lines.into_iter().next().unwrap())))
                } else {
                    Some(Geometry::new(GeojsonValue::MultiLineString(lines)))
                }
            }
            shapefile::Shape::PolylineZ(polyline) => {
                let lines: Vec<Vec<Vec<f64>>> = polyline.parts()
                    .iter()
                    .map(|part| part.iter()
                        .map(|p| vec![p.x, p.y, p.z])
                        .collect())
                    .collect();
                
                if lines.len() == 1 {
                    Some(Geometry::new(GeojsonValue::LineString(lines.into_iter().next().unwrap())))
                } else {
                    Some(Geometry::new(GeojsonValue::MultiLineString(lines)))
                }
            }
            shapefile::Shape::Polygon(polygon) => {
                let rings: Vec<Vec<Vec<f64>>> = polygon.rings()
                    .iter()
                    .map(|ring| ring.points()
                        .iter()
                        .map(|p| vec![p.x, p.y])
                        .collect())
                    .collect();
                
                if rings.is_empty() {
                    return None;
                }
                
                // 处理多个环（外环和内环）
                Some(Geometry::new(GeojsonValue::Polygon(rings)))
            }
            shapefile::Shape::PolygonZ(polygon) => {
                let rings: Vec<Vec<Vec<f64>>> = polygon.rings()
                    .iter()
                    .map(|ring| ring.points()
                        .iter()
                        .map(|p| vec![p.x, p.y, p.z])
                        .collect())
                    .collect();
                
                if rings.is_empty() {
                    return None;
                }
                
                Some(Geometry::new(GeojsonValue::Polygon(rings)))
            }
            shapefile::Shape::Multipoint(multipoint) => {
                let points: Vec<Vec<f64>> = multipoint.points()
                    .iter()
                    .map(|p| vec![p.x, p.y])
                    .collect();
                Some(Geometry::new(GeojsonValue::MultiPoint(points)))
            }
            shapefile::Shape::MultipointZ(multipoint) => {
                let points: Vec<Vec<f64>> = multipoint.points()
                    .iter()
                    .map(|p| vec![p.x, p.y, p.z])
                    .collect();
                Some(Geometry::new(GeojsonValue::MultiPoint(points)))
            }
            _ => None,
        }
    }
    
    /// 从WKT字符串中提取EPSG代码
    fn extract_epsg_from_wkt(wkt: &str) -> Option<i32> {
        // 常见的EPSG代码模式
        let patterns = [
            r#"AUTHORITY\["EPSG","(\d+)"\]"#,  // AUTHORITY["EPSG","4326"]
            r#"EPSG:(\d+)"#,                     // EPSG:4326
            r#"EPSG","(\d+)"#,                   // EPSG","4326"
        ];
        
        for pattern in &patterns {
            if let Ok(re) = Regex::new(pattern) {
                if let Some(caps) = re.captures(wkt) {
                    if let Some(code) = caps.get(1) {
                        if let Ok(epsg) = code.as_str().parse::<i32>() {
                            return Some(epsg);
                        }
                    }
                }
            }
        }
        
        None
    }
}
