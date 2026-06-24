import { UploadGroup, UploadHistoryItem } from '../types';
import { RecentSession } from './recentSessions';

export interface MergedShare {
  code: string;
  fileNames: string[];
  totalSize: number;
  createdAt: string;
  expiresAt: string;
  source: 'local' | 'server' | 'both';
  firstFileId?: string;
  hasPassword?: boolean;
  // Full file list (with relative_path) for server-sourced shares, so the recent-shares
  // box can build the folder tree instantly on expand — no fetch, no flat-then-grouped flash.
  files?: { id: string; file_name: string; file_size: number; relative_path?: string }[];
}

export const groupUploads = (items: UploadHistoryItem[]): UploadGroup[] => {
  const map = new Map<string, UploadHistoryItem[]>();
  for (const it of items) {
    const list = map.get(it.share_code);
    if (list) list.push(it);
    else map.set(it.share_code, [it]);
  }
  const groups: UploadGroup[] = [];
  map.forEach((files, shareCode) => {
    const totalSize = files.reduce((s, f) => s + f.file_size, 0);
    const downloadCount = files.reduce((s, f) => s + f.download_count, 0);
    const hasPassword = files.some((f) => f.has_password);
    const isOneTime = !!files[0]?.is_one_time;
    const expiresAt = files.reduce(
      (min, f) => (new Date(f.expires_at) < new Date(min) ? f.expires_at : min),
      files[0].expires_at
    );
    const createdAt = files.reduce(
      (min, f) => (new Date(f.created_at) < new Date(min) ? f.created_at : min),
      files[0].created_at
    );
    groups.push({ shareCode, files, totalSize, downloadCount, hasPassword, isOneTime, expiresAt, createdAt });
  });
  groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return groups;
};

export const mergeShares = (
  local: RecentSession[],
  serverGroups: UploadGroup[]
): MergedShare[] => {
  const byCode = new Map<string, MergedShare>();
  for (const g of serverGroups) {
    byCode.set(g.shareCode, {
      code: g.shareCode,
      fileNames: g.files.map((f) => f.file_name),
      totalSize: g.totalSize,
      createdAt: g.createdAt,
      expiresAt: g.expiresAt,
      source: 'server',
      firstFileId: g.files[0]?.id,
      hasPassword: g.hasPassword,
      files: g.files.map((f) => ({
        id: f.id,
        file_name: f.file_name,
        file_size: f.file_size,
        relative_path: f.relative_path,
      })),
    });
  }
  for (const s of local) {
    const existing = byCode.get(s.code);
    if (existing) {
      existing.source = 'both';
      // The local session preserves the order the user uploaded the files in; the server
      // (getUploads) returns its own order. mergeShares runs first with local-only data
      // (sync) then again once server data arrives (async), so without this the title's
      // first filename would flip on that swap. Reorder the server file list to match the
      // local (upload) order so the title, thumbnail, and tree stay stable.
      if (existing.files && existing.files.length) {
        const rank = new Map<string, number>();
        s.fileNames.forEach((n, i) => { if (!rank.has(n)) rank.set(n, i); });
        const ordered = [...existing.files].sort(
          (a, b) =>
            (rank.has(a.file_name) ? (rank.get(a.file_name) as number) : Number.MAX_SAFE_INTEGER) -
            (rank.has(b.file_name) ? (rank.get(b.file_name) as number) : Number.MAX_SAFE_INTEGER)
        );
        existing.files = ordered;
        existing.fileNames = ordered.map((f) => f.file_name);
        existing.firstFileId = ordered[0]?.id;
      }
    } else {
      byCode.set(s.code, {
        code: s.code,
        fileNames: s.fileNames,
        totalSize: s.totalSize,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        source: 'local',
      });
    }
  }
  return Array.from(byCode.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const localOnlyGroups = (
  local: RecentSession[],
  serverCodes: Set<string>
): UploadGroup[] =>
  local
    .filter((s) => !serverCodes.has(s.code))
    .map((s) => ({
      shareCode: s.code,
      files: s.fileNames.map((name, i) => ({
        id: `local:${s.code}:${i}`,
        share_code: s.code,
        file_name: name,
        file_size: i === 0 ? s.totalSize : 0,
        file_type: '',
        has_password: false,
        is_one_time: false,
        expires_at: s.expiresAt,
        created_at: s.createdAt,
        download_url: '',
        qr_code: '',
        download_count: 0,
      })),
      totalSize: s.totalSize,
      downloadCount: 0,
      hasPassword: false,
      isOneTime: false,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    }));
