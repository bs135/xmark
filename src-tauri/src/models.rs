use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageFileInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub width: u32,
    pub height: u32,
    pub extension: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Position {
    TopLeft,
    TopCenter,
    TopRight,
    CenterLeft,
    Center,
    CenterRight,
    BottomLeft,
    BottomCenter,
    BottomRight,
}

impl Default for Position {
    fn default() -> Self {
        Position::Center
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RepeatMode {
    None,
    Tile,
}

impl Default for RepeatMode {
    fn default() -> Self {
        RepeatMode::None
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatermarkConfig {
    // Image Watermark
    pub image_path: Option<String>,
    pub use_image: bool,
    pub image_scale: f32, // 0.05 to 1.0 (default ~0.2)

    // Text Watermark
    pub text: String,
    pub use_text: bool,
    pub font_size: f32,
    pub text_color: String, // hex "#ffffff"

    // Common properties
    pub opacity: f32, // 0.0 to 1.0 (default 0.5)
    pub position: Position,
    pub repeat: RepeatMode,
    pub margin: u32,
    pub rotation_deg: f32, // -180 to 180 (for repeat tile or single)
}

impl Default for WatermarkConfig {
    fn default() -> Self {
        Self {
            image_path: None,
            use_image: false,
            image_scale: 0.25,
            text: String::new(),
            use_text: false,
            font_size: 36.0,
            text_color: "#ffffff".to_string(),
            opacity: 0.5,
            position: Position::Center,
            repeat: RepeatMode::None,
            margin: 24,
            rotation_deg: 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessBatchRequest {
    pub files: Vec<String>,
    pub output_dir: String,
    pub config: WatermarkConfig,
    pub output_format: Option<String>, // "original", "png", "jpeg", "webp"
    pub quality: Option<u8>,           // 1 - 100 for jpeg/webp
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessResult {
    pub total: usize,
    pub succeeded: usize,
    pub failed: usize,
    pub errors: Vec<String>,
}
