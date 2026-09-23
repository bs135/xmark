import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Eye, Image as ImageIcon } from 'lucide-react';

export const LivePreview: React.FC = () => {
  const { files, selectedFileIndex, config } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentFile = files[selectedFileIndex];

  useEffect(() => {
    if (!currentFile || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    baseImg.src = convertFileSrc(currentFile.path);

    baseImg.onload = () => {
      // Set canvas dimension matching actual image or high-res preview
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

      // Draw base photo
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(baseImg, 0, 0, w, h);

      // Watermark Opacity
      ctx.globalAlpha = config.opacity;

      // Helper function to draw overlay at (x, y)
      const drawTextWatermark = () => {
        if (!config.useText || !config.text.trim()) return;

        // Scale font proportional to canvas preview
        const scaleFactor = w / 800;
        const fontSize = Math.max(12, Math.round(config.fontSize * scaleFactor));

        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = config.textColor || '#ffffff';
        ctx.textBaseline = 'middle';

        const metrics = ctx.measureText(config.text);
        const textW = metrics.width;
        const textH = fontSize;

        const margin = config.margin * scaleFactor;

        const getCoords = (pos: string) => {
          switch (pos) {
            case 'topleft':
              return { x: margin, y: margin + textH / 2 };
            case 'topcenter':
              return { x: (w - textW) / 2, y: margin + textH / 2 };
            case 'topright':
              return { x: w - textW - margin, y: margin + textH / 2 };
            case 'centerleft':
              return { x: margin, y: h / 2 };
            case 'center':
              return { x: (w - textW) / 2, y: h / 2 };
            case 'centerright':
              return { x: w - textW - margin, y: h / 2 };
            case 'bottomleft':
              return { x: margin, y: h - textH / 2 - margin };
            case 'bottomcenter':
              return { x: (w - textW) / 2, y: h - textH / 2 - margin };
            case 'bottomright':
              return { x: w - textW - margin, y: h - textH / 2 - margin };
            default:
              return { x: (w - textW) / 2, y: h / 2 };
          }
        };

        if (config.repeat === 'tile') {
          const stepX = textW + margin * 2 + 50;
          const stepY = textH + margin * 2 + 40;
          for (let y = 30; y < h; y += stepY) {
            for (let x = -20; x < w; x += stepX) {
              ctx.fillText(config.text, x, y);
            }
          }
        } else {
          const { x, y } = getCoords(config.position);
          ctx.fillText(config.text, x, y);
        }
      };

      // Helper function to draw image logo overlay
      const drawLogoWatermark = () => {
        if (!config.useImage || !config.imagePath) {
          drawTextWatermark();
          return;
        }

        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.src = convertFileSrc(config.imagePath);

        logoImg.onload = () => {
          const logoW = Math.max(20, w * config.imageScale);
          const aspect = logoImg.height / logoImg.width;
          const logoH = logoW * aspect;

          const scaleFactor = w / 800;
          const margin = config.margin * scaleFactor;

          const getLogoCoords = (pos: string) => {
            switch (pos) {
              case 'topleft':
                return { x: margin, y: margin };
              case 'topcenter':
                return { x: (w - logoW) / 2, y: margin };
              case 'topright':
                return { x: w - logoW - margin, y: margin };
              case 'centerleft':
                return { x: margin, y: (h - logoH) / 2 };
              case 'center':
                return { x: (w - logoW) / 2, y: (h - logoH) / 2 };
              case 'centerright':
                return { x: w - logoW - margin, y: (h - logoH) / 2 };
              case 'bottomleft':
                return { x: margin, y: h - logoH - margin };
              case 'bottomcenter':
                return { x: (w - logoW) / 2, y: h - logoH - margin };
              case 'bottomright':
                return { x: w - logoW - margin, y: h - logoH - margin };
              default:
                return { x: (w - logoW) / 2, y: (h - logoH) / 2 };
            }
          };

          if (config.repeat === 'tile') {
            const stepX = logoW + margin * 2 + 30;
            const stepY = logoH + margin * 2 + 30;
            for (let y = 10; y < h; y += stepY) {
              for (let x = 10; x < w; x += stepX) {
                ctx.drawImage(logoImg, x, y, logoW, logoH);
              }
            }
          } else {
            const { x, y } = getLogoCoords(config.position);
            ctx.drawImage(logoImg, x, y, logoW, logoH);
          }

          // Then draw text if enabled
          drawTextWatermark();
        };

        logoImg.onerror = () => {
          drawTextWatermark();
        };
      };

      drawLogoWatermark();
    };
  }, [currentFile, config]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-300 relative overflow-hidden">
      {/* Top indicator bar */}
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs bg-slate-900/40">
        <span className="flex items-center gap-1.5 font-medium text-slate-300">
          <Eye className="w-3.5 h-3.5 text-sky-400" />
          Live Preview
        </span>
        {currentFile && (
          <span className="text-[11px] text-slate-400 font-mono truncate max-w-sm">
            {currentFile.name} ({currentFile.width} × {currentFile.height})
          </span>
        )}
      </div>

      {/* Main Canvas view area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {currentFile ? (
          <div className="max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="max-h-[calc(100vh-180px)] max-w-full object-contain block"
            />
          </div>
        ) : (
          <div className="text-center text-slate-600 flex flex-col items-center">
            <ImageIcon className="w-16 h-16 stroke-1 mb-3 text-slate-700" />
            <p className="text-sm font-medium">Select an image to preview</p>
            <p className="text-xs text-slate-500 mt-1">
              Add photos from the left panel to begin watermarking
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
