import { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { FooterBar } from './components/layout/FooterBar';
import { FileListPanel } from './components/file-list/FileListPanel';
import { WatermarkConfigPanel } from './components/watermark/WatermarkConfigPanel';
import { LivePreview } from './components/preview/LivePreview';
import { useAppStore } from './store/useAppStore';
import { loadSettings } from './store/persist';

function App() {
  const hydrateSettings = useAppStore((s) => s.hydrateSettings);

  useEffect(() => {
    let cancelled = false;
    loadSettings().then((settings) => {
      if (cancelled) return;
      hydrateSettings({ outputDir: settings.outputDir, config: settings.config });
    });
    return () => {
      cancelled = true;
    };
  }, [hydrateSettings]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      <Header />
      
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
