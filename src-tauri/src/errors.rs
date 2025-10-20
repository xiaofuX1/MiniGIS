use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug, Serialize, Deserialize)]
pub enum AppError {
    #[error("File not found: {0}")]
    FileNotFound(String),
    
    #[error("File read error: {0}")]
    FileReadError(String),
    
    #[error("File write error: {0}")]
    FileWriteError(String),
    
    #[error("Invalid file format: {0}")]
    InvalidFormat(String),
    
    #[error("IO error: {0}")]
    IoError(String),
    
    #[error("Parse error: {0}")]
    ParseError(String),
    
    #[error("Database error: {0}")]
    DatabaseError(String),
    
    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::IoError(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::ParseError(format!("JSON error: {}", err))
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
