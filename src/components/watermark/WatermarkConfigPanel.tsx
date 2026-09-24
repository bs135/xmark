import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { Position, RepeatMode } from '../../types/watermark';
import { Image, Type, Sliders, LayoutGrid } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

export const WatermarkConfigPanel: React.FC = () => {
  const { config, updateConfig, resetConfig } = useAppStore();

  const handlePickLogo = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
          },
        ],
      });
      if (selected && typeof selected === 'string') {
        updateConfig({ imagePath: selected, useImage: true });
      }
    } catch (err) {
      console.error('Error selecting watermark logo:', err);
    }
  };

  const positions: { id: Position; label: string }[] = [
    { id: 'topleft', label: 'TL' },
    { id: 'topcenter', label: 'TC' },
    { id: 'topright', label: 'TR' },
    { id: 'centerleft', label: 'CL' },
    { id: 'center', label: 'C' },
    { id: 'centerright', label: 'CR' },
    { id: 'bottomleft', label: 'BL' },
    { id: 'bottomcenter', label: 'BC' },
    { id: 'bottomright', label: 'BR' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 overflow-y-auto">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-sky-400" />
          Watermark Settings
        </span>
        <button
          onClick={resetConfig}
          className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline decoration-slate-600 underline-offset-2 transition"
        >
          Reset
        </button>
      </div>

      <div className="p-4 space-y-5 text-xs">
        {/* SECTION 1: TEXT WATERMARK */}
        <div className="space-y-3 bg-slate-200/40 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-sky-400" />
              Text Watermark
            </span>
            <input
              type="checkbox"
              checked={config.useText}
              onChange={(e) => updateConfig({ useText: e.target.checked })}
              className="rounded bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600 text-sky-500 focus:ring-0 cursor-pointer"
            />
          </div>

          {config.useText && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                  Text Content
                </label>
                <input
                  type="text"
                  placeholder="e.g. © 2026 MyBrand or xmark"
                  value={config.text}
                  onChange={(e) => updateConfig({ text: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-600 dark:text-slate-400">
                      Font Size (
                      {config.fontSizeUnit === 'percent'
                        ? `${config.fontSizePercent}%`
                        : `${config.fontSize}px`}
                      )
                    </label>
                    <div className="flex rounded overflow-hidden border border-slate-300 dark:border-slate-700 text-[10px]">
                      <button
                        onClick={() => updateConfig({ fontSizeUnit: 'px' })}
                        className={`px-1.5 py-0.5 ${
                          config.fontSizeUnit === 'px'
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        px
                      </button>
                      <button
                        onClick={() => updateConfig({ fontSizeUnit: 'percent' })}
                        className={`px-1.5 py-0.5 ${
                          config.fontSizeUnit === 'percent'
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  {config.fontSizeUnit === 'percent' ? (
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={config.fontSizePercent}
                      onChange={(e) => updateConfig({ fontSizePercent: Number(e.target.value) })}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                  ) : (
                    <input
                      type="range"
                      min="12"
                      max="140"
                      value={config.fontSize}
                      onChange={(e) => updateConfig({ fontSize: Number(e.target.value) })}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                  )}
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                    Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.textColor}
                      onChange={(e) => updateConfig({ textColor: e.target.value })}
                      className="w-7 h-7 bg-transparent cursor-pointer rounded border border-slate-300 dark:border-slate-700"
                    />
                    <span className="font-mono uppercase text-slate-700 dark:text-slate-300 text-[11px]">
                      {config.textColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: IMAGE / LOGO WATERMARK */}
        <div className="space-y-3 bg-slate-200/40 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-amber-400" />
              Logo / Image
            </span>
            <input
              type="checkbox"
              checked={config.useImage}
              onChange={(e) => updateConfig({ useImage: e.target.checked })}
              className="rounded bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600 text-amber-500 focus:ring-0 cursor-pointer"
            />
          </div>

          {config.useImage && (
            <div className="space-y-3 pt-1">
              <div>
                <button
                  onClick={handlePickLogo}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-500 rounded text-slate-700 dark:text-slate-300 text-[11px] transition"
                >
                  <Image className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  {config.imagePath ? 'Change Image Logo...' : 'Select Logo File...'}
                </button>
                {config.imagePath && (
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate mt-1">
                    {config.imagePath}
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  <span>Logo Scale</span>
                  <span>{Math.round(config.imageScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="80"
                  value={Math.round(config.imageScale * 100)}
                  onChange={(e) => updateConfig({ imageScale: Number(e.target.value) / 100 })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: COMMON APPEARANCE (OPACITY, POSITION, REPEAT) */}
        <div className="space-y-4 bg-slate-200/40 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="font-semibold text-slate-700 dark:text-slate-300 block">Appearance & Position</span>

          {/* Opacity */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
              <span>Opacity (Độ mờ)</span>
              <span>{Math.round(config.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={Math.round(config.opacity * 100)}
              onChange={(e) => updateConfig({ opacity: Number(e.target.value) / 100 })}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          {/* Repeat Mode */}
          <div>
            <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
              Pattern / Repeat
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateConfig({ repeat: 'none' as RepeatMode })}
                className={`py-1.5 px-3 rounded text-center transition font-medium text-[11px] ${
                  config.repeat === 'none'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-700'
                }`}
              >
                Single Position
              </button>
              <button
                onClick={() => updateConfig({ repeat: 'tile' as RepeatMode })}
                className={`py-1.5 px-3 rounded text-center transition font-medium text-[11px] ${
                  config.repeat === 'tile'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-700'
                }`}
              >
                Tile Repeat
              </button>
            </div>
          </div>

          {/* 3x3 Grid Position (only if repeat === 'none') */}
          {config.repeat === 'none' && (
            <div>
              <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1 flex items-center gap-1">
                <LayoutGrid className="w-3 h-3" />
                Position (9-Point Grid)
              </label>
              <div className="grid grid-cols-3 gap-1.5 w-32 mx-auto p-1.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-300 dark:border-slate-700">
                {positions.map((p) => {
                  const isSel = config.position === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => updateConfig({ position: p.id })}
                      className={`h-7 rounded flex items-center justify-center font-bold text-[10px] transition ${
                        isSel
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Margin Slider */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
              <span>Padding / Margin</span>
              <span>{config.margin}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="120"
              value={config.margin}
              onChange={(e) => updateConfig({ margin: Number(e.target.value) })}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
