import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { quickAccessAPI, fileAPI, workerAPI } from '../services/api';
import { formatTimeRemaining, getDeviceInfo, getImageDimensions } from '../utils/format';
import { toast } from './ToastContext';
import { useTranslation } from '../i18n';
import { track, networkInfo } from '../analytics/posthog';

export interface UploadingFile {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  timeRemaining: string;
  completed: boolean;
  file?: File;
}

interface SpeedSample {
  time: number;
  bytes: number;
}

interface FileTrackingData {
  completedBytes: number;
  partProgress: { [key: string]: number };
  startTime: number;
  peakUploaded: number;
  speedSamples: SpeedSample[];
}

interface QuickAccessUploadContextType {
  uploadingFiles: UploadingFile[];
  isUploading: boolean;
  handleUpload: (files: File[]) => Promise<void>;
  handleCancelUpload: (fileId: string) => void;
  completedCounter: number;
  clearCompleted: () => void;
}

const QuickAccessUploadContext = createContext<QuickAccessUploadContextType | null>(null);

const SPEED_WINDOW_MS = 5000;
const MIN_SAMPLES_FOR_ESTIMATE = 4;
const MIN_PROGRESS_FOR_ESTIMATE = 0.02;

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

export const QuickAccessUploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, language } = useTranslation();

  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [completedCounter, setCompletedCounter] = useState(0);
  const fileAbortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const cancelledFileIdsRef = useRef<Set<string>>(new Set());
  const fileTrackingRef = useRef<Map<string, FileTrackingData>>(new Map());
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTimeUpdateRef = useRef<number>(0);
  const uploadSeqRef = useRef(0);

  const isUploading = uploadingFiles.length > 0;

  const tRef = useRef(t);
  tRef.current = t;
  const languageRef = useRef(language);
  languageRef.current = language;

  const startProgressUpdates = useCallback(() => {
    if (progressIntervalRef.current) return;
    lastTimeUpdateRef.current = 0;
    progressIntervalRef.current = setInterval(() => {
      const tracking = fileTrackingRef.current;
      const now = Date.now();
      const shouldUpdateTime = now - lastTimeUpdateRef.current >= 1000;

      setUploadingFiles(prev => prev.map(uf => {
        if (uf.completed) return uf;
        const data = tracking.get(uf.id);
        if (!data) return uf;
        const inProgressBytes = Object.values(data.partProgress).reduce((sum, b) => sum + b, 0);
        const rawTotal = data.completedBytes + inProgressBytes;
        const totalUploaded = Math.max(rawTotal, data.peakUploaded);
        data.peakUploaded = totalUploaded;
        const progress = Math.min(Math.round((totalUploaded / uf.fileSize) * 100), 100);

        let timeRemaining = uf.timeRemaining;
        if (shouldUpdateTime) {
          data.speedSamples.push({ time: now, bytes: totalUploaded });

          const cutoff = now - SPEED_WINDOW_MS;
          data.speedSamples = data.speedSamples.filter(s => s.time >= cutoff);

          if (
            data.speedSamples.length >= MIN_SAMPLES_FOR_ESTIMATE
            && totalUploaded >= uf.fileSize * MIN_PROGRESS_FOR_ESTIMATE
          ) {
            const oldest = data.speedSamples[0];
            const newest = data.speedSamples[data.speedSamples.length - 1];
            const timeDiffMs = newest.time - oldest.time;
            const bytesDiff = newest.bytes - oldest.bytes;

            if (timeDiffMs > 0 && bytesDiff > 0) {
              const bytesPerMs = bytesDiff / timeDiffMs;
              const remainingBytes = uf.fileSize - totalUploaded;
              const remainingSeconds = (remainingBytes / bytesPerMs) / 1000;
              timeRemaining = formatTimeRemaining(remainingSeconds, languageRef.current);
            } else {
              timeRemaining = formatTimeRemaining(Infinity, languageRef.current);
            }
          } else {
            timeRemaining = formatTimeRemaining(Infinity, languageRef.current);
          }
        }
        return { ...uf, progress, timeRemaining };
      }));

      if (shouldUpdateTime) {
        lastTimeUpdateRef.current = now;
      }
    }, 500);
  }, []);

  const stopProgressUpdates = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopProgressUpdates();
  }, [stopProgressUpdates]);

  const handleUpload = useCallback(async (droppedFiles: File[]) => {
    const CHUNK_SIZE = 50 * 1024 * 1024;
    const MAX_CONCURRENT_UPLOADS = 10;
    const DIRECT_UPLOAD_THRESHOLD = 100 * 1024 * 1024;

    const startedAt = performance.now();
    const totalBytes = droppedFiles.reduce((sum, f) => sum + f.size, 0);
    let initMs = 0;
    let outcome: 'success' | 'cancelled' | 'failed' = 'failed';

    const newUploadingFiles: UploadingFile[] = droppedFiles.map((file) => ({
      id: `uploading-${uploadSeqRef.current++}`,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      timeRemaining: '',
      completed: false,
      file,
    }));
    const batchIds = new Set(newUploadingFiles.map(uf => uf.id));
    setUploadingFiles(prev => [...newUploadingFiles, ...prev]);

    const controllersMap = fileAbortControllersRef.current;
    newUploadingFiles.forEach(uf => {
      controllersMap.set(uf.id, new AbortController());
    });

    const trackingMap = fileTrackingRef.current;
    newUploadingFiles.forEach(uf => {
      trackingMap.set(uf.id, {
        completedBytes: 0,
        partProgress: {},
        startTime: Date.now(),
        peakUploaded: 0,
        speedSamples: [],
      });
    });

    startProgressUpdates();

    let awaitingServerSync = false;
    try {
      const deviceInfo = getDeviceInfo();

      const initResponse = await quickAccessAPI.initUpload(
        droppedFiles.map(file => ({
          file_name: file.name,
          file_size: file.size,
          content_type: file.type || 'application/octet-stream',
        })),
        CHUNK_SIZE,
        deviceInfo
      );

      initMs = performance.now() - startedAt;

      const completedFileParts: { [key: string]: { part_number: number; etag: string }[] } = {};
      const workerUploadIds: { [key: string]: string } = {};

      const MAX_CONCURRENT_FILES = 4;

      const uploadFile = async (fileIndex: number): Promise<void> => {
        const uploadId = newUploadingFiles[fileIndex].id;
        const fileAbortController = controllersMap.get(uploadId);

        if (!fileAbortController || fileAbortController.signal.aborted) return;

        const file = droppedFiles[fileIndex];
        const fileInit = initResponse.files[fileIndex];
        const tracking = trackingMap.get(uploadId);
        if (!tracking) return;

        try {
          const signal = fileAbortController.signal;
          const useDirectUpload = file.size < DIRECT_UPLOAD_THRESHOLD;

          if (useDirectUpload) {
            const progressKey = `direct`;
            tracking.partProgress[progressKey] = 0;

            const result = await workerAPI.directUpload(
              fileInit.storage_key,
              fileInit.upload_signature,
              file,
              (loaded) => {
                tracking.partProgress[progressKey] = loaded;
              },
              signal
            );

            delete tracking.partProgress[progressKey];
            tracking.completedBytes = file.size;

            workerUploadIds[fileInit.storage_key] = 'direct';
            completedFileParts[fileInit.storage_key] = [{ part_number: 1, etag: result.etag }];
          } else {
            const totalParts = fileInit.total_parts;
            const upId = fileInit.upload_id;
            workerUploadIds[fileInit.storage_key] = upId;

            const allPartNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);

            const presignedUrlsResponse = await fileAPI.getPartPresignedUrls({
              upload_session_id: initResponse.upload_session_id,
              storage_key: fileInit.storage_key,
              upload_id: upId,
              part_numbers: allPartNumbers,
            });

            const presignedUrlMap = new Map<number, string>();
            presignedUrlsResponse.urls.forEach(u => presignedUrlMap.set(u.part_number, u.presigned_url));

            const uploadPartWithProgress = async (partNumber: number): Promise<{ part_number: number; etag: string }> => {
              if (signal.aborted) throw new Error('Upload cancelled');

              const start = (partNumber - 1) * CHUNK_SIZE;
              const end = Math.min(start + CHUNK_SIZE, file.size);
              const chunk = file.slice(start, end);
              const chunkSize = end - start;
              const partKey = `part-${partNumber}`;
              tracking.partProgress[partKey] = 0;

              const presignedUrl = presignedUrlMap.get(partNumber);
              if (!presignedUrl) throw new Error(`No presigned URL for part ${partNumber}`);

              const etag = await fileAPI.uploadPart(
                presignedUrl,
                chunk,
                (loaded) => {
                  tracking.partProgress[partKey] = loaded;
                },
                signal
              );

              delete tracking.partProgress[partKey];
              tracking.completedBytes += chunkSize;

              return { part_number: partNumber, etag };
            };

            const results = await runConcurrent(
              allPartNumbers.map(pn => () => uploadPartWithProgress(pn)),
              MAX_CONCURRENT_UPLOADS
            );

            completedFileParts[fileInit.storage_key] = results.sort((a, b) => a.part_number - b.part_number);
          }

          setUploadingFiles(prev => prev.map(uf =>
            uf.id === uploadId ? { ...uf, progress: 100, completed: true } : uf
          ));
        } catch (err: any) {
          if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || err.message === 'Upload cancelled') {
            cancelledFileIdsRef.current.add(uploadId);
            return;
          }
          throw err;
        }
      };

      const fileIndices = Array.from({ length: droppedFiles.length }, (_, i) => i);
      await runConcurrent(
        fileIndices.map(i => () => uploadFile(i)),
        MAX_CONCURRENT_FILES
      );

      const cancelledIds = cancelledFileIdsRef.current;
      const successfulFiles = initResponse.files
        .map((fileInit, i) => ({ fileInit, originalIndex: i, uploadId: newUploadingFiles[i].id }))
        .filter(({ uploadId }) => !cancelledIds.has(uploadId));

      if (successfulFiles.length > 0) {
        const dimensions = await Promise.all(
          successfulFiles.map(({ originalIndex }) => getImageDimensions(droppedFiles[originalIndex]))
        );

        await fileAPI.completeMultipartUpload({
          upload_session_id: initResponse.upload_session_id,
          share_code: initResponse.share_code,
          files: successfulFiles.map(({ fileInit, originalIndex }, idx) => ({
            file_name: fileInit.file_name,
            storage_key: fileInit.storage_key,
            upload_id: workerUploadIds[fileInit.storage_key],
            file_size: droppedFiles[originalIndex].size,
            content_type: droppedFiles[originalIndex].type || 'application/octet-stream',
            parts: completedFileParts[fileInit.storage_key],
            image_width: dimensions[idx]?.width,
            image_height: dimensions[idx]?.height,
          })),
        });

        toast.success(tRef.current('quickAccess.uploadComplete'));
        outcome = 'success';
        awaitingServerSync = true;
        setCompletedCounter(prev => prev + 1);
      }
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED' && err.message !== 'Upload cancelled') {
        toast.error(tRef.current('quickAccess.uploadFailed'));
      } else {
        outcome = 'cancelled';
      }
    } finally {
      const durationMs = Math.max(performance.now() - startedAt, 1);
      const transferMs = Math.max(durationMs - initMs, 1);
      track(outcome === 'success' ? 'upload_completed' : `upload_${outcome}`, {
        mode: 'quick-access',
        file_count: droppedFiles.length,
        total_bytes: totalBytes,
        largest_bytes: droppedFiles.reduce((max, f) => Math.max(max, f.size), 0),
        transfer_path: droppedFiles.every((f) => f.size < DIRECT_UPLOAD_THRESHOLD)
          ? 'direct'
          : droppedFiles.every((f) => f.size >= DIRECT_UPLOAD_THRESHOLD)
            ? 'multipart'
            : 'mixed',
        duration_ms: Math.round(durationMs),
        init_ms: Math.round(initMs),
        transfer_ms: Math.round(transferMs),
        ...(outcome === 'success'
          ? { uploaded_bytes: totalBytes, mbps: Math.round(((totalBytes * 0.008) / transferMs) * 100) / 100 }
          : {}),
        ...networkInfo(),
      });
      batchIds.forEach(id => {
        fileTrackingRef.current.delete(id);
        fileAbortControllersRef.current.delete(id);
        cancelledFileIdsRef.current.delete(id);
      });
      if (fileTrackingRef.current.size === 0) stopProgressUpdates();
      if (!awaitingServerSync) {
        setUploadingFiles(prev => prev.filter(uf => !batchIds.has(uf.id)));
      }
    }
  }, [startProgressUpdates, stopProgressUpdates]);

  const handleCancelUpload = useCallback((fileId: string) => {
    const controller = fileAbortControllersRef.current.get(fileId);
    if (controller) {
      controller.abort();
    }
    cancelledFileIdsRef.current.add(fileId);
    setUploadingFiles(prev => prev.filter(uf => uf.id !== fileId));
    fileTrackingRef.current.delete(fileId);
    fileAbortControllersRef.current.delete(fileId);
  }, []);

  const clearCompleted = useCallback(() => {
    setUploadingFiles(prev => prev.filter(uf => !uf.completed));
  }, []);

  return (
    <QuickAccessUploadContext.Provider value={{ uploadingFiles, isUploading, handleUpload, handleCancelUpload, completedCounter, clearCompleted }}>
      {children}
    </QuickAccessUploadContext.Provider>
  );
};

export const useQuickAccessUpload = (): QuickAccessUploadContextType => {
  const ctx = useContext(QuickAccessUploadContext);
  if (!ctx) throw new Error('useQuickAccessUpload must be used within QuickAccessUploadProvider');
  return ctx;
};
