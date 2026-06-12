const KEY = 'recentDownloads';
const MAX = 12;

export interface RecentDownload {
  code: string;
  fileNames: string[];
  totalSize: number;
  expiresAt: string; // ISO8601
  downloadedAt: string; // ISO8601
  firstFileId?: string;
}

const readAll = (): RecentDownload[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = (list: RecentDownload[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // quota / serialization errors are non-fatal
  }
};

export const listDownloads = (): RecentDownload[] => {
  const now = Date.now();
  return readAll().filter((d) => new Date(d.expiresAt).getTime() > now);
};

export const pushDownload = (d: RecentDownload): void => {
  const existing = readAll().filter((x) => x.code !== d.code);
  const next = [d, ...existing].slice(0, MAX);
  writeAll(next);
};

export const removeDownload = (code: string): void => {
  writeAll(readAll().filter((d) => d.code !== code));
};
