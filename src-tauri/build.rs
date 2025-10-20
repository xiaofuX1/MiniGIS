use std::fs;
use std::path::Path;

/// 递归复制目录
fn copy_dir_recursive(src: &str, dst: &str) -> std::io::Result<()> {
    if !Path::new(dst).exists() {
        fs::create_dir_all(dst)?;
    }
    
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = Path::new(dst).join(entry.file_name());
        
        if file_type.is_dir() {
            copy_dir_recursive(
                src_path.to_str().unwrap(),
                dst_path.to_str().unwrap()
            )?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

fn main() {
    // GDAL vcpkg 配置
    let vcpkg_root = "C:\\vcpkg";
    let triplet = "x64-windows";
    
    // 设置 GDAL 路径供 gdal-sys 使用
    let gdal_home = format!("{}\\installed\\{}", vcpkg_root, triplet);
    let gdal_lib_dir = format!("{}\\lib", gdal_home);
    let gdal_include_dir = format!("{}\\include", gdal_home);
    let gdal_bin_path = format!("{}\\bin", gdal_home);
    let gdal_data_path = format!("{}\\share\\gdal", gdal_home);
    
    // 通过 cargo 环境变量传递给依赖的构建脚本
    println!("cargo:rustc-env=GDAL_HOME={}", gdal_home);
    println!("cargo:rustc-env=GDAL_LIB_DIR={}", gdal_lib_dir);
    println!("cargo:rustc-env=GDAL_INCLUDE_DIR={}", gdal_include_dir);
    println!("cargo:rustc-env=GDAL_VERSION=3.8.5");
    println!("cargo:rustc-env=GDAL_BIN_PATH={}", gdal_bin_path);
    println!("cargo:rustc-env=GDAL_DATA={}", gdal_data_path);
    
    // 链接库
    println!("cargo:rustc-link-search=native={}", gdal_lib_dir);
    println!("cargo:rustc-link-lib=dylib=gdal");
    
    // 在 debug 和 release 模式下都复制 GDAL 及依赖文件
    if let Ok(profile) = std::env::var("PROFILE") {
        let target_dir = format!("..\\target\\{}", profile);
        if Path::new(&target_dir).exists() && Path::new(&gdal_bin_path).exists() {
            // 复制vcpkg bin目录下的所有DLL
            if let Ok(entries) = fs::read_dir(&gdal_bin_path) {
                for entry in entries.flatten() {
                    if let Ok(file_type) = entry.file_type() {
                        if file_type.is_file() {
                            if let Some(file_name) = entry.file_name().to_str() {
                                if file_name.ends_with(".dll") {
                                    let src = entry.path();
                                    let dst = format!("{}\\{}", target_dir, file_name);
                                    let _ = fs::copy(&src, &dst);
                                }
                            }
                        }
                    }
                }
            }
            
            // 复制GDAL工具（ogr2ogr等）
            let gdal_tools_path = format!("{}\\tools\\gdal", gdal_home);
            println!("cargo:warning=检查GDAL工具目录: {}", gdal_tools_path);
            
            if Path::new(&gdal_tools_path).exists() {
                println!("cargo:warning=GDAL工具目录存在，开始复制...");
                
                // 只在release模式下复制到src-tauri/gdal-tools（供打包使用）
                let src_tauri_tools = "gdal-tools";
                if profile == "release" {
                    if !Path::new(src_tauri_tools).exists() {
                        let _ = fs::create_dir(src_tauri_tools);
                    }
                }
                
                if let Ok(entries) = fs::read_dir(&gdal_tools_path) {
                    let mut copied_count = 0;
                    for entry in entries.flatten() {
                        if let Ok(file_type) = entry.file_type() {
                            if file_type.is_file() {
                                if let Some(file_name) = entry.file_name().to_str() {
                                    if file_name.ends_with(".exe") {
                                        let src = entry.path();
                                        
                                        // 复制到target目录（开发和release都需要）
                                        let dst_target = format!("{}\\{}", target_dir, file_name);
                                        match fs::copy(&src, &dst_target) {
                                            Ok(_) => {
                                                println!("cargo:warning=✓ 复制GDAL工具: {}", file_name);
                                                copied_count += 1;
                                                
                                                // release模式下也复制到src-tauri/gdal-tools供打包使用
                                                if profile == "release" {
                                                    let dst_src_tauri = format!("{}\\{}", src_tauri_tools, file_name);
                                                    let _ = fs::copy(&src, &dst_src_tauri);
                                                }
                                            },
                                            Err(e) => {
                                                println!("cargo:warning=✗ 复制失败 {}: {}", file_name, e);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    println!("cargo:warning=共复制 {} 个GDAL工具", copied_count);
                } else {
                    println!("cargo:warning=无法读取GDAL工具目录");
                }
            } else {
                println!("cargo:warning=GDAL工具目录不存在: {}", gdal_tools_path);
            }
            
            // 复制GDAL数据文件
            if Path::new(&gdal_data_path).exists() {
                // 始终复制到target目录（开发和release都需要）
                let target_gdal_data = format!("{}\\gdal-data", target_dir);
                let _ = copy_dir_recursive(&gdal_data_path, &target_gdal_data);
                
                // 只在release模式下复制到src-tauri目录（供打包使用）
                if profile == "release" {
                    let src_tauri_gdal = "gdal-data";
                    if !Path::new(src_tauri_gdal).exists() {
                        let _ = copy_dir_recursive(&gdal_data_path, src_tauri_gdal);
                    }
                }
            }
            
            // 复制PROJ数据文件
            let proj_data_path = format!("{}\\share\\proj", gdal_home);
            if Path::new(&proj_data_path).exists() {
                // 始终复制到target目录（开发和release都需要）
                let target_proj_data = format!("{}\\proj-data", target_dir);
                let _ = copy_dir_recursive(&proj_data_path, &target_proj_data);
                
                // 只在release模式下复制到src-tauri目录（供打包使用）
                if profile == "release" {
                    let src_tauri_proj = "proj-data";
                    if !Path::new(src_tauri_proj).exists() {
                        let _ = copy_dir_recursive(&proj_data_path, src_tauri_proj);
                    }
                }
            }
        }
    }
    
    // 重新构建条件
    println!("cargo:rerun-if-env-changed=GDAL_HOME");
    println!("cargo:rerun-if-env-changed=GDAL_LIB_DIR");
    println!("cargo:rerun-if-env-changed=GDAL_INCLUDE_DIR");
    
    tauri_build::build()
}
