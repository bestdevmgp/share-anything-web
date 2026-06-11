import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDownIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { useShareList } from '../../hooks/useShareList';
import { formatFileSize } from '../../utils/format';
import FileThumbnail from '../FileThumbnail';
import CopyButton from '../CopyButton';
import { cn } from '../../lib/utils';

interface Props {
  refreshKey: number;
}

const formatCompactDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  return `${month}.${day} ${hours}:${mins}`;
};

const RecentShares: React.FC<Props> = ({ refreshKey }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { items, requestDelete } = useShareList(refreshKey);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (items.length === 0) return null;

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
          {t('unifiedBox.recentTitle')}
        </h4>
        {isAuthenticated && (
          <Link
            to="/history"
            className="text-[11px] text-muted-foreground can-hover:hover:text-foreground underline"
          >
            {t('unifiedBox.viewAll')} →
          </Link>
        )}
      </div>
      <div className="px-4 pb-4 space-y-2">
        {items.map((s) => {
          const { text: remainText, expired } = remainingLabel(s.expiresAt);
          const isBundle = s.fileNames.length > 1;
          const isOpen = expanded === s.code;
          const url = `${window.location.origin}/download/${s.code}`;

          return (
            <div
              key={s.code}
              className={cn(
                'bg-muted rounded-lg border border-foreground/[0.09] overflow-hidden transition-colors',
                expired && 'opacity-60'
              )}
            >
              <div
                role="button"
                onClick={() => {
                  if (isBundle) setExpanded(isOpen ? null : s.code);
                  else navigate(`/download/${s.code}`);
                }}
                className="w-full flex items-center px-3 py-2.5 text-left cursor-pointer can-hover:hover:bg-accent active:bg-accent transition-colors"
              >
                <div className="flex-shrink-0 mr-3">
                  {isBundle ? (
                    <div className="relative w-11 h-11">
                      <div className="absolute -right-1 -top-1 w-11 h-11 rounded bg-card border border-foreground/[0.12]" />
                      <div className="relative">
                        <FileThumbnail source={null} fileName={s.fileNames[0] || 'file'} size="sm" />
                      </div>
                    </div>
                  ) : (
                    <FileThumbnail source={null} fileName={s.fileNames[0] || 'file'} size="sm" />
                  )}
                </div>
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-baseline min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {s.fileNames[0]}
                    </span>
                    {isBundle && (
                      <span className="text-sm text-muted-foreground font-normal flex-shrink-0 ml-1">
                        {t('unifiedBox.bundleExtraCount', { count: s.fileNames.length - 1 })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(s.totalSize)} · {remainText}
                  </p>
                  <p className="text-xs text-muted-foreground/50 truncate mt-0.5">
                    <span className="font-mono">{s.code}</span> · {formatCompactDate(s.createdAt)}
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
                    onClick={(e) => { e.stopPropagation(); requestDelete(s.code); }}
                    className="p-1.5 rounded-lg text-muted-foreground/50 can-hover:hover:text-red-600 dark:can-hover:hover:text-red-400 can-hover:hover:bg-red-100/50 dark:can-hover:hover:bg-red-500/15 active:text-red-600 dark:active:text-red-400"
                    title={t('common.delete')}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                  {isBundle && (
                    <ChevronDownIcon
                      className={cn(
                        'w-5 h-5 text-muted-foreground/50 transition-transform',
                        isOpen && 'rotate-180'
                      )}
                    />
                  )}
                </div>
              </div>

              {isBundle && isOpen && (
                <div className="px-3 pb-3">
                  <div className="border-t border-foreground/[0.08] pt-2.5 space-y-2">
                    {s.fileNames.map((name, i) => (
                      <div key={`${name}-${i}`} className="flex items-center gap-3 min-w-0">
                        <FileThumbnail source={null} fileName={name} size="sm" />
                        <span className="text-sm text-foreground/80 truncate">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentShares;
