use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[cfg(target_os = "windows")]

#[derive(Debug, Serialize, Deserialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_file: bool,
    pub is_directory: bool,
    pub is_symlink: bool,
    pub target_path: Option<String>,
}

#[tauri::command]
pub fn read_directory_unrestricted(path: String) -> Result<Vec<DirEntry>, String> {
    let path_obj = Path::new(&path);
    
    if !path_obj.exists() {
        return Err(format!("路径不存在: {}", path));
    }
    
    if !path_obj.is_dir() {
        return Err(format!("不是目录: {}", path));
    }
    
    let entries = fs::read_dir(path_obj)
        .map_err(|e| format!("读取目录失败: {}", e))?;
    
    let mut result = Vec::new();
    
    for entry in entries {
        if let Ok(entry) = entry {
            let file_name = entry.file_name().to_string_lossy().to_string();
            let full_path = entry.path().to_string_lossy().to_string();
            let metadata = entry.metadata().ok();
            
            // 检查是否是快捷方式
            let is_symlink = metadata.as_ref().map(|m| m.file_type().is_symlink()).unwrap_or(false);
            let is_lnk = file_name.to_lowercase().ends_with(".lnk");
            
            // 对于.lnk文件，尝试解析目标（简化版本，显示为快捷方式）
            let target_path = if is_lnk || is_symlink {
                // 可以在这里添加.lnk解析逻辑
                // 目前简单标记为快捷方式
                Some(full_path.clone())
            } else {
                None
            };
            
            result.push(DirEntry {
                name: file_name,
                path: full_path,
                is_file: metadata.as_ref().map(|m| m.is_file()).unwrap_or(false),
                is_directory: metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false),
                is_symlink: is_symlink || is_lnk,
                target_path,
            });
        }
    }
    
    Ok(result)
}
