import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import { quickAccessAPI, fileAPI, workerAPI } from '../services/api';
import { QuickAccessFile } from '../types';
import { formatFileSize, calculateTimeRemaining, formatTimeRemaining, getDeviceInfo } from '../utils/format';
import { PlusIcon, XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { toast } from '../context/ToastContext';
import { useTranslation } from '../i18n';
import { useNavigate } from 'react-router-dom';
import FileThumbnail from './FileThumbnail';
import FilePreviewModal from './FilePreviewModal';

interface UploadingFile {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  timeRemaining: string;
  completed: boolean;
}

interface FileTrackingData {
  completedBytes: number;
  partProgress: { [key: string]: number };
  startTime: number;
}

interface PreviewModalFile {
  fileName: string;
  fileSize: number;
  source: string;
  presignedUrl?: string;
}

const QuickAccess: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const [files, setFiles] = useState<QuickAccessFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [, setTick] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileTrackingRef = useRef<Map<string, FileTrackingData>>(new Map());
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Preview state
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map());
  const [previewModalFile, setPreviewModalFile] = useState<PreviewModalFile | null>(null);

  const isUploading = uploadingFiles.length > 0;

  const tRef = useRef(t);
  tRef.current = t;

  const fetchFiles = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const response = await quickAccessAPI.list();
      setFiles(response.files);
    } catch {
      toast.error(tRef.current('quickAccess.fetchError'));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Fetch preview URLs for files
  useEffect(() => {
    if (files.length === 0) return;

    const fetchPreviewUrls = async () => {
      const newUrls = new Map<string, string>();
      await Promise.all(
        files.map(async (file) => {
          // Skip if already cached
          if (previewUrls.has(file.id)) {
            newUrls.set(file.id, previewUrls.get(file.id)!);
            return;
          }
          try {
            const response = await quickAccessAPI.previewFile(file.id);
            newUrls.set(file.id, response.preview_url);
          } catch {
            // Silently fail for preview URLs
          }
        })
      );
      setPreviewUrls(newUrls);
    };

    fetchPreviewUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // Update remaining time every minute
  useEffect(() => {
    if (files.length === 0) return;
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, [files.length]);

  const getRemainingTime = (expiresAt: string): string => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return t('format.expired');
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours >= 1) {
      return t('quickAccess.hoursRemaining', { hours });
    }
    return t('quickAccess.minutesRemaining', { minutes: Math.max(1, minutes) });
  };

  const formatCompactDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${month}.${day} ${hours}:${mins}`;
  };

  const startProgressUpdates = useCallback(() => {
    if (progressIntervalRef.current) return;
    progressIntervalRef.current = setInterval(() => {
      const tracking = fileTrackingRef.current;
      setUploadingFiles(prev => prev.map(uf => {
        if (uf.completed) return uf;
        const data = tracking.get(uf.id);
        if (!data) return uf;
        const inProgressBytes = Object.values(data.partProgress).reduce((sum, b) => sum + b, 0);
        const totalUploaded = data.completedBytes + inProgressBytes;
        const progress = Math.min(Math.round((totalUploaded / uf.fileSize) * 100), 99);
        const remainingSeconds = calculateTimeRemaining(data.startTime, totalUploaded, uf.fileSize);
        const timeRemaining = formatTimeRemaining(remainingSeconds, language);
        return { ...uf, progress, timeRemaining };
      }));
    }, 500);
  }, [language]);

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
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const CHUNK_SIZE = 50 * 1024 * 1024;
    const MAX_CONCURRENT_UPLOADS = 10;
    const DIRECT_UPLOAD_THRESHOLD = 100 * 1024 * 1024;

    const newUploadingFiles: UploadingFile[] = droppedFiles.map((file, i) => ({
      id: `uploading-${Date.now()}-${i}`,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      timeRemaining: '',
      completed: false,
    }));
    setUploadingFiles(newUploadingFiles);

    const trackingMap = fileTrackingRef.current;
    trackingMap.clear();
    newUploadingFiles.forEach(uf => {
      trackingMap.set(uf.id, {
        completedBytes: 0,
        partProgress: {},
        startTime: Date.now(),
      });
    });

    startProgressUpdates();

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

      const completedFileParts: { [key: string]: { part_number: number; etag: string }[] } = {};
      const workerUploadIds: { [key: string]: string } = {};

      const MAX_CONCURRENT_FILES = 4;

      const uploadFile = async (fileIndex: number): Promise<void> => {
        if (abortController.signal.aborted) throw new Error('Upload cancelled');

        const file = droppedFiles[fileIndex];
        const fileInit = initResponse.files[fileIndex];
        const uploadId = newUploadingFiles[fileIndex].id;
        const tracking = trackingMap.get(uploadId)!;
        const useDirectUpload = file.size < DIRECT_UPLOAD_THRESHOLD;

        if (useDirectUpload) {
          const progressKey = `direct`;
          tracking.partProgress[progressKey] = 0;

          const result = await workerAPI.directUpload(
            fileInit.storage_key,
            file,
            (loaded) => {
              tracking.partProgress[progressKey] = loaded;
            },
            abortController.signal
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
            if (abortController.signal.aborted) throw new Error('Upload cancelled');

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
              abortController.signal
            );

            delete tracking.partProgress[partKey];
            tracking.completedBytes += chunkSize;

            return { part_number: partNumber, etag };
          };

          const results: { part_number: number; etag: string }[] = [];
          for (let i = 0; i < allPartNumbers.length; i += MAX_CONCURRENT_UPLOADS) {
            const batch = allPartNumbers.slice(i, i + MAX_CONCURRENT_UPLOADS);
            const batchResults = await Promise.all(batch.map(uploadPartWithProgress));
            results.push(...batchResults);
          }

          completedFileParts[fileInit.storage_key] = results.sort((a, b) => a.part_number - b.part_number);
        }

        setUploadingFiles(prev => prev.map(uf =>
          uf.id === uploadId ? { ...uf, progress: 100, completed: true } : uf
        ));
      };

      const fileIndices = Array.from({ length: droppedFiles.length }, (_, i) => i);
      for (let i = 0; i < fileIndices.length; i += MAX_CONCURRENT_FILES) {
        const batch = fileIndices.slice(i, i + MAX_CONCURRENT_FILES);
        await Promise.all(batch.map(uploadFile));
      }

      await fileAPI.completeMultipartUpload({
        upload_session_id: initResponse.upload_session_id,
        share_code: initResponse.share_code,
        files: initResponse.files.map((fileInit, i) => ({
          file_name: fileInit.file_name,
          storage_key: fileInit.storage_key,
          upload_id: workerUploadIds[fileInit.storage_key],
          file_size: droppedFiles[i].size,
          content_type: droppedFiles[i].type || 'application/octet-stream',
          parts: completedFileParts[fileInit.storage_key],
        })),
      });

      toast.success(t('quickAccess.uploadComplete'));
      await fetchFiles();
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED' && err.message !== 'Upload cancelled') {
        toast.error(t('quickAccess.uploadFailed'));
      }
    } finally {
      stopProgressUpdates();
      setUploadingFiles([]);
      fileTrackingRef.current.clear();
      abortControllerRef.current = null;
    }
  }, [fetchFiles, t, startProgressUpdates, stopProgressUpdates]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!isAuthenticated) return;
    if (isUploading) return;
    handleUpload(acceptedFiles);
  }, [isAuthenticated, isUploading, handleUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: isUploading,
    noDrag: isUploading,
  });

  const handleDelete = async (fileId: string) => {
    try {
      await quickAccessAPI.deleteFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setPreviewUrls(prev => {
        const next = new Map(prev);
        next.delete(fileId);
        return next;
      });
      toast.success(t('quickAccess.deleteSuccess'));
    } catch {
      toast.error(t('quickAccess.deleteFailed'));
    }
  };

  const handleDownload = async (file: QuickAccessFile) => {
    try {
      const response = await quickAccessAPI.downloadFile(file.id);
      const a = document.createElement('a');
      a.href = response.download_url;
      a.download = response.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(t('quickAccess.downloadStarted'));
      setFiles(prev => prev.filter(f => f.id !== file.id));
    } catch {
      toast.error(t('quickAccess.downloadFailed'));
    }
  };

  const handlePreviewClick = async (file: QuickAccessFile) => {
    let url = previewUrls.get(file.id);
    if (!url) {
      try {
        const response = await quickAccessAPI.previewFile(file.id);
        url = response.preview_url;
        setPreviewUrls(prev => new Map(prev).set(file.id, url!));
      } catch {
        return;
      }
    }
    setPreviewModalFile({
      fileName: file.file_name,
      fileSize: file.file_size,
      source: url,
      presignedUrl: url,
    });
  };

  const CONTAINER_HEIGHT = 'h-[260px]';

  // Not logged in state
  if (!isAuthenticated) {
    return (
      <div className={`bg-white dark:bg-[#0B0A0B] rounded-2xl border-[3px] border-dashed border-gray-100 dark:border-white/10 ${CONTAINER_HEIGHT} flex flex-col items-center justify-center text-center px-6`}>
        <div className="w-14 h-14 bg-gray-100 dark:bg-white/10 rounded-2xl flex items-center justify-center mb-4">
          <PlusIcon className="w-7 h-7 text-gray-400 dark:text-[#666666]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">
          {t('quickAccess.title')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-[#888888] mb-4">
          {t('quickAccess.description')}
        </p>
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          {t('quickAccess.loginRequired')}
        </button>
      </div>
    );
  }

  const hasContent = files.length > 0 || uploadingFiles.length > 0;

  // Loading state
  if (isLoading && !hasContent) {
    return (
      <div className={`bg-white dark:bg-[#0B0A0B] rounded-2xl border-[3px] border-dashed border-gray-100 dark:border-white/10 ${CONTAINER_HEIGHT} flex items-center justify-center`}>
        <p className="text-sm text-gray-400 dark:text-[#666666]">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`bg-white dark:bg-[#0B0A0B] rounded-2xl border-[3px] border-dashed transition-colors ${CONTAINER_HEIGHT} flex flex-col ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
            : hasContent
              ? 'border-gray-100 dark:border-white/10'
              : 'border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/15 cursor-pointer'
        }`}
      >
        <input {...getInputProps()} />

        {!hasContent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-500/15 rounded-2xl flex items-center justify-center mb-4">
              <PlusIcon className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">
              {t('quickAccess.title')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-[#888888] mb-1">
              {t('quickAccess.description')}
            </p>
            <p className="text-xs text-gray-400 dark:text-[#666666]">
              {t('quickAccess.dragOrClick')}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 md:px-5 md:pt-5 md:pb-4 flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-[#EDEDED]">
                {t('quickAccess.titleShort')}
              </h3>
              <span className="text-xs text-gray-400 dark:text-[#666666]">
                {t('quickAccess.dragOrClick')}
              </span>
            </div>
            <div
              className="flex-1 overflow-y-auto px-4 pb-4 md:px-5 md:pb-5 space-y-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {uploadingFiles.map((uf) => (
                <div
                  key={uf.id}
                  className="flex items-center px-3 py-2 bg-gray-50 dark:bg-white/5 rounded-lg"
                >
                  <div className="flex-shrink-0 mr-3">
                    <FileThumbnail source={null} fileName={uf.fileName} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-[#EDEDED] truncate">
                      {uf.fileName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#888888]">
                      {formatFileSize(uf.fileSize)}
                    </p>
                    <div className="flex items-center mt-0.5">
                      <div className="w-full flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                            style={{ width: `${uf.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-[#888888] whitespace-nowrap flex-shrink-0">
                          {uf.timeRemaining || `${uf.progress}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center px-3 py-2 bg-gray-50 dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <div
                    className="flex-shrink-0 mr-3 cursor-pointer"
                    onClick={() => handlePreviewClick(file)}
                  >
                    <FileThumbnail
                      source={previewUrls.get(file.id) || null}
                      fileName={file.file_name}
                      size="sm"
                    />
                  </div>
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-[#EDEDED] truncate">
                      {file.file_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#888888]">
                      {formatFileSize(file.file_size)} · {getRemainingTime(file.expires_at)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-[#666666] truncate mt-0.5">
                      {formatCompactDate(file.created_at)}
                      {file.uploaded_from && <> · {t('quickAccess.uploadedFrom', { device: file.uploaded_from })}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                      title={t('common.download')}
                    >
                      <ArrowDownTrayIcon className="w-5 h-5 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                      title={t('common.delete')}
                    >
                      <XMarkIcon className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {previewModalFile && (
        <FilePreviewModal
          file={previewModalFile}
          onClose={() => setPreviewModalFile(null)}
        />
      )}
    </div>
  );
};

export default QuickAccess;
