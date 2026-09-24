import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from './components/layout/Header';
import { FooterBar } from './components/layout/FooterBar';
import { UpdateTipBanner } from './components/layout/UpdateTipBanner';
import { FileListPanel } from './components/file-list/FileListPanel';
import { WatermarkConfigPanel } from './components/watermark/WatermarkConfigPanel';
import { LivePreview } from './components/preview/LivePreview';
import { useAppStore } from './store/useAppStore';
import { loadSettings } from './store/persist';
import { checkForUpdate, type UpdateCheckResult } from './utils/updateCheck';

function App() {
  const hydrateSettings = useAppStore((s) => s.hydrateSettings);
  const theme = useAppStore((s) => s.theme);
  const language = useAppStore((s) => s.language);
  const { i18n } = useTranslation();
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkForUpdate().then((result) => {
      if (!cancelled && result.hasUpdate) setUpdateInfo(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadSettings().then((settings) => {
      if (cancelled) return;
      hydrateSettings({
        outputDir: settings.outputDir,
        config: settings.config,
        theme: settings.theme,
        language: settings.language,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [hydrateSettings]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language, i18n]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      <Header />
      {updateInfo?.hasUpdate && updateInfo.latestVersion && updateInfo.releaseUrl && (
        <UpdateTipBanner
          version={updateInfo.latestVersion}
          releaseUrl={updateInfo.releaseUrl}
          onDismiss={() => setUpdateInfo(null)}
        />
      )}
      
      {/* 3-Column Studio Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Image Files Selector */}
        <div className="w-72 flex-shrink-0">
          <FileListPanel />
        </div>

        {/* Center: Live Preview Viewport */}
        <div className="flex-1 flex overflow-hidden">
          <LivePreview />
        </div>

        {/* Right Column: Watermark Controls & Customization */}
        <div className="w-80 flex-shrink-0">
          <WatermarkConfigPanel />
        </div>
      </div>

      <FooterBar />
    </div>
  );
}

export default App;
