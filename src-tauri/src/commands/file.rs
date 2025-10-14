use crate::errors::Result;
use std::path::Path;

/// 检查文件是否存在
#[tauri::command]
pub async fn file_exists(path: String) -> Result<bool> {
    Ok(Path::new(&path).exists())
}
