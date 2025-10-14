use std::env;

/// 初始化GDAL运行时环境
pub fn init_gdal_env() {
    // 获取应用程序所在目录
    let exe_path = env::current_exe().ok();
    let app_dir = exe_path
        .as_ref()
        .and_then(|p| p.parent())
        .map(|p| p.to_path_buf());
    
    if let Some(dir) = app_dir {
        log::info!("应用程序目录: {:?}", dir);
        
        // 优先设置PATH（确保DLL能被找到）
        #[cfg(target_os = "windows")]
        {
            let current_path = env::var("PATH").unwrap_or_default();
            let new_path = format!("{};{}", dir.display(), current_path);
            env::set_var("PATH", new_path);
            log::info!("已将应用目录添加到PATH");
        }
        
        // 设置PROJ环境变量（必须在GDAL使用前设置）
        let proj_lib_path = dir.join("proj-data");
        if proj_lib_path.exists() {
            let proj_str = proj_lib_path.to_string_lossy().to_string();
            env::set_var("PROJ_LIB", &proj_str);
            env::set_var("PROJ_DATA", &proj_str);
            // PROJ还需要知道proj.db的位置
            env::set_var("PROJ_DB_PATH", proj_lib_path.join("proj.db").to_string_lossy().to_string());
            log::info!("PROJ_LIB设置为: {}", proj_str);
            log::info!("PROJ_DATA设置为: {}", proj_str);
        } else {
            log::warn!("PROJ数据目录不存在: {:?}", proj_lib_path);
        }
        
        // 设置GDAL数据目录
        let gdal_data_path = dir.join("gdal-data");
        if gdal_data_path.exists() {
            env::set_var("GDAL_DATA", &gdal_data_path);
            log::info!("GDAL_DATA设置为: {:?}", gdal_data_path);
        } else {
            log::warn!("GDAL数据目录不存在: {:?}", gdal_data_path);
        }
    } else {
        log::error!("无法获取应用程序目录！");
    }
    
    // 设置GDAL配置选项
    gdal::config::set_config_option("GDAL_FILENAME_IS_UTF8", "YES").ok();
    gdal::config::set_config_option("SHAPE_ENCODING", "").ok();
    
    log::info!("GDAL环境初始化完成");
    log::info!("GDAL版本: {}", gdal::version::version_info("RELEASE_NAME"));
}

/// 检查GDAL是否正常工作
pub fn check_gdal_health() -> Result<(), String> {
    // 检查驱动数量
    let driver_count = gdal::DriverManager::count();
    if driver_count == 0 {
        return Err("GDAL驱动未加载".to_string());
    }
    
    log::info!("GDAL健康检查通过，已加载 {} 个驱动", driver_count);
    Ok(())
}
