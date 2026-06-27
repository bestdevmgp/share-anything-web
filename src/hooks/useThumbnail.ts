import { useState, useEffect } from 'react';
import { isImageFile, isPdfFile, isVideoFile, isPptxFile, isHwpFile } from '../utils/format';
import { generatePdfThumbnail, generateVideoThumbnail, generatePptxThumbnail, generateHwpThumbnail } from '../utils/filePreview';

type ThumbnailResult = {
  url: string | null;
  loading: boolean;
};

const MAX_THUMBNAIL_CACHE = 120;
const cache = new Map<string, string>();

function touchCache(key: string): string | undefined {
  const v = cache.get(key);
  if (v !== undefined) {
    cache.delete(key);
    cache.set(key, v);
  }
  return v;
}

function putCache(key: string, url: string): void {
  cache.delete(key);
  cache.set(key, url);
  while (cache.size > MAX_THUMBNAIL_CACHE) {
    const oldest = cache.keys().next().value as string;
    const oldestUrl = cache.get(oldest);
    cache.delete(oldest);
    if (oldestUrl && oldestUrl.startsWith('blob:')) URL.revokeObjectURL(oldestUrl);
  }
}

function getCacheKey(source: File | string, fileName: string, width: number): string {
  if (source instanceof File) {
    return `file:${source.name}:${source.size}:${source.lastModified}:${width}`;
  }
  return `url:${fileName}:${source}:${width}`;
}

function needsThumbnail(fileName: string): boolean {
  return isImageFile(fileName) || isPdfFile(fileName) || isVideoFile(fileName) || isPptxFile(fileName) || isHwpFile(fileName);
}

export function useThumbnail(source: File | string | null, fileName: string, thumbnailWidth = 200): ThumbnailResult {
  const [url, setUrl] = useState<string | null>(() => {
    if (!source) return null;
    return touchCache(getCacheKey(source, fileName, thumbnailWidth)) || null;
  });
  const [loading, setLoading] = useState(() => {
    if (!source) return false;
    if (cache.has(getCacheKey(source, fileName, thumbnailWidth))) return false;
    return needsThumbnail(fileName);
  });

  useEffect(() => {
    if (!source) {
      setUrl(null);
      setLoading(false);
      return;
    }

    const key = getCacheKey(source, fileName, thumbnailWidth);
    const cached = touchCache(key);
    if (cached) {
      setUrl(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const generate = async () => {
      try {
        setLoading(true);

        if (isImageFile(fileName)) {
          if (source instanceof File) {
            objectUrl = URL.createObjectURL(source);
          } else {
            objectUrl = source;
          }
        } else if (isPdfFile(fileName)) {
          objectUrl = await generatePdfThumbnail(source, thumbnailWidth);
        } else if (isVideoFile(fileName)) {
          objectUrl = await generateVideoThumbnail(source);
        } else if (isPptxFile(fileName)) {
          objectUrl = await generatePptxThumbnail(source);
        } else if (isHwpFile(fileName)) {
          objectUrl = await generateHwpThumbnail(source);
        }

        if (!cancelled && objectUrl) {
          putCache(key, objectUrl);
          setUrl(objectUrl);
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [source, fileName, thumbnailWidth]);

  return { url, loading };
}
