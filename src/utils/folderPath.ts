export const MAX_RELATIVE_PATH_LENGTH = 1024;

const JUNK_NAMES = new Set([
  '.ds_store',
  'thumbs.db',
  'desktop.ini',
]);

const JUNK_SEGMENTS = new Set([
  '__macosx',
]);

export function sanitizeRelativePath(raw: string | null | undefined): string {
  if (!raw) return '';

  let path = raw.replace(/\\/g, '/').replace(/\0/g, '');

  const segments = path
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '.' && s !== '..');

  const result = segments.join('/');

  if (result.length > MAX_RELATIVE_PATH_LENGTH) return '';
  return result;
}

export function isJunkPath(pathOrName: string): boolean {
  if (!pathOrName) return false;
  const segments = pathOrName.replace(/\\/g, '/').split('/').filter(Boolean);
  if (segments.length === 0) return false;

  for (const seg of segments) {
    if (JUNK_SEGMENTS.has(seg.toLowerCase())) return true;
  }

  const leaf = segments[segments.length - 1].toLowerCase();
  return JUNK_NAMES.has(leaf);
}
