mod commands;
mod engine;
mod models;

use commands::{inspect_files, process_watermark_batch, scan_directory_images};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_directory_images,
            inspect_files,
            process_watermark_batch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
