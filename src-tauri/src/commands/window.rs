use tauri::{AppHandle, Manager};

/// 前端准备完成，关闭启动窗口并显示主窗口
#[tauri::command]
pub async fn close_splashscreen(app: AppHandle) -> Result<(), String> {
    log::info!("收到关闭启动窗口请求");
    
    // 获取窗口
    let splashscreen = app.get_webview_window("splashscreen");
    let main_window = app.get_webview_window("main");
    
    if let Some(main) = main_window {
        log::info!("显示主窗口");
        // 显示主窗口（窗口状态插件会自动恢复尺寸和位置）
        main.show().map_err(|e| e.to_string())?;
        main.set_focus().map_err(|e| e.to_string())?;
        
        // 等待主窗口完全显示
        std::thread::sleep(std::time::Duration::from_millis(200));
        
        // 关闭启动窗口
        if let Some(splash) = splashscreen {
            log::info!("关闭启动窗口");
            splash.close().map_err(|e| e.to_string())?;
        }
        
        Ok(())
    } else {
        Err("找不到主窗口".to_string())
    }
}
