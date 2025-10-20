use std::env;
use std::path::PathBuf;

/// 初始化GDAL运行时环境
pub fn init_gdal_env() {
    log::info!("========== GDAL环境初始化开始 ==========");
    
    // 获取应用程序所在目录
    let exe_path = env::current_exe().ok();
    let app_dir = exe_path
        .as_ref()
        .and_then(|p| p.parent())
        .map(|p| p.to_path_buf());
    
    if app_dir.is_none() {
        log::error!("【严重错误】无法获取应用程序目录，GDAL初始化失败！");
        return;
    }
    
    // vcpkg 路径（用于开发环境）
    let vcpkg_root = PathBuf::from("C:\\vcpkg\\installed\\x64-windows");
    
    if let Some(dir) = app_dir {
        log::info!("✓ 应用程序目录: {:?}", dir);
        log::info!("✓ 可执行文件: {:?}", exe_path);
        
        // 优先设置PATH（确保DLL能被找到）
        #[cfg(target_os = "windows")]
        {
            let current_path = env::var("PATH").unwrap_or_default();
            log::info!("当前PATH环境变量长度: {} 字符", current_path.len());
            
            // 添加应用目录和 vcpkg bin 目录到 PATH
            let vcpkg_bin = vcpkg_root.join("bin");
            let new_path = if vcpkg_bin.exists() {
                // 开发模式：同时添加 vcpkg 和应用目录
                log::info!("✓ 开发模式：检测到vcpkg目录");
                format!("{};{};{}", dir.display(), vcpkg_bin.display(), current_path)
            } else {
                // 打包模式：只添加应用目录
                log::info!("✓ 打包模式：使用应用程序目录中的DLL");
                format!("{};{}", dir.display(), current_path)
            };
            env::set_var("PATH", new_path);
            log::info!("✓ 已将应用目录添加到PATH: {:?}", dir);
            if vcpkg_bin.exists() {
                log::info!("✓ 已将vcpkg目录添加到PATH: {:?}", vcpkg_bin);
            }
        }
        
        // 设置PROJ环境变量（优先使用打包的，其次使用vcpkg的）
        let proj_lib_path = dir.join("proj-data");
        let vcpkg_proj_path = vcpkg_root.join("share").join("proj");
        
        log::info!("检查PROJ数据路径...");
        log::info!("  - 打包路径: {:?} (存在: {})", proj_lib_path, proj_lib_path.exists());
        log::info!("  - vcpkg路径: {:?} (存在: {})", vcpkg_proj_path, vcpkg_proj_path.exists());
        
        let proj_path = if proj_lib_path.exists() {
            // 打包环境：使用应用目录中的 proj-data
            log::info!("✓ 使用打包的PROJ数据");
            proj_lib_path
        } else if vcpkg_proj_path.exists() {
            // 开发环境：使用 vcpkg 中的 proj
            log::info!("✓ 使用vcpkg中的PROJ数据（开发模式）");
            vcpkg_proj_path
        } else {
            log::error!("【严重错误】PROJ数据目录不存在！这将导致坐标转换失败！");
            log::error!("  预期路径1: {:?}", proj_lib_path);
            log::error!("  预期路径2: {:?}", vcpkg_proj_path);
            proj_lib_path // 返回默认路径
        };
        
        if proj_path.exists() {
            let proj_str = proj_path.to_string_lossy().to_string();
            let proj_db = proj_path.join("proj.db");
            
            env::set_var("PROJ_LIB", &proj_str);
            env::set_var("PROJ_DATA", &proj_str);
            env::set_var("PROJ_DB_PATH", proj_db.to_string_lossy().to_string());
            
            log::info!("✓ PROJ_LIB设置为: {}", proj_str);
            log::info!("✓ PROJ_DATA设置为: {}", proj_str);
            
            // 验证关键文件
            if proj_db.exists() {
                log::info!("✓ proj.db 文件存在");
            } else {
                log::error!("【严重警告】proj.db 文件不存在: {:?}", proj_db);
                log::error!("  这将导致大部分坐标转换失败！");
            }
        } else {
            log::error!("【严重错误】PROJ路径设置失败，坐标转换功能将不可用！");
        }
        
        // 设置GDAL数据目录（优先使用打包的，其次使用vcpkg的）
        let gdal_data_path = dir.join("gdal-data");
        let vcpkg_gdal_path = vcpkg_root.join("share").join("gdal");
        
        log::info!("检查GDAL数据路径...");
        log::info!("  - 打包路径: {:?} (存在: {})", gdal_data_path, gdal_data_path.exists());
        log::info!("  - vcpkg路径: {:?} (存在: {})", vcpkg_gdal_path, vcpkg_gdal_path.exists());
        
        let gdal_path = if gdal_data_path.exists() {
            // 打包环境：使用应用目录中的 gdal-data
            log::info!("✓ 使用打包的GDAL数据");
            gdal_data_path
        } else if vcpkg_gdal_path.exists() {
            // 开发环境：使用 vcpkg 中的 gdal
            log::info!("✓ 使用vcpkg中的GDAL数据（开发模式）");
            vcpkg_gdal_path
        } else {
            log::error!("【严重错误】GDAL数据目录不存在！某些格式可能无法读取！");
            log::error!("  预期路径1: {:?}", gdal_data_path);
            log::error!("  预期路径2: {:?}", vcpkg_gdal_path);
            gdal_data_path // 返回默认路径
        };
        
        if gdal_path.exists() {
            env::set_var("GDAL_DATA", &gdal_path);
            log::info!("✓ GDAL_DATA设置为: {:?}", gdal_path);
        } else {
            log::error!("【严重错误】GDAL_DATA路径不存在，格式支持将受限！");
        }
    }
    
    // 设置GDAL配置选项
    log::info!("设置GDAL配置选项...");
    match gdal::config::set_config_option("GDAL_FILENAME_IS_UTF8", "YES") {
        Ok(_) => log::info!("✓ GDAL_FILENAME_IS_UTF8 = YES"),
        Err(e) => log::warn!("⚠ 设置GDAL_FILENAME_IS_UTF8失败: {:?}", e),
    }
    // 设置默认编码为GBK，适用于中国shapefile（避免中文乱码）
    // 文件级别的open_options可以覆盖此全局设置
    match gdal::config::set_config_option("SHAPE_ENCODING", "GBK") {
        Ok(_) => log::info!("✓ SHAPE_ENCODING = GBK（中文默认编码）"),
        Err(e) => log::warn!("⚠ 设置SHAPE_ENCODING失败: {:?}", e),
    }
    
    log::info!("✓ GDAL版本: {}", gdal::version::version_info("RELEASE_NAME"));
    log::info!("========== GDAL环境初始化完成 ==========");
}

/// 检查GDAL是否正常工作
pub fn check_gdal_health() -> Result<(), String> {
    log::info!("========== GDAL健康检查开始 ==========");
    
    // 检查驱动数量
    let driver_count = gdal::DriverManager::count();
    log::info!("GDAL驱动数量: {}", driver_count);
    
    if driver_count == 0 {
        log::error!("【严重错误】GDAL驱动未加载！");
        return Err("GDAL驱动未加载，请检查GDAL_DATA环境变量".to_string());
    }
    
    // 检查关键环境变量
    let gdal_data = env::var("GDAL_DATA").unwrap_or_else(|_| "未设置".to_string());
    let proj_lib = env::var("PROJ_LIB").unwrap_or_else(|_| "未设置".to_string());
    
    log::info!("✓ GDAL_DATA: {}", gdal_data);
    log::info!("✓ PROJ_LIB: {}", proj_lib);
    
    // 列出部分支持的格式
    log::info!("支持的部分驱动:");
    for i in 0..driver_count.min(10) {
        if let Ok(driver) = gdal::DriverManager::get_driver(i) {
            log::info!("  - {}", driver.long_name());
        }
    }
    
    log::info!("✓ GDAL健康检查通过，已加载 {} 个驱动", driver_count);
    log::info!("========== GDAL健康检查完成 ==========");
    Ok(())
}
