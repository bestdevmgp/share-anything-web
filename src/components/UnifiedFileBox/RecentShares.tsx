import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { listSessions, RecentSession } from '../../utils/recentSessions';
import { formatFileSize } from '../../utils/format';
import FileThumbnail from '../FileThumbnail';
import CopyButton from '../CopyButton';
import { cn } from '../../lib/utils';

interface Props {
  refreshKey: number;
}

const RecentShares: React.FC<Props> = ({ refreshKey }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<RecentSession[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setItems(listSessions());
  }, [refreshKey]);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
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
      <div className="px-2 pb-2 space-y-1">
        {items.map((s) => {
          const minLeft = Math.round(
            (new Date(s.expiresAt).getTime() - Date.now()) / 60000
          );
          const expired = minLeft <= 0;
          const isBundle = s.fileNames.length > 1;
          const isOpen = expanded === s.code;
          const url = `${window.location.origin}/download/${s.code}`;

          return (
            <div
              key={s.code}
              className={cn('rounded-lg', isOpen && 'bg-foreground/[0.03]')}
            >
              {/* 행 헤더 — 묶음이면 클릭 시 펼침 */}
              <div
                role={isBundle ? 'button' : undefined}
                onClick={() => {
                  if (isBundle) setExpanded(isOpen ? null : s.code);
                }}
                className={cn(
                  'w-full flex items-center px-2 py-1.5 rounded-lg text-left',
                  isBundle && 'cursor-pointer',
                  !isOpen && isBundle && 'can-hover:hover:bg-foreground/5',
                  expired && 'opacity-50'
                )}
              >
                <div className="flex-shrink-0 mr-2">
                  <FileThumbnail
                    source={null}
                    fileName={s.fileNames[0] || 'file'}
                    size="sm"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {s.fileNames[0]}
                    {isBundle ? ` 외 ${s.fileNames.length - 1}개` : ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-mono">{s.code}</span>
                    {' · '}
                    {formatFileSize(s.totalSize)}
                    {' · '}
                    {expired
                      ? t('unifiedBox.expired')
                      : t('unifiedBox.remainingMinutes', { minutes: minLeft })}
                  </p>
                </div>
                <div className="flex items-center flex-shrink-0">
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
                    className="p-1.5 rounded-lg text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:bg-foreground/10"
                    iconClassName="w-4 h-4"
                    iconCopiedClass="text-green-600 dark:text-green-400"
                    title={t('common.copy')}
                  />
                  {isBundle && (
                    <ChevronDownIcon
                      className={cn(
                        'w-4 h-4 text-muted-foreground/50 transition-transform ml-0.5',
                        isOpen && 'rotate-180'
                      )}
                    />
                  )}
                </div>
              </div>

              {/* 펼침 영역 — 묶음 안 파일 목록 */}
              {isBundle && isOpen && (
                <div className="px-2 pb-2 pl-10 space-y-1.5">
                  {s.fileNames.map((name, i) => (
                    <div
                      key={`${name}-${i}`}
                      className="flex items-center gap-2 min-w-0"
                    >
                      <div className="flex-shrink-0">
                        <FileThumbnail source={null} fileName={name} size="sm" />
                      </div>
                      <span className="text-xs text-muted-foreground truncate">
                        {name}
                      </span>
                    </div>
                  ))}
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
