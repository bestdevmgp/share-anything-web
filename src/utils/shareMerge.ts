import { UploadGroup, UploadHistoryItem } from '../types';
import { RecentSession } from './recentSessions';

export interface MergedShare {
  code: string;
  fileNames: string[];
  totalSize: number;
  createdAt: string;
  expiresAt: string;
  source: 'local' | 'server' | 'both';
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
    });
  }
  for (const s of local) {
    const existing = byCode.get(s.code);
    if (existing) {
      existing.source = 'both';
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
