import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';
import { toast } from '../../context/ToastContext';
import { useSharePreviews } from './useSharePreviews';
import { listDownloads, removeDownload, RecentDownload } from '../../utils/recentDownloads';
import { MergedShare } from '../../utils/shareMerge';
import { formatFileSize } from '../../utils/format';
import FileThumbnail from '../FileThumbnail';
import CopyButton from '../CopyButton';
import { cn } from '../../lib/utils';

const formatCompactDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  return `${month}.${day} ${hours}:${mins}`;
};

const RecentDownloads: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [downloads, setDownloads] = useState<RecentDownload[]>(() => listDownloads());

  const mergedItems: MergedShare[] = downloads.map((d) => ({
    code: d.code,
    fileNames: d.fileNames,
    totalSize: d.totalSize,
    createdAt: d.downloadedAt,
    expiresAt: d.expiresAt,
    source: 'server' as const,
    firstFileId: d.firstFileId,
  }));
  const previews = useSharePreviews(mergedItems);

  const handleRemove = (code: string) => {
    removeDownload(code);
    setDownloads((prev) => prev.filter((d) => d.code !== code));
  };

  if (downloads.length === 0) return null;

  const remainingLabel = (expiresAt: string): { text: string; expired: boolean } => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return { text: t('unifiedBox.expired'), expired: true };
    const hours = Math.floor(diff / 3_600_000);
    if (hours >= 1) return { text: t('unifiedBox.remainingHours', { hours }), expired: false };
    const minutes = Math.max(1, Math.floor(diff / 60_000));
    return { text: t('unifiedBox.remainingMinutes', { minutes }), expired: false };
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h4 className="text-xs font-semibold text-foreground/70">
          {t('unifiedBox.recentDownloadsTitle')}
          <span className="text-muted-foreground/50 font-normal ml-1">
            ({t('unifiedBox.sessionCount', { count: downloads.length })})
          </span>
        </h4>
      </div>
      <div className="px-4 pb-4 space-y-2 max-h-[420px] overflow-y-auto">
        {downloads.map((d) => {
          const { text: remainText, expired } = remainingLabel(d.expiresAt);
          const isBundle = d.fileNames.length > 1;
          const url = `${window.location.origin}/download/${d.code}`;

          return (
            <div
              key={d.code}
              className={cn(
                'bg-muted rounded-lg border border-foreground/[0.09] overflow-hidden transition-colors',
                expired && 'opacity-60'
              )}
            >
              <div
                role="button"
                onClick={() => navigate(`/download/${d.code}`)}
                className="w-full flex items-center px-3 py-2.5 text-left cursor-pointer can-hover:hover:bg-accent active:bg-accent transition-colors"
              >
                <div className="flex-shrink-0 mr-3">
                  {isBundle ? (
                    <div className="relative w-11 h-11">
                      <div className="absolute -bottom-1.5 -right-1.5 w-11 h-11 rounded-md bg-muted border border-foreground/[0.15]" />
                      <div className="absolute -bottom-[3px] -right-[3px] w-11 h-11 rounded-md bg-card border border-foreground/[0.15]" />
                      <div className="relative">
                        <FileThumbnail source={previews[d.code] ?? null} fileName={d.fileNames[0] || 'file'} size="sm" />
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 z-10 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-card">
                        {d.fileNames.length}
                      </span>
                    </div>
                  ) : (
                    <FileThumbnail source={previews[d.code] ?? null} fileName={d.fileNames[0] || 'file'} size="sm" />
                  )}
                </div>
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-baseline min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {d.fileNames[0]}
                    </span>
                    {isBundle && (
                      <span className="text-sm text-muted-foreground font-normal flex-shrink-0 ml-1">
                        {t('unifiedBox.bundleExtraCount', { count: d.fileNames.length - 1 })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(d.totalSize)} · {remainText}
                  </p>
                  <p className="text-xs text-muted-foreground/50 truncate mt-0.5">
                    <span className="font-mono">{d.code}</span> · {formatCompactDate(d.downloadedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <CopyButton
                    value={url}
                    stopPropagation
                    onCopied={() => {
                      if (expired) {
                        toast.error(t('unifiedBox.expiredCodeToast'));
                      } else {
                        toast.success(t('quickAccess.shareSuccess'));
                      }
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:bg-foreground/10 active:text-muted-foreground active:bg-foreground/10"
                    iconClassName="w-5 h-5"
                    iconCopiedClass="text-green-600 dark:text-green-400"
                    title={t('common.copy')}
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemove(d.code); }}
                    className="p-1.5 rounded-lg text-muted-foreground can-hover:hover:text-red-600 dark:can-hover:hover:text-red-400 can-hover:hover:bg-red-100/50 dark:can-hover:hover:bg-red-500/15 active:text-red-600 dark:active:text-red-400"
                    title={t('common.delete')}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentDownloads;
