import { useCallback, useRef } from 'react';
import { quickAccessAPI, fileAPI, workerAPI } from '../services/api';
import { InitMultipartUploadResponse } from '../types';
import { getDeviceInfo, getImageDimensions } from '../utils/format';

type UploadMode = 'quick-access' | 'public';

// Exported: consumed by UnifiedFileBox for the onProgress callback signature.
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
}

interface UploadHandle {
  abort: () => void;
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
    const abortController = new AbortController();
    const files = input.files;

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

    const promise = (async (): Promise<CompletedSessionResult> => {
      let initResponse: InitMultipartUploadResponse;
      if (optsRef.current.mode === 'quick-access') {
        initResponse = await quickAccessAPI.initUpload(
          files.map((file) => ({
            file_name: file.name,
            file_size: file.size,
            content_type: file.type || 'application/octet-stream',
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
          })),
          description: input.description,
          password: input.password,
          chunk_size: CHUNK_SIZE,
        });
      }

      const completedFileParts: Record<string, { part_number: number; etag: string }[]> = {};
      const workerUploadIds: Record<string, string> = {};

      const uploadFile = async (fileIndex: number): Promise<void> => {
        if (abortController.signal.aborted) throw new Error('Upload cancelled');
        const file = files[fileIndex];
        const fileInit = initResponse.files[fileIndex];
        const tracking = trackingPerFile[fileIndex];

        const useDirect = file.size < DIRECT_UPLOAD_THRESHOLD;

        if (useDirect) {
          const key = 'direct';
          tracking.partProgress[key] = 0;
          const result = await workerAPI.directUpload(
            fileInit.storage_key,
            file,
            (loaded) => {
              tracking.partProgress[key] = loaded;
              emitProgress();
            },
            abortController.signal
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
            if (abortController.signal.aborted) throw new Error('Upload cancelled');
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
              abortController.signal
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
      };

      const indices = Array.from({ length: files.length }, (_, i) => i);
      await runConcurrent(
        indices.map((i) => () => uploadFile(i)),
        MAX_CONCURRENT_FILES
      );

      const dimensions = await Promise.all(files.map((f) => getImageDimensions(f)));

      const completeResp = await fileAPI.completeMultipartUpload({
        upload_session_id: initResponse.upload_session_id,
        share_code: initResponse.share_code,
        files: initResponse.files.map((fileInit, i) => ({
          file_name: fileInit.file_name,
          storage_key: fileInit.storage_key,
          upload_id: workerUploadIds[fileInit.storage_key],
          file_size: files[i].size,
          content_type: files[i].type || 'application/octet-stream',
          parts: completedFileParts[fileInit.storage_key],
          image_width: dimensions[i]?.width,
          image_height: dimensions[i]?.height,
        })),
      });

      return {
        upload_session_id: initResponse.upload_session_id,
        share_code: initResponse.share_code,
        expires_at: (completeResp as any).expires_at || new Date(Date.now() + 30 * 60_000).toISOString(),
        fileNames: files.map((f) => f.name),
        totalSize: files.reduce((s, f) => s + f.size, 0),
      };
    })();

    return {
      abort: () => abortController.abort(),
      promise,
    };
  }, []);

  return { startUpload };
};
