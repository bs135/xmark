import React, { useState } from 'react';
import { X, RefreshCw, CheckCircle2, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { openUrl } from '@tauri-apps/plugin-opener';
import { checkForUpdate, type UpdateCheckResult } from '../../utils/updateCheck';

const REPO_URL = 'https://github.com/bs135/xmark';

interface AboutDialogProps {
  onClose: () => void;
}

type CheckState = 'idle' | 'checking' | 'error';

export const AboutDialog: React.FC<AboutDialogProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [checkState, setCheckState] = useState<CheckState>('idle');
  const [result, setResult] = useState<UpdateCheckResult | null>(null);

  const handleCheckForUpdates = async () => {
    setCheckState('checking');
    setResult(null);
    try {
      const res = await checkForUpdate();
      setResult(res);
      setCheckState('idle');
    } catch {
      setCheckState('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-[380px] rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('about.title')}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition"
            aria-label={t('about.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center text-center gap-1">
          <div className="w-14 h-14 rounded-lg overflow-hidden shadow-md mb-1">
            <img src="/favicon.svg" alt="xMark" className="w-full h-full" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">xMark</h3>
          <span className="text-[11px] text-sky-500 dark:text-sky-400 font-semibold">
            {t('about.version', { version: __APP_VERSION__ })}
          </span>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('about.tagline')}</p>
        </div>

        <div className="px-5 pb-4 flex flex-col gap-1.5 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-500">{t('about.author')}</span>
            <span className="font-medium">bs135</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-500">{t('about.license')}</span>
            <span className="font-medium">MIT</span>
          </div>
          <button
            onClick={() => void openUrl(REPO_URL)}
            className="flex items-center justify-between hover:text-sky-500 dark:hover:text-sky-400 transition"
          >
            <span className="text-slate-500 dark:text-slate-500">{t('about.sourceCode')}</span>
            <span className="font-medium flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" />
              GitHub
            </span>
          </button>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={handleCheckForUpdates}
            disabled={checkState === 'checking'}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkState === 'checking' ? 'animate-spin' : ''}`} />
            {checkState === 'checking' ? t('about.checking') : t('about.checkForUpdates')}
          </button>

          {checkState === 'error' && (
            <p className="mt-2 text-[11px] text-rose-500 text-center">{t('about.checkFailed')}</p>
          )}

          {result && !result.hasUpdate && checkState === 'idle' && (
            <p className="mt-2 text-[11px] text-emerald-500 text-center flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('about.upToDate')}
            </p>
          )}

          {result?.hasUpdate && (
            <div className="mt-2 flex flex-col items-center gap-1.5">
              <p className="text-[11px] text-amber-500 text-center">
                {t('about.updateAvailable', { version: result.latestVersion })}
              </p>
              <button
                onClick={() => result.releaseUrl && void openUrl(result.releaseUrl)}
                className="flex items-center gap-1 text-[11px] font-semibold text-sky-500 dark:text-sky-400 hover:underline"
              >
                {t('about.viewRelease')}
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
