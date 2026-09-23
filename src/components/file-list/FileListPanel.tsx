import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FolderOpen, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { ImageFileInfo } from '../../types/watermark';

export const FileListPanel: React.FC = () => {
  const { files, selectedFileIndex, setSelectedFileIndex, addFiles, removeFile, clearFiles } =
    useAppStore();

  const handleSelectFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'],
          },
        ],
      });

      if (selected && Array.isArray(selected) && selected.length > 0) {
        const inspected: ImageFileInfo[] = await invoke('inspect_files', {
          filePaths: selected,
        });
        addFiles(inspected);
      }
    } catch (err) {
      console.error('Error opening files:', err);
    }
  };

  const handleSelectDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === 'string') {
        const scanned: ImageFileInfo[] = await invoke('scan_directory_images', {
          dirPath: selected,
        });
        addFiles(scanned);
      }
    } catch (err) {
      console.error('Error scanning folder:', err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-200">
      {/* Action Header */}
      <div className="p-3 border-b border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Source Images ({files.length})
          </span>
          {files.length > 0 && (
            <button
              onClick={clearFiles}
              title="Clear all files"
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={handleSelectFiles}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 rounded border border-slate-700 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            Add Images
          </button>
          <button
            onClick={handleSelectDirectory}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 rounded border border-slate-700 shadow-sm transition"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            Add Folder
          </button>
        </div>
      </div>

      {/* File List Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <ImageIcon className="w-10 h-10 mb-2 stroke-1 text-slate-600" />
            <p className="text-xs">No images loaded yet.</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Click buttons above to add photos or folders.
            </p>
          </div>
        ) : (
          files.map((file, idx) => {
            const isSelected = idx === selectedFileIndex;
            return (
              <div
                key={file.path}
                onClick={() => setSelectedFileIndex(idx)}
                className={`group flex items-center justify-between p-2 rounded cursor-pointer transition text-xs ${
                  isSelected
                    ? 'bg-sky-600/20 text-sky-200 border border-sky-500/30'
                    : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                  <span className="text-[10px] text-slate-500 font-mono w-4">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {file.width > 0 && `${file.width}×${file.height} · `}
                      {formatSize(file.size)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 transition"
                  title="Remove from list"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
