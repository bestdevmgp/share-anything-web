const STORAGE_KEY = 'postLoginRedirect';

export function savePostLoginRedirect(path: string): void {
  if (!path || !path.startsWith('/')) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    // sessionStorage unavailable — silently ignore
  }
}

export function consumePostLoginRedirect(): string | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (value) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    return value && value.startsWith('/') ? value : null;
  } catch {
    return null;
  }
}
