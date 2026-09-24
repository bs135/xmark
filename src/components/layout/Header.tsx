import React, { useEffect, useState } from 'react';
import { Layers, Minus, Square, Copy, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const appWindow = getCurrentWindow();

export const Header: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    appWindow.isMaximized().then(setIsMaximized);
    appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  return (
    <header
      data-tauri-drag-region
      className="h-12 bg-slate-900 border-b border-slate-800 pl-4 flex items-center justify-between select-none"
    >
      <div data-tauri-drag-region className="flex items-center gap-2 flex-1 h-full">
        <div className="w-7 h-7 bg-sky-500 rounded flex items-center justify-center shadow-md pointer-events-none">
          <Layers className="w-4 h-4 text-slate-950 font-bold" />
        </div>
        <div className="flex items-baseline gap-1.5 pointer-events-none">
          <h1 className="text-sm font-bold tracking-tight text-white m-0">xmark</h1>
          <span className="text-[10px] text-sky-400 font-semibold px-1.5 py-0.2 bg-sky-950 border border-sky-800 rounded">
            v0.2.0
          </span>
        </div>
        <span className="text-[11px] text-slate-400 ml-4 pointer-events-none">
          Cross-Platform High-Performance Watermark Tool
        </span>
      </div>

      {/* Custom window controls (native title bar is hidden) */}
      <div className="flex items-center h-full">
        <button
          onClick={() => appWindow.minimize()}
          className="h-12 w-11 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          aria-label="Minimize"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="h-12 w-11 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          aria-label="Maximize"
        >
          {isMaximized ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => appWindow.close()}
          className="h-12 w-11 flex items-center justify-center text-slate-400 hover:bg-rose-600 hover:text-white transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
