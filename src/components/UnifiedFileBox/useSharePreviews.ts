import { useEffect, useRef, useState } from 'react';
import { fileAPI } from '../../services/api';
import { isImageFile, isPdfFile, isVideoFile } from '../../utils/format';
import { MergedShare } from '../../utils/shareMerge';
import { fetchShareFileList } from './shareFileList';

// Module-level caches survive remounts within a session.
const urlCache = new Map<string, string>();
const tried = new Set<string>();

const previewable = (name: string) =>
  isImageFile(name) || isPdfFile(name) || isVideoFile(name);

export const useSharePreviews = (items: MergedShare[]): Record<string, string> => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const codesKey = items.map((i) => i.code).join('|');

  useEffect(() => {
    let cancelled = false;

    const resolve = async (item: MergedShare) => {
      if (urlCache.has(item.code)) {
        const cached = urlCache.get(item.code)!;
        setUrls((p) => (p[item.code] === cached ? p : { ...p, [item.code]: cached }));
        return;
      }
      if (tried.has(item.code)) return;
      if (!previewable(item.fileNames[0] || '') || item.hasPassword) {
        tried.add(item.code);
        return;
      }
      tried.add(item.code);
      try {
        let fileId = item.firstFileId;
        if (!fileId) {
          const list = await fetchShareFileList(item.code);
          if (list.has_password || !list.files[0] || !previewable(list.files[0].file_name)) return;
          fileId = list.files[0].id;
        }
        const { download_url } = await fileAPI.getDownloadUrl(item.code, fileId, undefined, true, true);
        if (cancelled) return;
        urlCache.set(item.code, download_url);
        setUrls((p) => ({ ...p, [item.code]: download_url }));
      } catch {
        // leave the type icon in place on any failure
      }
    };

    itemsRef.current.forEach(resolve);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codesKey]);

  return urls;
};
