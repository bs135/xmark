import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { openUrl } from '@tauri-apps/plugin-opener';

interface UpdateTipBannerProps {
  version: string;
  releaseUrl: string;
  onDismiss: () => void;
}

export const UpdateTipBanner: React.FC<UpdateTipBannerProps> = ({
  version,
  releaseUrl,
  onDismiss,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-1.5 bg-sky-50 dark:bg-sky-950 border-b border-sky-200 dark:border-sky-900 text-xs text-sky-800 dark:text-sky-300">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
        <span>{t('update.newVersionAvailable', { version })}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => void openUrl(releaseUrl)}
          className="font-semibold hover:underline"
        >
          {t('update.viewDetails')}
        </button>
        <button
          onClick={onDismiss}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-sky-100 dark:hover:bg-sky-900 transition"
          aria-label={t('update.dismiss')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
