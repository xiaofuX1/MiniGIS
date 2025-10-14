use crate::errors::Result;
use crate::models::Project;
use crate::services::project_service;

#[tauri::command]
pub async fn new_project(name: String) -> Result<Project> {
    log::info!("Creating new project: {}", name);
    project_service::create_project(name).await
}

#[tauri::command]
pub async fn open_project(path: String) -> Result<Project> {
    log::info!("Opening project: {}", path);
    project_service::load_project(&path).await
}

#[tauri::command]
pub async fn save_project(project: Project, path: Option<String>) -> Result<String> {
    log::info!("Saving project: {}", project.name);
    project_service::save_project(&project, path.as_deref()).await
}
