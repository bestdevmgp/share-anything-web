import { useEffect, useRef, useState } from 'react';
import { fileAPI } from '../../services/api';
import { isImageFile, isPdfFile, isVideoFile } from '../../utils/format';
import { MergedShare } from '../../utils/shareMerge';
import { fetchShareFileList } from './shareFileList';

// Module-level caches survive remounts within a session. Presigned URLs carry
// an expiry so a stale link never reaches an <img> tag, and in-flight requests
// are deduped so the collapsed row and the expanded bundle share one fetch.
interface CachedUrl {
  url: string;
  expiresAt: number;
}
const urlCache = new Map<string, CachedUrl>();
const inflight = new Map<string, Promise<string | null>>();
const EXPIRY_MARGIN_MS = 60_000;

const previewable = (name: string) =>
  isImageFile(name) || isPdfFile(name) || isVideoFile(name);

const resolvePreviewUrl = (code: string, fileId: string): Promise<string | null> => {
  const key = `${code}:${fileId}`;
  const cached = urlCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.url);
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async () => {
    try {
      const { download_url, expires_in_secs } = await fileAPI.getDownloadUrl(
        code,
        fileId,
        undefined,
        true,
        true
      );
      urlCache.set(key, {
        url: download_url,
        expiresAt: Date.now() + Math.max(0, expires_in_secs * 1000 - EXPIRY_MARGIN_MS),
      });
      return download_url;
    } catch {
      return null; // transient failure: leave the type icon, allow a later retry
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
};

// Resolves a thumbnail URL for the FIRST file of each share (collapsed row).
export const useSharePreviews = (items: MergedShare[]): Record<string, string> => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const codesKey = items.map((i) => i.code).join('|');

  useEffect(() => {
    let cancelled = false;
    itemsRef.current.forEach(async (item) => {
      if (item.hasPassword || !previewable(item.fileNames[0] || '')) return;
      let fileId = item.firstFileId;
      if (!fileId) {
        try {
          const list = await fetchShareFileList(item.code);
          if (list.has_password || !list.files[0] || !previewable(list.files[0].file_name)) return;
          fileId = list.files[0].id;
        } catch {
          return;
        }
      }
      const url = await resolvePreviewUrl(item.code, fileId);
      if (!cancelled && url) {
        setUrls((p) => (p[item.code] === url ? p : { ...p, [item.code]: url }));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codesKey]);

  return urls;
};

export interface BundleFile {
  id?: string;
  name: string;
}

// Resolves thumbnail URLs for every previewable file inside an expanded bundle,
// keyed by file id. Reuses the same cache as useSharePreviews.
export const useBundlePreviews = (
  code: string | null,
  files: BundleFile[] | undefined,
  hasPassword?: boolean
): Record<string, string> => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const filesRef = useRef(files);
  filesRef.current = files;
  const filesKey = files ? files.map((f) => f.id ?? f.name).join('|') : '';

  useEffect(() => {
    if (!code || hasPassword || !filesRef.current) return;
    let cancelled = false;
    filesRef.current.forEach(async (f) => {
      if (!f.id || !previewable(f.name)) return;
      const url = await resolvePreviewUrl(code, f.id);
      if (!cancelled && url) {
        setUrls((p) => (p[f.id!] === url ? p : { ...p, [f.id!]: url }));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, filesKey, hasPassword]);

  return urls;
};
