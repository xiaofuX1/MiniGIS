pub mod commands;
pub mod errors;
pub mod gis;
pub mod models;
pub mod services;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    
    // 初始化GDAL环境
    gis::gdal_init::init_gdal_env();
    if let Err(e) = gis::gdal_init::check_gdal_health() {
        log::error!("GDAL健康检查失败: {}", e);
    }
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .skip_initial_state("splashscreen") // 跳过启动窗口的状态恢复
                .build()
        )
        .setup(|app| {
            // 确保主窗口隐藏，只显示启动窗口
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.hide();
            }
            
            // 确保启动窗口显示并置顶
            if let Some(splash_window) = app.get_webview_window("splashscreen") {
                let _ = splash_window.show();
                let _ = splash_window.set_focus();
                let _ = splash_window.set_always_on_top(true);
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::project::new_project,
            commands::project::open_project,
            commands::project::save_project,
            commands::layer::add_layer,
            commands::layer::remove_layer,
            commands::layer::get_layers,
            commands::layer::update_layer_style,
            commands::gdal::gdal_open_vector,
            commands::gdal::gdal_open_multi_layer_vector,
            commands::gdal::gdal_get_geojson,
            commands::gdal::gdal_get_layer_geojson,
            commands::gdal::gdal_get_attribute_table,
            commands::gdal::gdal_diagnose,
            commands::gdal::gdal_export_vector,
            commands::file::file_exists,
            commands::window::close_splashscreen,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MiniGIS application");
}
