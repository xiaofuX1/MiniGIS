use tauri::{AppHandle, Manager};

/// 前端准备完成，关闭启动窗口并显示主窗口
#[tauri::command]
pub async fn close_splashscreen(app: AppHandle) -> Result<(), String> {
    log::info!("收到关闭启动窗口请求");
    
    // 获取窗口
    let splashscreen = app.get_webview_window("splashscreen");
    let main_window = app.get_webview_window("main");
    
    if let Some(main) = main_window {
        log::info!("准备切换窗口");
        
        // 恢复主窗口功能
        main.set_skip_taskbar(false).map_err(|e| e.to_string())?;
        
        // 显示主窗口
        main.show().map_err(|e| e.to_string())?;
        main.set_focus().map_err(|e| e.to_string())?;
        log::info!("主窗口已显示");
        
        // 极短延迟确保主窗口渲染完成
        std::thread::sleep(std::time::Duration::from_millis(50));
        
        // 立即关闭启动窗口
        if let Some(splash) = splashscreen {
            log::info!("关闭启动窗口");
            splash.close().map_err(|e| e.to_string())?;
        }
        
        Ok(())
    } else {
        Err("找不到主窗口".to_string())
    }
}
