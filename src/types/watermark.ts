export type Position =
  | 'topleft'
  | 'topcenter'
  | 'topright'
  | 'centerleft'
  | 'center'
  | 'centerright'
  | 'bottomleft'
  | 'bottomcenter'
  | 'bottomright';

export type RepeatMode = 'none' | 'tile';

export interface ImageFileInfo {
  path: string;
  name: string;
  size: number;
  width: number;
  height: number;
  extension: string;
}

export type FontFamily = 'inter' | 'roboto' | 'robotomono' | 'arvo' | 'pacifico';

export interface WatermarkConfig {
  // Image watermark
  imagePath?: string;
  useImage: boolean;
  imageScale: number; // 0.05 to 1.0 (default: 0.25)

  // Text watermark
  text: string;
  useText: boolean;
  fontSize: number; // 12 to 250 px
  fontSizeUnit: 'px' | 'percent';
  fontSizePercent: number; // 1 to 80 (% of the whole text line's width relative to the input image width)
  fontFamily: FontFamily;
  bold: boolean;
  italic: boolean;
  textColor: string; // hex "#ffffff"

  // Common properties
  opacity: number; // 0.0 to 1.0 (default 0.5)
  position: Position;
  repeat: RepeatMode;
  margin: number;
  rotationDeg: number;
}

export interface ProcessBatchRequest {
  files: string[];
  outputDir: string;
  config: WatermarkConfig;
  outputFormat?: 'original' | 'png' | 'jpeg' | 'webp';
  quality?: number;
}

export interface ProcessResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

export interface ProgressPayload {
  current: number;
  total: number;
  currentFile: string;
  success: boolean;
}
