use crate::errors::Result;
use crate::models::{Layer, LayerStyle};
use std::sync::Mutex;
use std::collections::HashMap;

lazy_static::lazy_static! {
    static ref LAYERS: Mutex<HashMap<String, Vec<Layer>>> = Mutex::new(HashMap::new());
}

pub async fn add_layer(project_id: &str, layer: Layer) -> Result<Layer> {
    let mut layers = LAYERS.lock().unwrap();
    let project_layers = layers.entry(project_id.to_string()).or_insert_with(Vec::new);
    project_layers.push(layer.clone());
    Ok(layer)
}

pub async fn remove_layer(project_id: &str, layer_id: &str) -> Result<()> {
    let mut layers = LAYERS.lock().unwrap();
    if let Some(project_layers) = layers.get_mut(project_id) {
        project_layers.retain(|l| l.id != layer_id);
    }
    Ok(())
}

pub async fn get_layers(project_id: &str) -> Result<Vec<Layer>> {
    let layers = LAYERS.lock().unwrap();
    Ok(layers.get(project_id).cloned().unwrap_or_default())
}

pub async fn update_style(layer_id: &str, style: LayerStyle) -> Result<()> {
    let mut layers = LAYERS.lock().unwrap();
    for project_layers in layers.values_mut() {
        for layer in project_layers.iter_mut() {
            if layer.id == layer_id {
                layer.style = style.clone();
                return Ok(());
            }
        }
    }
    Ok(())
}
