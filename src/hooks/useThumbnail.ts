import { useState, useEffect } from 'react';
import { isImageFile, isPdfFile, isVideoFile } from '../utils/format';
import { generatePdfThumbnail, generateVideoThumbnail } from '../utils/filePreview';

type ThumbnailResult = {
  url: string | null;
  loading: boolean;
};

const cache = new Map<string, string>();

function getCacheKey(source: File | string, fileName: string): string {
  if (source instanceof File) {
    return `file:${source.name}:${source.size}:${source.lastModified}`;
  }
  return `url:${fileName}:${source}`;
}

export function useThumbnail(source: File | string | null, fileName: string): ThumbnailResult {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!source) {
      setUrl(null);
      return;
    }

    const key = getCacheKey(source, fileName);
    const cached = cache.get(key);
    if (cached) {
      setUrl(cached);
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
          objectUrl = await generatePdfThumbnail(source);
        } else if (isVideoFile(fileName)) {
          objectUrl = await generateVideoThumbnail(source);
        }

        if (!cancelled && objectUrl) {
          cache.set(key, objectUrl);
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
  }, [source, fileName]);

  return { url, loading };
}
