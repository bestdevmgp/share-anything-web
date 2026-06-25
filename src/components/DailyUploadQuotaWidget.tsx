import React, { useCallback, useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { useTranslation } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { fileAPI, DailyQuotaResponse } from '../services/api';
import { formatFileSize } from '../utils/format';

const DailyUploadQuotaWidget: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [quota, setQuota] = useState<DailyQuotaResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const fetchQuota = useCallback(async () => {
    try {
      const data = await fileAPI.getDailyQuota();
      setQuota(data);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota, isAuthenticated]);

  useEffect(() => {
    const refresh = () => fetchQuota();
    window.addEventListener('upload:complete', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('upload:complete', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [fetchQuota]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (failed) return null;

  if (!quota) {
    return (
      <Card className="p-5 shadow-none border-[3px] border-foreground/[0.09]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex items-center justify-between gap-2 mt-2">
          <Skeleton className="h-4 w-20" />
          {!isAuthenticated && <Skeleton className="h-4 w-40" />}
        </div>
      </Card>
    );
  }

  const { used_bytes, limit_bytes, remaining_bytes } = quota;
  const pct = limit_bytes > 0 ? Math.min(100, (used_bytes / limit_bytes) * 100) : 0;
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary';

  const resetMs = new Date(quota.resets_at).getTime();
  const minutesLeft = Number.isFinite(resetMs) ? Math.max(0, Math.floor((resetMs - now) / 60000)) : 0;
  const hoursLeft = Math.floor(minutesLeft / 60);
  const resetText = hoursLeft > 0
    ? t('quota.resetsInHm', { h: hoursLeft, m: minutesLeft % 60 })
    : t('quota.resetsInM', { m: minutesLeft });

  return (
    <Card className="p-5 shadow-none border-[3px] border-foreground/[0.09]">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {t('quota.title')}
          </span>
          <span className="text-xs text-muted-foreground truncate">{resetText}</span>
        </div>
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
          {t('quota.remaining', { remaining: formatFileSize(remaining_bytes) })}
        </span>
      </div>

      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={`${barColor} h-full rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 mt-2">
        <span className="text-xs text-muted-foreground">
          {t('quota.usedOfLimit', {
            used: formatFileSize(used_bytes),
            limit: formatFileSize(limit_bytes),
          })}
        </span>
        {!isAuthenticated && (
          <span className="text-xs text-muted-foreground text-right">
            {t('quota.loginForMore')}
          </span>
        )}
      </div>
    </Card>
  );
};

export default DailyUploadQuotaWidget;
