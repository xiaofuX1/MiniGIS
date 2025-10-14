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
    
    // 仅在 release 构建时复制 GDAL 及依赖文件（用于打包）
    if let Ok(profile) = std::env::var("PROFILE") {
        if profile == "release" {
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
                
                // 复制GDAL数据文件
                if Path::new(&gdal_data_path).exists() {
                    let target_gdal_data = format!("{}\\gdal-data", target_dir);
                    let _ = copy_dir_recursive(&gdal_data_path, &target_gdal_data);
                }
                
                // 复制PROJ数据文件
                let proj_data_path = format!("{}\\share\\proj", gdal_home);
                if Path::new(&proj_data_path).exists() {
                    let target_proj_data = format!("{}\\proj-data", target_dir);
                    let _ = copy_dir_recursive(&proj_data_path, &target_proj_data);
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
