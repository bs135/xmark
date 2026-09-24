import { load, type Store } from '@tauri-apps/plugin-store';
import type { WatermarkConfig } from '../types/watermark';

const SETTINGS_FILE = 'settings.json';

export interface PersistedSettings {
  outputDir?: string;
  config?: Partial<WatermarkConfig>;
  theme?: 'dark' | 'light';
  language?: 'en' | 'vi';
}

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load(SETTINGS_FILE, { autoSave: false });
  }
  return storePromise;
}

export async function loadSettings(): Promise<PersistedSettings> {
  try {
    const store = await getStore();
    const outputDir = await store.get<string>('outputDir');
    const config = await store.get<Partial<WatermarkConfig>>('config');
    const theme = await store.get<'dark' | 'light'>('theme');
    const language = await store.get<'en' | 'vi'>('language');
    return { outputDir, config, theme, language };
  } catch (err) {
    console.error('Failed to load persisted settings:', err);
    return {};
  }
}

export async function saveSettings(settings: PersistedSettings): Promise<void> {
  try {
    const store = await getStore();
    if (settings.outputDir !== undefined) await store.set('outputDir', settings.outputDir);
    if (settings.config !== undefined) await store.set('config', settings.config);
    if (settings.theme !== undefined) await store.set('theme', settings.theme);
    if (settings.language !== undefined) await store.set('language', settings.language);
    await store.save();
  } catch (err) {
    console.error('Failed to save persisted settings:', err);
  }
}
