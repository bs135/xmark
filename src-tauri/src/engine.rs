use ab_glyph::{FontRef, PxScale};
use image::{imageops, ImageBuffer, Rgba, RgbaImage};
use imageproc::drawing::{draw_text_mut, text_size};
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

/// Trim fully-transparent margins from a rendered RGBA image so that the
/// returned bounding box matches the *visible* glyph pixels exactly. This is
/// what keeps the watermark visually centered: without this, imprecise text
/// metrics leave uneven blank space around the glyphs, and that leftover
/// space then skews the "centered" position of the whole overlay.
fn trim_transparent(img: &RgbaImage) -> Option<RgbaImage> {
    let (w, h) = img.dimensions();
    if w == 0 || h == 0 {
        return None;
    }

    let mut min_x = w;
    let mut min_y = h;
    let mut max_x = 0u32;
    let mut max_y = 0u32;
    let mut found = false;

    for y in 0..h {
        for x in 0..w {
            let a = img.get_pixel(x, y)[3];
            if a > 0 {
                found = true;
                if x < min_x {
                    min_x = x;
                }
                if x > max_x {
                    max_x = x;
                }
                if y < min_y {
                    min_y = y;
                }
                if y > max_y {
                    max_y = y;
                }
            }
        }
    }

    if !found {
        return None;
    }

    // Small symmetric padding to avoid clipping anti-aliased edges.
    let pad = 2i64;
    let crop_x = (min_x as i64 - pad).max(0) as u32;
    let crop_y = (min_y as i64 - pad).max(0) as u32;
    let crop_w = ((max_x as i64 + pad + 1).min(w as i64) - crop_x as i64).max(1) as u32;
    let crop_h = ((max_y as i64 + pad + 1).min(h as i64) - crop_y as i64).max(1) as u32;

    Some(imageops::crop_imm(img, crop_x, crop_y, crop_w, crop_h).to_image())
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

    // Accurately measure the text using real glyph metrics instead of a
    // crude character-count heuristic, then draw onto a padded canvas and
    // trim to the exact visible bounds. This ensures the returned overlay
    // image has no hidden blank space that would otherwise shift the
    // watermark off-center when it gets positioned later.
    let (measured_w, measured_h) = text_size(scale, &font, text);
    let padding = (font_size * 0.5).ceil().max(8.0) as u32;
    let width = measured_w.max(1) + padding * 2;
    let height = measured_h.max(1) + padding * 2;

    let mut img: RgbaImage = ImageBuffer::new(width, height);
    let color = parse_hex_color(color_hex, opacity);

    draw_text_mut(&mut img, color, padding as i32, padding as i32, scale, &font, text);

    trim_transparent(&img)
}

/// Render text to an image sized as a percentage of the base image's width,
/// preserving legibility by measuring at a high base font size first, then
/// resizing (similar to how the logo watermark is scaled).
pub fn render_text_as_percent_image(
    text: &str,
    target_base_w: u32,
    percent: f32,
    color_hex: &str,
    opacity: f32,
) -> Option<RgbaImage> {
    const BASE_FONT_SIZE: f32 = 120.0;
    let source = render_text_as_image(text, BASE_FONT_SIZE, color_hex, opacity)?;
    let (src_w, src_h) = source.dimensions();
    if src_w == 0 || src_h == 0 {
        return None;
    }

    let desired_w = ((target_base_w as f32) * (percent.clamp(0.5, 50.0) / 100.0))
        .max(4.0) as u32;
    let aspect = src_h as f32 / src_w as f32;
    let desired_h = ((desired_w as f32) * aspect).max(4.0) as u32;

    Some(imageops::resize(&source, desired_w, desired_h, imageops::FilterType::Lanczos3))
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

/// Vertical gap (in pixels) kept between the logo and the text watermark
/// when both are enabled, so they never visually overlap.
const STACK_SPACING_PX: i64 = 12;

/// Draws the logo watermark stacked directly above the text watermark
/// (rather than both anchored independently, which could overlap). Both
/// single-position and tile-repeat modes are supported.
pub fn apply_stacked_watermark(
    base: &mut RgbaImage,
    logo: &RgbaImage,
    text: &RgbaImage,
    config: &WatermarkConfig,
) {
    let (bw, bh) = base.dimensions();
    let (lw, lh) = logo.dimensions();
    let (tw, th) = text.dimensions();

    if bw == 0 || bh == 0 || lw == 0 || lh == 0 || tw == 0 || th == 0 {
        return;
    }

    let combined_w = lw.max(tw);
    let combined_h = lh + STACK_SPACING_PX.max(0) as u32 + th;

    let draw_unit = |base: &mut RgbaImage, unit_x: i64, unit_y: i64| {
        let logo_x = unit_x + ((combined_w - lw) / 2) as i64;
        let logo_y = unit_y;
        let text_x = unit_x + ((combined_w - tw) / 2) as i64;
        let text_y = unit_y + lh as i64 + STACK_SPACING_PX;
        imageops::overlay(base, logo, logo_x, logo_y);
        imageops::overlay(base, text, text_x, text_y);
    };

    match config.repeat {
        RepeatMode::None => {
            let (x, y) = calculate_position(bw, bh, combined_w, combined_h, &config.position, config.margin);
            draw_unit(base, x, y);
        }
        RepeatMode::Tile => {
            let step_x = (combined_w as i64) + ((config.margin * 2) as i64).max(30);
            let step_y = (combined_h as i64) + ((config.margin * 2) as i64).max(30);

            let mut y: i64 = 10;
            let mut row = 0;
            while y < bh as i64 {
                let offset_x = if row % 2 == 1 { step_x / 2 } else { 0 };
                let mut x: i64 = offset_x - step_x;
                while x < bw as i64 {
                    draw_unit(base, x, y);
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

    let logo_overlay = if config.use_image {
        config
            .image_path
            .as_ref()
            .and_then(|img_path| prepare_image_watermark(img_path, bw, bh, config.image_scale, config.opacity))
    } else {
        None
    };

    let text_overlay = if config.use_text && !config.text.trim().is_empty() {
        if config.font_size_unit == "percent" {
            render_text_as_percent_image(
                &config.text,
                bw,
                config.font_size_percent,
                &config.text_color,
                config.opacity,
            )
        } else {
            render_text_as_image(&config.text, config.font_size, &config.text_color, config.opacity)
        }
    } else {
        None
    };

    match (&logo_overlay, &text_overlay) {
        (Some(logo), Some(text)) => {
            apply_stacked_watermark(&mut rgba_img, logo, text, config);
        }
        (Some(logo), None) => {
            apply_watermark(&mut rgba_img, logo, config);
        }
        (None, Some(text)) => {
            apply_watermark(&mut rgba_img, text, config);
        }
        (None, None) => {}
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
