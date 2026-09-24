import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FolderCheck, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { ProcessBatchRequest, ProcessResult, ProgressPayload } from '../../types/watermark';

export const FooterBar: React.FC = () => {
  const {
    files,
    outputDir,
    setOutputDir,
    config,
    isProcessing,
    setIsProcessing,
    progress,
    setProgress,
  } = useAppStore();

  const [lastResult, setLastResult] = useState<ProcessResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectOutputDir = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        setOutputDir(selected);
      }
    } catch (err) {
      console.error('Error selecting output directory:', err);
    }
  };

  const handleStartProcessing = async () => {
    if (files.length === 0) {
      setErrorMsg('Please add at least one image to watermark.');
      return;
    }
    if (!outputDir) {
      setErrorMsg('Please select an output folder first.');
      return;
    }
    if (!config.useText && !config.useImage) {
      setErrorMsg('Enable either text or logo watermark in settings.');
      return;
    }

    setErrorMsg(null);
    setLastResult(null);
    setIsProcessing(true);
    setProgress({ current: 0, total: files.length, currentFile: 'Starting...' });

    const unlisten = await listen<ProgressPayload>('watermark-progress', (event) => {
      setProgress({
        current: event.payload.current,
        total: event.payload.total,
        currentFile: event.payload.currentFile,
      });
    });

    try {
      const req: ProcessBatchRequest = {
        files: files.map((f) => f.path),
        outputDir,
        config,
      };

      const result: ProcessResult = await invoke('process_watermark_batch', {
        request: req,
      });

      setLastResult(result);
    } catch (err: any) {
      setErrorMsg(typeof err === 'string' ? err : err.message || 'Processing failed');
    } finally {
      unlisten();
      setIsProcessing(false);
    }
  };

  return (
    <footer className="h-16 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
      {/* Output Dir Selector */}
      <div className="flex items-center gap-3 flex-1 max-w-xl mr-4">
        <button
          onClick={handleSelectOutputDir}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded font-medium transition"
        >
          <FolderCheck className="w-3.5 h-3.5 text-emerald-400" />
          Choose Output Folder
        </button>
        <span className="truncate text-[11px] text-slate-600 dark:text-slate-400 font-mono">
          {outputDir ? outputDir : 'No output folder chosen yet'}
        </span>
      </div>

      {/* Status & Feedback */}
      <div className="flex items-center gap-3">
        {errorMsg && (
          <div className="flex items-center gap-1.5 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {lastResult && !isProcessing && (
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              Done! {lastResult.succeeded}/{lastResult.total} images exported.
            </span>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 text-sky-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              Processing {progress.current}/{progress.total} ({progress.currentFile})
            </span>
          </div>
        )}

        {/* Start Export Button */}
        <button
          onClick={handleStartProcessing}
          disabled={isProcessing || files.length === 0 || !outputDir}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs shadow-md transition ${
            isProcessing || files.length === 0 || !outputDir
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
              : 'bg-sky-500 hover:bg-sky-400 text-slate-950 hover:shadow-sky-500/20 active:scale-95'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {isProcessing ? 'Processing...' : 'Apply & Export All'}
        </button>
      </div>
    </footer>
  );
};
