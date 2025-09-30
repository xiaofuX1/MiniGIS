mod shapefile_handler;

use shapefile_handler::{ShapefileHandler, ShapefileInfo, AttributeData};
use std::path::PathBuf;
use tauri::State;
use std::sync::Mutex;
use std::collections::HashMap;

pub struct AppState {
    loaded_shapefiles: Mutex<HashMap<String, ShapefileInfo>>,
}

#[tauri::command]
async fn load_shapefile(path: String, state: State<'_, AppState>) -> Result<ShapefileInfo, String> {
    let path_buf = PathBuf::from(&path);
    
    match ShapefileHandler::read_shapefile_info(&path_buf) {
        Ok(info) => {
            let mut loaded = state.loaded_shapefiles.lock().unwrap();
            loaded.insert(path.clone(), info.clone());
            Ok(info)
        }
        Err(e) => Err(format!("Failed to load shapefile: {}", e))
    }
}

#[tauri::command]
async fn get_shapefile_attributes(path: String) -> Result<AttributeData, String> {
    let path_buf = PathBuf::from(path);
    
    ShapefileHandler::read_attributes(path_buf)
        .map_err(|e| format!("Failed to read attributes: {}", e))
}

#[tauri::command]
async fn shapefile_to_geojson(path: String) -> Result<String, String> {
    let path_buf = PathBuf::from(path);
    
    ShapefileHandler::shapefile_to_geojson(path_buf)
        .map_err(|e| format!("Failed to convert to GeoJSON: {}", e))
}

#[tauri::command]
fn get_loaded_shapefiles(state: State<'_, AppState>) -> Vec<ShapefileInfo> {
    let loaded = state.loaded_shapefiles.lock().unwrap();
    loaded.values().cloned().collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            loaded_shapefiles: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            load_shapefile,
            get_shapefile_attributes,
            shapefile_to_geojson,
            get_loaded_shapefiles
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
