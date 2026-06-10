import React, { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Link } from 'react-router-dom';
import { ArrowUpTrayIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { listSessions, RecentSession } from '../../utils/recentSessions';
import { toast } from '../../context/ToastContext';
import { formatFileSize } from '../../utils/format';
import FileThumbnail from '../FileThumbnail';
import { cn } from '../../lib/utils';

interface Props {
  onNormal: (files: File[]) => void;
  onSecure: (files: File[]) => void;
  recentRefreshKey: number;
}

const IdleUpload: React.FC<Props> = ({
  onNormal,
  onSecure,
  recentRefreshKey,
}) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [recent, setRecent] = useState<RecentSession[]>([]);

  useEffect(() => {
    setRecent(listSessions());
  }, [recentRefreshKey]);

  const normalDz = useDropzone({ onDrop: onNormal, multiple: true });
  const secureDz = useDropzone({ onDrop: onSecure, multiple: true });

  const copyCode = async (s: RecentSession) => {
    const expired = new Date(s.expiresAt).getTime() <= Date.now();
    if (expired) {
      toast.error(t('unifiedBox.expiredCodeToast'));
      return;
    }
    const url = `${window.location.origin}/download/${s.code}`;
    await navigator.clipboard.writeText(url);
    toast.success(t('quickAccess.shareSuccess'));
  };

  return (
    <div className="flex flex-col">
      {/* 좌·우 분할 — 자체 min-h로 박스 기본 크기 보장 */}
      <div className="flex flex-col md:flex-row min-h-[420px] md:min-h-[412px]">
        <div
          {...normalDz.getRootProps()}
          className={cn(
            'flex-1 flex flex-col items-center justify-center px-4 py-6 cursor-pointer transition-colors',
            'border-b md:border-b-0 md:border-r border-foreground/[0.09]',
            normalDz.isDragActive
              ? 'bg-primary/10'
              : 'can-hover:hover:bg-foreground/5 active:bg-foreground/5'
          )}
        >
          <input {...normalDz.getInputProps()} />
          <ArrowUpTrayIcon
            className="w-16 h-16 md:w-20 md:h-20 text-primary mb-4"
            strokeWidth={2.5}
          />
          <p className="text-lg md:text-xl text-foreground font-semibold mb-1.5">
            {t('unifiedBox.transferNormal')}
          </p>
          <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-[250px] min-h-[2.85rem]">
            {t('unifiedBox.normalDescription')}
          </p>
        </div>
        <div
          {...secureDz.getRootProps()}
          className={cn(
            'flex-1 flex flex-col items-center justify-center px-4 py-6 cursor-pointer transition-colors',
            secureDz.isDragActive
              ? 'bg-primary/10'
              : 'can-hover:hover:bg-foreground/5 active:bg-foreground/5'
          )}
        >
          <input {...secureDz.getInputProps()} />
          <LockClosedIcon
            className="w-16 h-16 md:w-20 md:h-20 text-foreground mb-4 scale-[0.92]"
            strokeWidth={2.5}
          />
          <p className="text-lg md:text-xl text-foreground font-semibold mb-1.5">
            {t('unifiedBox.transferSecure')}
          </p>
          <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-[250px] min-h-[2.85rem]">
            {t('unifiedBox.secureDescription')}
          </p>
        </div>
      </div>

      {/* 업로드 기록 — 일반 전송 기록만. 있으면 박스가 늘어남 */}
      {recent.length > 0 && (
        <div className="border-t border-foreground/[0.09]">
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground/70">
              {t('unifiedBox.recentTitle')}
            </h4>
            {isAuthenticated && (
              <Link
                to="/history"
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] text-muted-foreground can-hover:hover:text-foreground underline"
              >
                {t('unifiedBox.viewAll')} →
              </Link>
            )}
          </div>
          <div className="px-2 pb-2 space-y-1">
            {recent.map((s) => {
              const minLeft = Math.round(
                (new Date(s.expiresAt).getTime() - Date.now()) / 60000
              );
              const expired = minLeft <= 0;
              return (
                <button
                  key={s.code}
                  onClick={(e) => {
                    e.stopPropagation();
                    copyCode(s);
                  }}
                  className={`w-full flex items-center px-2 py-1.5 rounded can-hover:hover:bg-foreground/5 text-left ${
                    expired ? 'opacity-50' : ''
                  }`}
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
                      {s.fileNames.length > 1 ? ` 외 ${s.fileNames.length - 1}개` : ''}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-mono">
                        {s.code.slice(0, 3)} · {s.code.slice(3)}
                      </span>
                      {' · '}
                      {formatFileSize(s.totalSize)}
                      {' · '}
                      {expired
                        ? t('unifiedBox.expired')
                        : t('unifiedBox.remainingMinutes', { minutes: minLeft })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default IdleUpload;
