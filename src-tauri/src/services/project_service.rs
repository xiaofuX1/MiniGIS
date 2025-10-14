use crate::errors::Result;
use crate::models::{Project, MapConfig};
use chrono::Utc;
use std::fs;
use uuid::Uuid;

pub async fn create_project(name: String) -> Result<Project> {
    let project = Project {
        id: Uuid::new_v4().to_string(),
        name,
        path: None,
        layers: Vec::new(),
        map_config: MapConfig {
            center: [116.3974, 39.9093], // Beijing
            zoom: 10,
            projection: "EPSG:4326".to_string(),
            basemap_url: "https://gac-geo.googlecnapps.club/maps/vt?lyrs=s&x={x}&y={y}&z={z}".to_string(),
        },
        created_at: Utc::now().to_rfc3339(),
        updated_at: Utc::now().to_rfc3339(),
    };
    
    Ok(project)
}

pub async fn load_project(path: &str) -> Result<Project> {
    let content = fs::read_to_string(path)?;
    let project: Project = serde_json::from_str(&content)?;
    Ok(project)
}

pub async fn save_project(project: &Project, path: Option<&str>) -> Result<String> {
    let default_path = format!("{}.mgp", project.name);
    let save_path = path.unwrap_or(&default_path);
    let content = serde_json::to_string_pretty(project)?;
    fs::write(&save_path, content)?;
    Ok(save_path.to_string())
}
