import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { toast } from '../context/ToastContext';
import { userAPI, fileAPI } from '../services/api';
import { listSessions, removeSession, RecentSession } from '../utils/recentSessions';
import { groupUploads, mergeShares, MergedShare } from '../utils/shareMerge';
import { UploadGroup } from '../types';

const UNDO_MS = 5000;

export const useShareList = (refreshKey?: number) => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [local, setLocal] = useState<RecentSession[]>([]);
  const [serverGroups, setServerGroups] = useState<UploadGroup[]>([]);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLocal(listSessions());
    if (!isAuthenticated) {
      setServerGroups([]);
      return;
    }
    try {
      setLoading(true);
      const res = await userAPI.getUploads(20, 0);
      setServerGroups(groupUploads(res.items));
    } catch {
      setServerGroups([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    const onRefresh = () => load();
    window.addEventListener('recent-shares:refresh', onRefresh);
    return () => window.removeEventListener('recent-shares:refresh', onRefresh);
  }, [load]);

  const items: MergedShare[] = mergeShares(local, serverGroups).filter(
    (i) => !pending.has(i.code)
  );

  const requestDelete = useCallback((code: string) => {
    setPending((prev) => new Set(prev).add(code));

    const restore = () =>
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });

    const commit = async () => {
      try {
        await fileAPI.revokeShare(code);
      } catch (e: any) {
        const status = e?.response?.status;
        if (status && status !== 404) {
          toast.error(t('history.deleteFailed'));
          restore();
          return;
        }
      }
      removeSession(code);
      setLocal((prev) => prev.filter((s) => s.code !== code));
      setServerGroups((prev) => prev.filter((g) => g.shareCode !== code));
      restore();
    };

    toast.action(t('common.deleted'), {
      actionLabel: t('common.undo'),
      duration: UNDO_MS,
      onAction: restore,
      onAutoClose: commit,
    });
  }, [t]);

  return { items, loading, refresh: load, requestDelete };
};
