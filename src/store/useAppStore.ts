import { create } from 'zustand';
import type { ImageFileInfo, WatermarkConfig } from '../types/watermark';

interface AppState {
  // Files
  files: ImageFileInfo[];
  selectedFileIndex: number;
  outputDir: string;
  setFiles: (files: ImageFileInfo[]) => void;
  addFiles: (files: ImageFileInfo[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  setSelectedFileIndex: (index: number) => void;
  setOutputDir: (dir: string) => void;

  // Watermark Settings
  config: WatermarkConfig;
  updateConfig: (patch: Partial<WatermarkConfig>) => void;
  resetConfig: () => void;

  // Processing state
  isProcessing: boolean;
  progress: { current: number; total: number; currentFile: string };
  setIsProcessing: (val: boolean) => void;
  setProgress: (p: { current: number; total: number; currentFile: string }) => void;
}

const defaultConfig: WatermarkConfig = {
  imagePath: undefined,
  useImage: false,
  imageScale: 0.25,
  text: '',
  useText: true,
  fontSize: 36,
  textColor: '#ffffff',
  opacity: 0.5,
  position: 'center',
  repeat: 'none',
  margin: 24,
  rotationDeg: 0,
};

export const useAppStore = create<AppState>((set) => ({
  files: [],
  selectedFileIndex: 0,
  outputDir: '',
  setFiles: (files) => set({ files, selectedFileIndex: 0 }),
  addFiles: (newFiles) =>
    set((state) => {
      // Deduplicate by file path
      const existingPaths = new Set(state.files.map((f) => f.path));
      const filtered = newFiles.filter((f) => !existingPaths.has(f.path));
      return { files: [...state.files, ...filtered] };
    }),
  removeFile: (index) =>
    set((state) => {
      const nextFiles = state.files.filter((_, i) => i !== index);
      const nextIndex = Math.min(state.selectedFileIndex, Math.max(0, nextFiles.length - 1));
      return { files: nextFiles, selectedFileIndex: nextIndex };
    }),
  clearFiles: () => set({ files: [], selectedFileIndex: 0 }),
  setSelectedFileIndex: (index) => set({ selectedFileIndex: index }),
  setOutputDir: (dir) => set({ outputDir: dir }),

  config: defaultConfig,
  updateConfig: (patch) =>
    set((state) => ({
      config: { ...state.config, ...patch },
    })),
  resetConfig: () => set({ config: defaultConfig }),

  isProcessing: false,
  progress: { current: 0, total: 0, currentFile: '' },
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setProgress: (progress) => set({ progress }),
}));
