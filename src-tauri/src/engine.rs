use ab_glyph::{Font, FontRef, PxScale};
use image::{imageops, ImageBuffer, Rgba, RgbaImage};
use imageproc::drawing::draw_text_mut;
use std::fs;
use std::path::Path;

use crate::models::{Position, RepeatMode, WatermarkConfig};

// Embedded default font for reliable cross-platform rendering
const DEFAULT_FONT_DATA: &[u8] = include_bytes!("../assets/fonts/Inter-Regular.ttf");

pub fn parse_hex_color(hex: &str, alpha: f32) -> Rgba<u8> {
    let clean = hex.trim_start_matches('#');
    let (r, g, b) = match clean.len() {
        6 => {
            let r = u8::from_str_radix(&clean[0..2], 16).unwrap_or(255);
            let g = u8::from_str_radix(&clean[2..4], 16).unwrap_or(255);
            let b = u8::from_str_radix(&clean[4..6], 16).unwrap_or(255);
            (r, g, b)
        }
        3 => {
            let r = u8::from_str_radix(&clean[0..1], 16).unwrap_or(15) * 17;
            let g = u8::from_str_radix(&clean[1..2], 16).unwrap_or(15) * 17;
            let b = u8::from_str_radix(&clean[2..3], 16).unwrap_or(15) * 17;
            (r, g, b)
        }
        _ => (255, 255, 255),
    };
    let a = (alpha.clamp(0.0, 1.0) * 255.0) as u8;
    Rgba([r, g, b, a])
}

pub fn render_text_as_image(
    text: &str,
    font_size: f32,
    color_hex: &str,
    opacity: f32,
) -> Option<RgbaImage> {
    if text.trim().is_empty() {
        return None;
    }

    let font = FontRef::try_from_slice(DEFAULT_FONT_DATA).ok()?;
    let scale = PxScale::from(font_size);

    // Calculate approximate text bounding box
    let _v_metrics = font.as_scaled(scale);
    let h_advance = font_size * 0.6 * (text.chars().count() as f32);
    let width = (h_advance.ceil() as u32).max(10) + 20;
    let height = (font_size * 1.4).ceil() as u32;

    let mut img: RgbaImage = ImageBuffer::new(width, height);
    let color = parse_hex_color(color_hex, opacity);

    draw_text_mut(&mut img, color, 10, 5, scale, &font, text);

    Some(img)
}

pub fn prepare_image_watermark(path: &str, target_w: u32, _target_h: u32, scale_ratio: f32, opacity: f32) -> Option<RgbaImage> {
    let img = image::open(path).ok()?.to_rgba8();
    let (orig_w, orig_h) = img.dimensions();

    if orig_w == 0 || orig_h == 0 {
        return None;
    }

    // Scale relative to base image width or height
    let desired_w = ((target_w as f32) * scale_ratio.clamp(0.01, 1.0)).max(10.0) as u32;
    let aspect = orig_h as f32 / orig_w as f32;
    let desired_h = ((desired_w as f32) * aspect).max(10.0) as u32;

    let mut resized = imageops::resize(&img, desired_w, desired_h, imageops::FilterType::Lanczos3);

    // Apply opacity multiplier
    if opacity < 1.0 {
        for pixel in resized.pixels_mut() {
            let a = pixel[3] as f32 / 255.0;
            pixel[3] = ((a * opacity.clamp(0.0, 1.0)) * 255.0) as u8;
        }
    }

    Some(resized)
}

fn calculate_position(
    base_w: u32,
    base_h: u32,
    watermark_w: u32,
    watermark_h: u32,
    pos: &Position,
    margin: u32,
) -> (i64, i64) {
    let m = margin as i64;
    let bw = base_w as i64;
    let bh = base_h as i64;
    let ww = watermark_w as i64;
    let wh = watermark_h as i64;

    match pos {
        Position::TopLeft => (m, m),
        Position::TopCenter => ((bw - ww) / 2, m),
        Position::TopRight => (bw - ww - m, m),
        Position::CenterLeft => (m, (bh - wh) / 2),
        Position::Center => ((bw - ww) / 2, (bh - wh) / 2),
        Position::CenterRight => (bw - ww - m, (bh - wh) / 2),
        Position::BottomLeft => (m, bh - wh - m),
        Position::BottomCenter => ((bw - ww) / 2, bh - wh - m),
        Position::BottomRight => (bw - ww - m, bh - wh - m),
    }
}

pub fn apply_watermark(base: &mut RgbaImage, overlay: &RgbaImage, config: &WatermarkConfig) {
    let (bw, bh) = base.dimensions();
    let (ow, oh) = overlay.dimensions();

    if ow == 0 || oh == 0 || bw == 0 || bh == 0 {
        return;
    }

    match config.repeat {
        RepeatMode::None => {
            let (x, y) = calculate_position(bw, bh, ow, oh, &config.position, config.margin);
            imageops::overlay(base, overlay, x, y);
        }
        RepeatMode::Tile => {
            let step_x = (ow as i64) + ((config.margin * 2) as i64).max(30);
            let step_y = (oh as i64) + ((config.margin * 2) as i64).max(30);

            let mut y: i64 = 10;
            let mut row = 0;
            while y < bh as i64 {
                let offset_x = if row % 2 == 1 { step_x / 2 } else { 0 };
                let mut x: i64 = offset_x - step_x;
                while x < bw as i64 {
                    imageops::overlay(base, overlay, x, y);
                    x += step_x;
                }
                y += step_y;
                row += 1;
            }
        }
    }
}

pub fn process_single_image(
    input_path: &Path,
    output_path: &Path,
    config: &WatermarkConfig,
) -> Result<(), String> {
    let dynamic_img = image::open(input_path).map_err(|e| format!("Failed to read image: {}", e))?;
    let mut rgba_img = dynamic_img.to_rgba8();
    let (bw, bh) = rgba_img.dimensions();

    // 1. Process Logo watermark if enabled
    if config.use_image {
        if let Some(ref img_path) = config.image_path {
            if let Some(overlay) = prepare_image_watermark(img_path, bw, bh, config.image_scale, config.opacity) {
                apply_watermark(&mut rgba_img, &overlay, config);
            }
        }
    }

    // 2. Process Text watermark if enabled
    if config.use_text && !config.text.trim().is_empty() {
        if let Some(text_overlay) = render_text_as_image(
            &config.text,
            config.font_size,
            &config.text_color,
            config.opacity,
        ) {
            apply_watermark(&mut rgba_img, &text_overlay, config);
        }
    }

    // Ensure parent dir exists
    if let Some(parent) = output_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let ext = output_path
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    if ext == "jpg" || ext == "jpeg" {
        // JPEG doesn't support alpha channel (RGBA8), convert on white background to RGB8
        let mut rgb_img = image::RgbImage::new(bw, bh);
        for y in 0..bh {
            for x in 0..bw {
                let pixel = rgba_img.get_pixel(x, y);
                let alpha = pixel[3] as f32 / 255.0;
                let inv_alpha = 1.0 - alpha;
                let r = (pixel[0] as f32 * alpha + 255.0 * inv_alpha).round().clamp(0.0, 255.0) as u8;
                let g = (pixel[1] as f32 * alpha + 255.0 * inv_alpha).round().clamp(0.0, 255.0) as u8;
                let b = (pixel[2] as f32 * alpha + 255.0 * inv_alpha).round().clamp(0.0, 255.0) as u8;
                rgb_img.put_pixel(x, y, image::Rgb([r, g, b]));
            }
        }
        rgb_img
            .save(output_path)
            .map_err(|e| format!("Failed to save output image: {}", e))?;
    } else {
        rgba_img
            .save(output_path)
            .map_err(|e| format!("Failed to save output image: {}", e))?;
    }

    Ok(())
}
