import React, { useCallback, useEffect, useState } from 'react';
import { Card } from './ui/card';
import { useTranslation } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { fileAPI, DailyQuotaResponse } from '../services/api';
import { formatFileSize } from '../utils/format';

/**
 * Compact daily-upload-quota meter shown at the bottom of the home page.
 * Fetches the caller's usage from GET /file/quota (guest 10GB/day per IP,
 * signed-in 1TB/day per user). Renders nothing on failure so the page is never
 * broken if the endpoint is unavailable.
 */
const DailyUploadQuotaWidget: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [quota, setQuota] = useState<DailyQuotaResponse | null>(null);
  const [failed, setFailed] = useState(false);

  const fetchQuota = useCallback(async () => {
    try {
      const data = await fileAPI.getDailyQuota();
      setQuota(data);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  // Refetch on mount and whenever auth state flips (login/logout changes tier).
  useEffect(() => {
    fetchQuota();
  }, [fetchQuota, isAuthenticated]);

  // Refresh after an upload completes or when the tab regains focus.
  useEffect(() => {
    const refresh = () => fetchQuota();
    window.addEventListener('upload:complete', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('upload:complete', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [fetchQuota]);

  if (failed || !quota) return null;

  const { used_bytes, limit_bytes, remaining_bytes } = quota;
  const pct = limit_bytes > 0 ? Math.min(100, (used_bytes / limit_bytes) * 100) : 0;
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary';

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {t('quota.title')}
          </span>
          <span className="text-xs text-muted-foreground truncate">{t('quota.resets')}</span>
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
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {t('quota.loginForMore')}
          </span>
        )}
      </div>
    </Card>
  );
};

export default DailyUploadQuotaWidget;
