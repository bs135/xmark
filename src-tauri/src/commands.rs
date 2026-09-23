use rayon::prelude::*;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;

use crate::engine::process_single_image;
use crate::models::{ImageFileInfo, ProcessBatchRequest, ProcessResult};

const VALID_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp", "bmp"];

#[tauri::command]
pub fn scan_directory_images(dir_path: String) -> Result<Vec<ImageFileInfo>, String> {
    let path = Path::new(&dir_path);
    if !path.is_dir() {
        return Err("Path is not a valid directory".to_string());
    }

    let mut list = Vec::new();

    for entry in WalkDir::new(path)
        .max_depth(3)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            let p = entry.path();
            if let Some(ext) = p.extension().and_then(|s| s.to_str()) {
                let ext_lower = ext.to_lowercase();
                if VALID_EXTENSIONS.contains(&ext_lower.as_str()) {
                    let file_size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                    let file_name = p
                        .file_name()
                        .and_then(|s| s.to_str())
                        .unwrap_or("unknown")
                        .to_string();

                    // Optional quick dimensions check
                    let (w, h) = image::image_dimensions(p).unwrap_or((0, 0));

                    list.push(ImageFileInfo {
                        path: p.to_string_lossy().to_string(),
                        name: file_name,
                        size: file_size,
                        width: w,
                        height: h,
                        extension: ext_lower,
                    });
                }
            }
        }
    }

    Ok(list)
}

#[tauri::command]
pub fn inspect_files(file_paths: Vec<String>) -> Result<Vec<ImageFileInfo>, String> {
    let mut list = Vec::new();
    for path_str in file_paths {
        let p = Path::new(&path_str);
        if p.is_file() {
            if let Some(ext) = p.extension().and_then(|s| s.to_str()) {
                let ext_lower = ext.to_lowercase();
                if VALID_EXTENSIONS.contains(&ext_lower.as_str()) {
                    let file_size = fs::metadata(p).map(|m| m.len()).unwrap_or(0);
                    let file_name = p
                        .file_name()
                        .and_then(|s| s.to_str())
                        .unwrap_or("unknown")
                        .to_string();

                    let (w, h) = image::image_dimensions(p).unwrap_or((0, 0));

                    list.push(ImageFileInfo {
                        path: p.to_string_lossy().to_string(),
                        name: file_name,
                        size: file_size,
                        width: w,
                        height: h,
                        extension: ext_lower,
                    });
                }
            }
        }
    }
    Ok(list)
}

#[derive(Clone, serde::Serialize)]
pub struct ProgressPayload {
    pub current: usize,
    pub total: usize,
    pub current_file: String,
    pub success: bool,
}

#[tauri::command]
pub async fn process_watermark_batch(
    app: AppHandle,
    request: ProcessBatchRequest,
) -> Result<ProcessResult, String> {
    let out_dir = PathBuf::from(&request.output_dir);
    if !out_dir.exists() {
        fs::create_dir_all(&out_dir).map_err(|e| format!("Failed to create output dir: {}", e))?;
    }

    let total = request.files.len();
    let config = request.config;

    let results: Vec<Result<String, String>> = request
        .files
        .par_iter()
        .enumerate()
        .map(|(idx, file_path_str)| {
            let in_path = Path::new(file_path_str);
            let file_name = in_path
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| format!("image_{}.png", idx));

            let out_path = out_dir.join(&file_name);

            let res = process_single_image(in_path, &out_path, &config);

            let _ = app.emit(
                "watermark-progress",
                ProgressPayload {
                    current: idx + 1,
                    total,
                    current_file: file_name,
                    success: res.is_ok(),
                },
            );

            res.map(|_| file_path_str.clone())
        })
        .collect();

    let mut succeeded = 0;
    let mut failed = 0;
    let mut errors = Vec::new();

    for r in results {
        match r {
            Ok(_) => succeeded += 1,
            Err(e) => {
                failed += 1;
                errors.push(e);
            }
        }
    }

    Ok(ProcessResult {
        total,
        succeeded,
        failed,
        errors,
    })
}
