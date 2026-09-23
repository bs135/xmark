import React from 'react';
import { Layers } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between select-none">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-sky-500 rounded flex items-center justify-center shadow-md">
          <Layers className="w-4 h-4 text-slate-950 font-bold" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <h1 className="text-sm font-bold tracking-tight text-white m-0">xmark</h1>
          <span className="text-[10px] text-sky-400 font-semibold px-1.5 py-0.2 bg-sky-950 border border-sky-800 rounded">
            v0.1.0
          </span>
        </div>
      </div>
      <div className="text-[11px] text-slate-400">
        Cross-Platform High-Performance Watermark Tool
      </div>
    </header>
  );
};
