use crate::errors::Result;
use crate::models::{Layer, LayerStyle};
use crate::services::layer_service;

#[tauri::command]
pub async fn add_layer(project_id: String, layer: Layer) -> Result<Layer> {
    log::info!("Adding layer: {} to project: {}", layer.name, project_id);
    layer_service::add_layer(&project_id, layer).await
}

#[tauri::command]
pub async fn remove_layer(project_id: String, layer_id: String) -> Result<()> {
    log::info!("Removing layer: {} from project: {}", layer_id, project_id);
    layer_service::remove_layer(&project_id, &layer_id).await
}

#[tauri::command]
pub async fn get_layers(project_id: String) -> Result<Vec<Layer>> {
    log::info!("Getting layers for project: {}", project_id);
    layer_service::get_layers(&project_id).await
}

#[tauri::command]
pub async fn update_layer_style(layer_id: String, style: LayerStyle) -> Result<()> {
    log::info!("Updating style for layer: {}", layer_id);
    layer_service::update_style(&layer_id, style).await
}
