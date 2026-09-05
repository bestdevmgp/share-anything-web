import { useCallback, useRef } from 'react';
import { quickAccessAPI, fileAPI, workerAPI } from '../services/api';
import { InitMultipartUploadResponse } from '../types';
import { getDeviceInfo, getImageDimensions } from '../utils/format';
import { getRelativePathSafe } from '../utils/fileWithPath';
import { sanitizeRelativePath } from '../utils/folderPath';
import { track, networkInfo } from '../analytics/posthog';

type UploadMode = 'quick-access' | 'public';

export interface UploadProgressEvent {
  fileIndex: number;
  fileName: string;
  fileSize: number;
  loadedBytes: number;
  percent: number;
}

interface CompletedSessionResult {
  upload_session_id: string;
  share_code: string;
  expires_at: string;
  fileNames: string[];
  totalSize: number;
}

interface StartUploadInput {
  files: File[];
  description?: string;
  password?: string;
  emptyFolders?: string[];
}

interface UploadHandle {
  abort: () => void;
  cancelFile: (fileIndex: number) => void;
  promise: Promise<CompletedSessionResult>;
}

interface UseMultipartUploadOptions {
  mode: UploadMode;
  onProgress?: (events: UploadProgressEvent[]) => void;
  onFileComplete?: (fileIndex: number) => void;
}

interface UseMultipartUploadResult {
  startUpload: (input: StartUploadInput) => UploadHandle;
}

const CHUNK_SIZE = 50 * 1024 * 1024;
const MAX_CONCURRENT_UPLOADS = 10;
const MAX_CONCURRENT_FILES = 4;
const DIRECT_UPLOAD_THRESHOLD = 100 * 1024 * 1024;

const runConcurrent = async <T,>(
  tasks: (() => Promise<T>)[],
  maxConcurrency: number
): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]();
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(maxConcurrency, tasks.length) }, () => worker())
  );
  return results;
};

export const useMultipartUpload = (opts: UseMultipartUploadOptions): UseMultipartUploadResult => {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const startUpload = useCallback((input: StartUploadInput): UploadHandle => {
    const files = input.files;
    const perFileAbort = files.map(() => new AbortController());
    const canceled = new Set<number>();
    let sessionAborted = false;

    const startedAt = performance.now();
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    let initMs = 0;

    const uploadShape = () => ({
      mode: optsRef.current.mode,
      file_count: files.length,
      total_bytes: totalBytes,
      largest_bytes: files.reduce((max, f) => Math.max(max, f.size), 0),
      transfer_path: files.every((f) => f.size < DIRECT_UPLOAD_THRESHOLD)
        ? 'direct'
        : files.every((f) => f.size >= DIRECT_UPLOAD_THRESHOLD)
          ? 'multipart'
          : 'mixed',
      ...networkInfo(),
    });

    const trackingPerFile = files.map((f) => ({
      completedBytes: 0,
      partProgress: {} as Record<string, number>,
      fileSize: f.size,
      fileName: f.name,
    }));

    const emitProgress = () => {
      const events: UploadProgressEvent[] = trackingPerFile.map((t, i) => {
        const inProgress = Object.values(t.partProgress).reduce((s, b) => s + b, 0);
        const loaded = t.completedBytes + inProgress;
        return {
          fileIndex: i,
          fileName: t.fileName,
          fileSize: t.fileSize,
          loadedBytes: loaded,
          percent: Math.min(Math.round((loaded / t.fileSize) * 100), 100),
        };
      });
      optsRef.current.onProgress?.(events);
    };

    const session = (async (): Promise<CompletedSessionResult> => {
      let initResponse: InitMultipartUploadResponse;
      if (optsRef.current.mode === 'quick-access') {
        initResponse = await quickAccessAPI.initUpload(
          files.map((file) => ({
            file_name: file.name,
            file_size: file.size,
            content_type: file.type || 'application/octet-stream',
            relative_path: getRelativePathSafe(file),
          })),
          CHUNK_SIZE,
          getDeviceInfo()
        );
      } else {
        initResponse = await fileAPI.initMultipartUpload({
          files: files.map((file) => ({
            file_name: file.name,
            file_size: file.size,
            content_type: file.type || 'application/octet-stream',
            relative_path: getRelativePathSafe(file),
          })),
          description: input.description,
          password: input.password,
          chunk_size: CHUNK_SIZE,
        });
      }

      initMs = performance.now() - startedAt;

      const completedFileParts: Record<string, { part_number: number; etag: string }[]> = {};
      const workerUploadIds: Record<string, string> = {};

      const uploadFile = async (fileIndex: number): Promise<void> => {
        const signal = perFileAbort[fileIndex].signal;
        const file = files[fileIndex];
        const fileInit = initResponse.files[fileIndex];
        const tracking = trackingPerFile[fileIndex];
        try {
          if (signal.aborted) throw new Error('Upload cancelled');

          const useDirect = file.size < DIRECT_UPLOAD_THRESHOLD;

          if (useDirect) {
            const key = 'direct';
            tracking.partProgress[key] = 0;
            const result = await workerAPI.directUpload(
              fileInit.storage_key,
              fileInit.upload_signature,
              file,
              (loaded) => {
                tracking.partProgress[key] = loaded;
                emitProgress();
              },
              signal
            );
            delete tracking.partProgress[key];
            tracking.completedBytes = file.size;
            emitProgress();
            workerUploadIds[fileInit.storage_key] = 'direct';
            completedFileParts[fileInit.storage_key] = [{ part_number: 1, etag: result.etag }];
          } else {
            const totalParts = fileInit.total_parts;
            const uploadId = fileInit.upload_id;
            workerUploadIds[fileInit.storage_key] = uploadId;

            const partNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);
            const presignedResp = await fileAPI.getPartPresignedUrls({
              upload_session_id: initResponse.upload_session_id,
              storage_key: fileInit.storage_key,
              upload_id: uploadId,
              part_numbers: partNumbers,
            });
            const urlMap = new Map<number, string>();
            presignedResp.urls.forEach((u) => urlMap.set(u.part_number, u.presigned_url));

            const uploadPart = async (partNumber: number): Promise<{ part_number: number; etag: string }> => {
              if (signal.aborted) throw new Error('Upload cancelled');
              const start = (partNumber - 1) * CHUNK_SIZE;
              const end = Math.min(start + CHUNK_SIZE, file.size);
              const chunk = file.slice(start, end);
              const partKey = `part-${partNumber}`;
              tracking.partProgress[partKey] = 0;
              const url = urlMap.get(partNumber);
              if (!url) throw new Error(`No presigned URL for part ${partNumber}`);
              const etag = await fileAPI.uploadPart(
                url,
                chunk,
                (loaded) => {
                  tracking.partProgress[partKey] = loaded;
                  emitProgress();
                },
                signal
              );
              delete tracking.partProgress[partKey];
              tracking.completedBytes += end - start;
              emitProgress();
              return { part_number: partNumber, etag };
            };

            const results = await runConcurrent(
              partNumbers.map((pn) => () => uploadPart(pn)),
              MAX_CONCURRENT_UPLOADS
            );
            completedFileParts[fileInit.storage_key] = results.sort((a, b) => a.part_number - b.part_number);
          }

          optsRef.current.onFileComplete?.(fileIndex);
        } catch (err) {
          if (signal.aborted) {
            canceled.add(fileIndex);
            return;
          }
          throw err;
        }
      };

      const indices = Array.from({ length: files.length }, (_, i) => i);
      await runConcurrent(
        indices.map((i) => () => uploadFile(i)),
        MAX_CONCURRENT_FILES
      );

      if (sessionAborted) throw new Error('Upload cancelled');

      const liveIndices = indices.filter((i) => !canceled.has(i));
      if (liveIndices.length === 0) throw new Error('Upload cancelled');

      const dimensions = await Promise.all(liveIndices.map((i) => getImageDimensions(files[i])));

      if (sessionAborted) throw new Error('Upload cancelled');

      const sanitizedEmptyFolders = Array.from(
        new Set((input.emptyFolders ?? []).map((p) => sanitizeRelativePath(p)).filter((p) => p.length > 0))
      );

      const completeResp = await fileAPI.completeMultipartUpload({
        upload_session_id: initResponse.upload_session_id,
        share_code: initResponse.share_code,
        ...(sanitizedEmptyFolders.length > 0 ? { empty_folders: sanitizedEmptyFolders } : {}),
        files: liveIndices.map((i, pos) => {
          const fileInit = initResponse.files[i];
          return {
            file_name: fileInit.file_name,
            storage_key: fileInit.storage_key,
            upload_id: workerUploadIds[fileInit.storage_key],
            file_size: files[i].size,
            content_type: files[i].type || 'application/octet-stream',
            relative_path: getRelativePathSafe(files[i]),
            parts: completedFileParts[fileInit.storage_key],
            image_width: dimensions[pos]?.width,
            image_height: dimensions[pos]?.height,
          };
        }),
      });

      return {
        upload_session_id: initResponse.upload_session_id,
        share_code: initResponse.share_code,
        expires_at: completeResp.files?.[0]?.expires_at || new Date(Date.now() + 30 * 60_000).toISOString(),
        fileNames: liveIndices.map((i) => files[i].name),
        totalSize: liveIndices.reduce((s, i) => s + files[i].size, 0),
      };
    })();

    const promise = session.then(
      (result) => {
        const durationMs = performance.now() - startedAt;
        const transferMs = Math.max(durationMs - initMs, 1);
        track('upload_completed', {
          ...uploadShape(),
          uploaded_bytes: result.totalSize,
          duration_ms: Math.round(durationMs),
          init_ms: Math.round(initMs),
          transfer_ms: Math.round(transferMs),
          mbps: Math.round(((result.totalSize * 0.008) / transferMs) * 100) / 100,
        });
        return result;
      },
      (error: unknown) => {
        const cancelled = sessionAborted || canceled.size > 0;
        track(cancelled ? 'upload_cancelled' : 'upload_failed', {
          ...uploadShape(),
          duration_ms: Math.round(performance.now() - startedAt),
          init_ms: Math.round(initMs),
          ...(cancelled ? {} : { error: error instanceof Error ? error.message : String(error) }),
        });
        throw error;
      }
    );

    return {
      abort: () => {
        sessionAborted = true;
        perFileAbort.forEach((c) => c.abort());
      },
      cancelFile: (fileIndex: number) => {
        canceled.add(fileIndex);
        perFileAbort[fileIndex]?.abort();
      },
      promise,
    };
  }, []);

  return { startUpload };
};
