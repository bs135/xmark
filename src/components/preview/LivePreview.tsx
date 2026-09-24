import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Eye, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { WatermarkConfig } from '../../types/watermark';

// Keep in sync with STACK_SPACING_PX in src-tauri/src/engine.rs (scaled to
// the preview canvas width so both logo+text stacking match the real
// exported image).
const STACK_SPACING_BASE_PX = 12;
const BASE_REFERENCE_WIDTH = 800;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

type Coords = { x: number; y: number };

function getBoxCoords(pos: string, w: number, h: number, boxW: number, boxH: number, margin: number): Coords {
  switch (pos) {
    case 'topleft':
      return { x: margin, y: margin };
    case 'topcenter':
      return { x: (w - boxW) / 2, y: margin };
    case 'topright':
      return { x: w - boxW - margin, y: margin };
    case 'centerleft':
      return { x: margin, y: (h - boxH) / 2 };
    case 'center':
      return { x: (w - boxW) / 2, y: (h - boxH) / 2 };
    case 'centerright':
      return { x: w - boxW - margin, y: (h - boxH) / 2 };
    case 'bottomleft':
      return { x: margin, y: h - boxH - margin };
    case 'bottomcenter':
      return { x: (w - boxW) / 2, y: h - boxH - margin };
    case 'bottomright':
      return { x: w - boxW - margin, y: h - boxH - margin };
    default:
      return { x: (w - boxW) / 2, y: (h - boxH) / 2 };
  }
}

/** Measures rendered text width/height at a given font size using canvas metrics. */
function measureText(ctx: CanvasRenderingContext2D, text: string, fontSizePx: number) {
  ctx.font = `bold ${fontSizePx}px "Inter", sans-serif`;
  const metrics = ctx.measureText(text);
  const width = metrics.width;
  const ascent = metrics.actualBoundingBoxAscent ?? fontSizePx * 0.8;
  const descent = metrics.actualBoundingBoxDescent ?? fontSizePx * 0.2;
  return { width, height: ascent + descent, ascent };
}

export const LivePreview: React.FC = () => {
  const { files, selectedFileIndex, config } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { t } = useTranslation();

  const currentFile = files[selectedFileIndex];

  // Debounce rapid config changes (e.g. dragging sliders) so the preview
  // doesn't repaint on every intermediate value and feel janky.
  const [debouncedConfig, setDebouncedConfig] = useState<WatermarkConfig>(config);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedConfig(config), 80);
    return () => clearTimeout(timer);
  }, [config]);

  useEffect(() => {
    if (!currentFile || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cancellation flag: prevents a slow/stale async image load from a
    // previous render pass from drawing over a newer one once the file or
    // config has already changed again.
    let cancelled = false;

    const run = async () => {
      let baseImg: HTMLImageElement;
      try {
        // Ensure the Inter webfont is ready so canvas text metrics line up
        // with the Inter font actually used by the Rust rendering engine.
        await document.fonts.ready;
        baseImg = await loadImage(convertFileSrc(currentFile.path));
      } catch {
        return;
      }
      if (cancelled) return;

      const maxDim = 1200;
      let w = baseImg.width;
      let h = baseImg.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(baseImg, 0, 0, w, h);
      ctx.globalAlpha = debouncedConfig.opacity;

      const scaleFactor = w / BASE_REFERENCE_WIDTH;
      const margin = debouncedConfig.margin * scaleFactor;
      const spacing = STACK_SPACING_BASE_PX * scaleFactor;

      // Resolve effective text font size in preview pixels, honoring either
      // absolute px or percent-of-image-width, mirroring the Rust engine.
      const resolveTextMetrics = () => {
        if (!debouncedConfig.useText || !debouncedConfig.text.trim()) return null;
        const text = debouncedConfig.text;

        if (debouncedConfig.fontSizeUnit === 'percent') {
          const targetWidth = w * (debouncedConfig.fontSizePercent / 100);
          const probeSize = 100;
          const probe = measureText(ctx, text, probeSize);
          const fontSizePx = probe.width > 0 ? probeSize * (targetWidth / probe.width) : probeSize;
          return { fontSizePx, ...measureText(ctx, text, fontSizePx) };
        }

        const fontSizePx = Math.max(8, debouncedConfig.fontSize * scaleFactor);
        return { fontSizePx, ...measureText(ctx, text, fontSizePx) };
      };

      const textMetrics = resolveTextMetrics();

      const drawTextAt = (x: number, y: number) => {
        if (!textMetrics) return;
        ctx.font = `bold ${textMetrics.fontSizePx}px "Inter", sans-serif`;
        ctx.fillStyle = debouncedConfig.textColor || '#ffffff';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(debouncedConfig.text, x, y + textMetrics.ascent);
      };

      const drawLogoTiled = (logoImg: HTMLImageElement, logoW: number, logoH: number) => {
        const stepX = logoW + margin * 2 + 30;
        const stepY = logoH + margin * 2 + 30;
        for (let y = 10; y < h; y += stepY) {
          for (let x = 10; x < w; x += stepX) {
            ctx.drawImage(logoImg, x, y, logoW, logoH);
          }
        }
      };

      const drawTextTiled = () => {
        if (!textMetrics) return;
        const stepX = textMetrics.width + margin * 2 + 50;
        const stepY = textMetrics.height + margin * 2 + 40;
        for (let y = 30; y < h; y += stepY) {
          for (let x = -20; x < w; x += stepX) {
            drawTextAt(x, y);
          }
        }
      };

      const drawStackedTiled = (logoImg: HTMLImageElement, logoW: number, logoH: number) => {
        if (!textMetrics) return;
        const unitW = Math.max(logoW, textMetrics.width);
        const unitH = logoH + spacing + textMetrics.height;
        const stepX = unitW + margin * 2 + 30;
        const stepY = unitH + margin * 2 + 30;
        for (let y = 10; y < h; y += stepY) {
          for (let x = 10; x < w; x += stepX) {
            ctx.drawImage(logoImg, x + (unitW - logoW) / 2, y, logoW, logoH);
            drawTextAt(x + (unitW - textMetrics.width) / 2, y + logoH + spacing);
          }
        }
      };

      if (debouncedConfig.useImage && debouncedConfig.imagePath) {
        let logoImg: HTMLImageElement;
        try {
          logoImg = await loadImage(convertFileSrc(debouncedConfig.imagePath));
        } catch {
          if (!cancelled && textMetrics) {
            if (debouncedConfig.repeat === 'tile') {
              drawTextTiled();
            } else {
              const { x, y } = getBoxCoords(debouncedConfig.position, w, h, textMetrics.width, textMetrics.height, margin);
              drawTextAt(x, y);
            }
          }
          return;
        }
        if (cancelled) return;

        const logoW = Math.max(20, w * debouncedConfig.imageScale);
        const aspect = logoImg.height / logoImg.width;
        const logoH = logoW * aspect;

        if (textMetrics) {
          // Both enabled: stack logo above text so they never overlap.
          if (debouncedConfig.repeat === 'tile') {
            drawStackedTiled(logoImg, logoW, logoH);
          } else {
            const unitW = Math.max(logoW, textMetrics.width);
            const unitH = logoH + spacing + textMetrics.height;
            const { x, y } = getBoxCoords(debouncedConfig.position, w, h, unitW, unitH, margin);
            ctx.drawImage(logoImg, x + (unitW - logoW) / 2, y, logoW, logoH);
            drawTextAt(x + (unitW - textMetrics.width) / 2, y + logoH + spacing);
          }
        } else if (debouncedConfig.repeat === 'tile') {
          drawLogoTiled(logoImg, logoW, logoH);
        } else {
          const { x, y } = getBoxCoords(debouncedConfig.position, w, h, logoW, logoH, margin);
          ctx.drawImage(logoImg, x, y, logoW, logoH);
        }
      } else if (textMetrics) {
        if (debouncedConfig.repeat === 'tile') {
          drawTextTiled();
        } else {
          const { x, y } = getBoxCoords(debouncedConfig.position, w, h, textMetrics.width, textMetrics.height, margin);
          drawTextAt(x, y);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [currentFile, debouncedConfig]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 relative overflow-hidden">
      {/* Top indicator bar */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-100/40 dark:bg-slate-900/40">
        <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
          <Eye className="w-3.5 h-3.5 text-sky-400" />
          {t('preview.livePreview')}
        </span>
        {currentFile && (
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono truncate max-w-sm">
            {currentFile.name} ({currentFile.width} × {currentFile.height})
          </span>
        )}
      </div>

      {/* Main Canvas view area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {currentFile ? (
          <div className="max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="max-h-[calc(100vh-180px)] max-w-full object-contain block"
            />
          </div>
        ) : (
          <div className="text-center text-slate-400 dark:text-slate-600 flex flex-col items-center">
            <ImageIcon className="w-16 h-16 stroke-1 mb-3 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-medium">{t('preview.selectImage')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              {t('preview.selectImageHint')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
