import { sanitizeRelativePath } from './folderPath';

const pathRegistry = new WeakMap<File, string>();

export function setRelativePath(file: File, relativePath: string): void {
  if (relativePath) pathRegistry.set(file, relativePath);
}

export function getRelativePath(file: File): string {
  const explicit = pathRegistry.get(file);
  if (explicit) return explicit;
  const native = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return native || '';
}

export function getRelativePathSafe(file: File): string {
  return sanitizeRelativePath(getRelativePath(file));
}
