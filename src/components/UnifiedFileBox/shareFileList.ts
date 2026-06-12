import { fileAPI } from '../../services/api';
import { FileListResponse } from '../../types';

// Shared, deduped cache of /files/list responses keyed by share code,
// reused by preview-thumbnail fetching and the expanded per-file size list.
const cache = new Map<string, FileListResponse>();
const inflight = new Map<string, Promise<FileListResponse>>();

export const getCachedFileList = (code: string): FileListResponse | undefined => cache.get(code);

export const fetchShareFileList = (code: string): Promise<FileListResponse> => {
  const cached = cache.get(code);
  if (cached) return Promise.resolve(cached);
  const existing = inflight.get(code);
  if (existing) return existing;
  const p = fileAPI
    .getFileList(code)
    .then((res) => {
      cache.set(code, res);
      inflight.delete(code);
      return res;
    })
    .catch((e) => {
      inflight.delete(code);
      throw e;
    });
  inflight.set(code, p);
  return p;
};
