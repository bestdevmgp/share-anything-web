const KEY = 'recentSessions';
const MAX = 10;

export interface RecentSession {
  code: string;
  fileNames: string[];
  totalSize: number;
  expiresAt: string; // ISO8601
  createdAt: string; // ISO8601
}

const readAll = (): RecentSession[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = (list: RecentSession[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // quota / serialization errors are non-fatal
  }
};

export const listSessions = (): RecentSession[] => {
  const now = Date.now();
  return readAll().filter((s) => new Date(s.expiresAt).getTime() > now);
};

export const pushSession = (s: RecentSession): void => {
  const existing = readAll().filter((x) => x.code !== s.code);
  const next = [s, ...existing].slice(0, MAX);
  writeAll(next);
};

export const clearSessions = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};
