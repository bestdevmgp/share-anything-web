import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fileAPI } from '../services/api';
import { FileListResponse } from '../types';
import { downloadFile, isPptxFile, formatTimeRemaining, calculateTimeRemaining, getDeviceInfo, isImageFile, formatFileSize, splitFilenameExt } from '../utils/format';
import { PauseIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from '../context/ToastContext';
import { useTranslation, translateApiError } from '../i18n';
import { useP2PDownloader } from '../hooks/useP2PDownloader';
import { createWebSocketConnection, generatePeerId, sendSignalingMessage } from '../utils/webrtc';
import FilePreviewModal from '../components/FilePreviewModal';
import { useThumbnail } from '../hooks/useThumbnail';
import { useBundlePreviews } from '../components/UnifiedFileBox/useSharePreviews';
import { pushDownload } from '../utils/recentDownloads';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

import { Spinner } from '../components/ui/spinner';
import { cn } from 'lib/utils';

import DownloadErrorState from './download/DownloadErrorState';
import PasswordForm from './download/PasswordForm';
import SingleFileView from './download/SingleFileView';
import MultiFileList from './download/MultiFileList';
import BoxDownloadView from '../components/UnifiedFileBox/BoxDownloadView';

interface DownloadFilePageProps {
  embedded?: boolean;
  codeOverride?: string;
  onReset?: () => void;
}

const DownloadFilePage: React.FC<DownloadFilePageProps> = ({ embedded, codeOverride, onReset }) => {
  const { code: codeParam } = useParams<{ code: string }>();
  const code = codeOverride ?? codeParam;
  const { t, language } = useTranslation();

  useEffect(() => {
    if (!embedded) document.title = t('download.pageTitle');
  }, [t, embedded]);
  const navigate = useNavigate();

  const [fileList, setFileList] = useState<FileListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorTitleKey, setErrorTitleKey] = useState('');
  const [errorDescKey, setErrorDescKey] = useState('');
  const [errorDescFallback, setErrorDescFallback] = useState('');

  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadTimeRemaining, setDownloadTimeRemaining] = useState<string>('');
  const [downloadAbortController, setDownloadAbortController] = useState<AbortController | null>(null);
  const [downloadAsZip, setDownloadAsZip] = useState(false);
  const lastDownloadTimeUpdateRef = useRef<number>(0);

  const [previewFile, setPreviewFile] = useState<{ fileName: string; fileSize: number; source: string; presignedUrl?: string } | null>(null);
  const [singleFilePreviewUrl, setSingleFilePreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [isP2PDownload, setIsP2PDownload] = useState(false);
  const [p2pEnabled, setP2pEnabled] = useState(false);
  const [p2pActiveFileId, setP2pActiveFileId] = useState<string | null>(null);
  const [p2pCompletedFileIds, setP2pCompletedFileIds] = useState<Set<string>>(new Set());

  const [bulkP2PDownloading, setBulkP2PDownloading] = useState(false);
  const [bulkRemaining, setBulkRemaining] = useState(0);
  const bulkQueueRef = useRef<string[]>([]);
  const bulkTotalRef = useRef<number>(0);

  const recordDownloadRef = useRef<() => void>(() => {});
  recordDownloadRef.current = () => {
    if (!code || !fileList || fileList.files.length === 0) return;
    pushDownload({
      code,
      fileNames: fileList.files.map((f) => f.file_name),
      totalSize: fileList.files.reduce((sum, f) => sum + f.file_size, 0),
      expiresAt: fileList.expires_at,
      downloadedAt: new Date().toISOString(),
      firstFileId: fileList.files[0].id,
    });
  };

  const handleP2PDownloadComplete = useCallback((blob: Blob, fileName: string) => {
    const completedId = p2pActiveFileId || '';
    downloadFile(blob, fileName);
    setP2pCompletedFileIds(prev => new Set(prev).add(completedId));
    recordDownloadRef.current();

    if (bulkP2PDownloading) {
      bulkQueueRef.current = bulkQueueRef.current.filter(id => id !== completedId);
      setBulkRemaining(bulkQueueRef.current.length);
      const nextId = bulkQueueRef.current[0];
      if (nextId) {
        setP2pActiveFileId(nextId);
      } else {
        setBulkP2PDownloading(false);
        bulkTotalRef.current = 0;
        toast.success(t('download.downloadComplete'));
      }
      return;
    }

    toast.success(t('download.downloadComplete'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p2pActiveFileId, bulkP2PDownloading]);

  const singleFile = fileList?.files?.length === 1 ? fileList.files[0] : null;
  const singleFileThumbnail = useThumbnail(
    singleFile && singleFilePreviewUrl && !isImageFile(singleFile.file_name) ? singleFilePreviewUrl : null,
    singleFile?.file_name || '',
    600
  );
  const filePreviews = useBundlePreviews(
    code ?? null,
    fileList ? fileList.files.map((f) => ({ id: f.id, name: f.file_name })) : undefined,
    (fileList?.has_password ?? false) || isP2PDownload
  );
  const p2pActiveFile = p2pActiveFileId ? fileList?.files?.find(f => f.id === p2pActiveFileId) : singleFile;

  const { status: p2pStatus, progress: p2pProgress, timeRemaining: p2pTimeRemaining, peerDeviceInfo: p2pPeerDeviceInfo, cancelDownload, close: closeP2PSession } = useP2PDownloader({
    shareCode: code || '',
    password: password || undefined,
    fileInfo: p2pActiveFile ? {
      share_code: code || '',
      file_name: p2pActiveFile.file_name,
      file_size: p2pActiveFile.file_size,
      file_type: p2pActiveFile.file_type,
      transfer_type: fileList?.transfer_type || 'server',
      has_password: fileList?.has_password || false,
      expires_at: fileList?.expires_at || '',
      uploader_online: fileList?.uploader_online ?? null
    } : {
      share_code: '',
      file_name: '',
      file_size: 0,
      file_type: '',
      transfer_type: 'server',
      has_password: false,
      expires_at: '',
      uploader_online: null
    },
    enabled: p2pEnabled && !!p2pActiveFile,
    onComplete: (blob) => handleP2PDownloadComplete(blob, p2pActiveFile?.file_name || 'file')
  });

  const startP2PDownload = useCallback((fileId: string) => {
    setP2pActiveFileId(fileId);
    setP2pEnabled(true);
  }, []);

  const handleCancelP2PDownload = useCallback(() => {
    cancelDownload();
    setP2pActiveFileId(null);
    setP2pEnabled(false);
    if (bulkP2PDownloading) {
      bulkQueueRef.current = [];
      bulkTotalRef.current = 0;
      setBulkRemaining(0);
      setBulkP2PDownloading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelDownload, bulkP2PDownloading]);

  const startBulkP2PDownload = useCallback(() => {
    if (!fileList) return;
    const ids = fileList.files.map(f => f.id);
    bulkQueueRef.current = [...ids];
    bulkTotalRef.current = ids.length;
    setBulkRemaining(ids.length);
    setP2pCompletedFileIds(new Set());
    setBulkP2PDownloading(true);
    setP2pActiveFileId(ids[0]);
    setP2pEnabled(true);
  }, [fileList]);

  useEffect(() => {
    if (p2pStatus === 'error' || p2pStatus === 'cancelled') {
      setP2pActiveFileId(null);
      setP2pEnabled(false);
      if (bulkP2PDownloading) {
        bulkQueueRef.current = [];
        bulkTotalRef.current = 0;
        setBulkRemaining(0);
        setBulkP2PDownloading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p2pStatus]);

  useEffect(() => {
    if (!isP2PDownload || !fileList || !passwordVerified || !code) return;

    let ws: WebSocket | null = null;
    let keepalive: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reannounceTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    const peerId = generatePeerId();

    const announce = (sock: WebSocket) => {
      sendSignalingMessage(sock, {
        type: 'downloader_arrived',
        share_code: code,
        peer_id: peerId,
        device_info: getDeviceInfo()
      });
    };

    const connect = () => {
      if (closed) return;
      const sock = createWebSocketConnection(() => {});
      ws = sock;

      sock.onopen = () => {
        if (closed) return;
        announce(sock);
        reannounceTimer = setTimeout(() => {
          if (!closed && sock.readyState === WebSocket.OPEN) announce(sock);
        }, 1500);
      };

      sock.onclose = () => {
        if (closed) return;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 1500);
      };
    };

    connect();

    keepalive = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        sendSignalingMessage(ws, { type: 'ping' });
      }
    }, 25000);

    return () => {
      closed = true;
      if (keepalive) clearInterval(keepalive);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (reannounceTimer) clearTimeout(reannounceTimer);
      if (ws) ws.close();
    };
  }, [isP2PDownload, fileList, passwordVerified, code]);

  const loadFileList = useCallback(async () => {
    if (!code) {
      if (!embedded) navigate('/');
      return;
    }

    try {
      setLoading(true);
      const list = await fileAPI.getFileList(code);
      setFileList(list);

      if (list.transfer_type === 'p2p') {
        setIsP2PDownload(true);

        if (list.uploader_online === false) {
          setErrorTitleKey('download.senderOffline');
          setErrorDescKey('download.senderOfflineDesc');
          return;
        }
      }

      if (!list.has_password) {
        setPasswordVerified(true);
        if (list.files.length === 1) {
          setSelectedFiles(new Set([list.files[0].id]));
        }
      }
    } catch (err: any) {
      const statusCode = err.response?.status;

      if (statusCode === 404) {
        setErrorTitleKey('download.invalidCode');
        setErrorDescKey('download.notFoundOrExpired');
      } else if (statusCode === 429) {
        setErrorTitleKey('download.blockedIP');
        setErrorDescKey('download.blockedIPDesc');
      } else {
        setErrorTitleKey('download.unknownError');
        if (err.response?.data) {
          setErrorDescFallback(translateApiError(err.response.data, t));
        } else {
          setErrorDescKey('download.tryAgainLater');
        }
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, navigate]);

  const onRetry = useCallback(() => {
    setErrorTitleKey('');
    setErrorDescKey('');
    setErrorDescFallback('');
    loadFileList();
  }, [loadFileList]);

  useEffect(() => {
    loadFileList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fileList) return;
    const selectedTotalSize = fileList.files
      .filter(f => selectedFiles.has(f.id))
      .reduce((sum, f) => sum + f.file_size, 0);
    const ZIP_SIZE_LIMIT = 500 * 1024 * 1024;

    if (selectedTotalSize >= ZIP_SIZE_LIMIT) {
      setDownloadAsZip(false);
    }
  }, [selectedFiles, fileList]);

  useEffect(() => {
    let blobUrl: string | null = null;

    const loadFilePreview = async () => {
      if (!fileList || !code || fileList.files.length !== 1 || isP2PDownload || embedded) return;

      const file = fileList.files[0];

      try {
        setLoadingPreview(true);
        const blob = await fileAPI.previewFile(code, file.id, password || undefined);
        const url = URL.createObjectURL(blob);
        blobUrl = url;
        setSingleFilePreviewUrl(url);
      } catch (err) {
        console.error('Failed to load preview:', err);
      } finally {
        setLoadingPreview(false);
      }
    };

    loadFilePreview();

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [fileList, code, password, isP2PDownload, embedded]);

  const openPreview = async (fileName: string, fileSize: number, fileId: string, blobSource: string) => {
    const presignedUrl = isPptxFile(fileName) && code
      ? await fileAPI.getDownloadUrl(code, fileId, password || undefined, true).then(r => r.download_url).catch(() => undefined)
      : undefined;
    setPreviewFile({ fileName, fileSize, source: blobSource, presignedUrl });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || !password) {
      toast.error(t('download.enterPassword'));
      return;
    }

    try {
      setLoading(true);

      await fileAPI.verifyPassword(code, password);

      setPasswordVerified(true);
      toast.success(t('download.passwordVerified'));

      if (fileList && fileList.files.length === 1) {
        setSelectedFiles(new Set([fileList.files[0].id]));
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        toast.error(t('download.passwordIncorrect'));
        setPassword('');
        setShowPassword(false);
      } else {
        toast.error(t('download.passwordVerifyFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (asZip: boolean = false) => {
    if (!code || !fileList || selectedFiles.size === 0) return;

    const abortController = new AbortController();
    setDownloadAbortController(abortController);
    const downloadStartTime = Date.now();
    setDownloadAsZip(asZip);

    try {
      setDownloading(true);
      setDownloadProgress(0);
      setDownloadTimeRemaining('');
      const selectedFileIds = Array.from(selectedFiles);

      if (asZip && selectedFileIds.length > 1) {
        const totalSize = fileList.files
          .filter(f => selectedFiles.has(f.id))
          .reduce((sum, f) => sum + f.file_size, 0);

        const blob = await fileAPI.downloadBulk(
          {
            code,
            file_ids: selectedFileIds,
            password: password || undefined
          },
          (progressEvent) => {
            setDownloadProgress(progressEvent.percentage);
            const now = Date.now();
            if (now - lastDownloadTimeUpdateRef.current >= 1000) {
              const remainingSeconds = calculateTimeRemaining(
                downloadStartTime,
                progressEvent.loaded,
                totalSize
              );
              setDownloadTimeRemaining(formatTimeRemaining(remainingSeconds, language));
              lastDownloadTimeUpdateRef.current = now;
            }
          },
          abortController.signal
        );

        downloadFile(blob, `share-${code}.zip`);
        recordDownloadRef.current();
        toast.success(t('download.zipDownloadComplete'));
        return;
      }

      const downloadUrls: { url: string; fileName: string }[] = [];

      for (let i = 0; i < selectedFileIds.length; i++) {
        const fileId = selectedFileIds[i];
        const file = fileList.files.find(f => f.id === fileId);
        if (!file) continue;

        const { download_url } = await fileAPI.getDownloadUrl(
          code,
          fileId,
          password || undefined
        );

        downloadUrls.push({ url: download_url, fileName: file.file_name });
        setDownloadProgress(Math.round(((i + 1) / selectedFileIds.length) * 50));
      }

      for (let i = 0; i < downloadUrls.length; i++) {
        const { url, fileName } = downloadUrls[i];

        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloadProgress(50 + Math.round(((i + 1) / downloadUrls.length) * 50));

        if (i < downloadUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      recordDownloadRef.current();
      toast.success(
        selectedFileIds.length === 1
          ? t('download.downloadStarted')
          : t('download.multiDownloadStarted', { count: selectedFileIds.length })
      );
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        toast.info(t('download.downloadCancelled'));
      } else if (err.response?.status === 401) {
        toast.error(t('download.passwordIncorrect'));
        setPasswordVerified(false);
      } else {
        toast.error(translateApiError(err.response?.data, t) || t('download.downloadFailed'));
      }
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
      setDownloadTimeRemaining('');
      setDownloadAbortController(null);
    }
  };

  const handleCancelDownload = () => {
    if (downloadAbortController) {
      downloadAbortController.abort();
    }
  };

  useEffect(() => {
    if (embedded && fileList && passwordVerified) {
      setSelectedFiles(new Set(fileList.files.map((f) => f.id)));
    }
  }, [embedded, fileList, passwordVerified]);

  if (embedded) {
    return (
      <BoxDownloadView
        fileList={fileList}
        loading={loading}
        errorTitle={errorTitleKey ? t(errorTitleKey) : ''}
        errorDesc={errorDescKey ? t(errorDescKey) : errorDescFallback}
        passwordVerified={passwordVerified}
        password={password}
        showPassword={showPassword}
        setPassword={setPassword}
        setShowPassword={setShowPassword}
        handlePasswordSubmit={handlePasswordSubmit}
        isP2PDownload={isP2PDownload}
        p2pStatus={p2pStatus}
        p2pProgress={p2pProgress}
        p2pTimeRemaining={p2pTimeRemaining}
        p2pPeerDeviceInfo={p2pPeerDeviceInfo}
        p2pActiveFileId={p2pActiveFileId}
        p2pCompletedFileIds={p2pCompletedFileIds}
        downloading={downloading}
        handleDownload={handleDownload}
        startP2PDownload={startP2PDownload}
        startBulkP2PDownload={startBulkP2PDownload}
        handleCancelP2PDownload={handleCancelP2PDownload}
        onReset={onReset || (() => {})}
        onRetry={onRetry}
        previews={filePreviews}
        t={t}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-32 pb-20">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto" />
          <p className="mt-4 text-muted-foreground">{t('download.loadingFileInfo')}</p>
        </div>
      </div>
    );
  }

  if (errorTitleKey) {
    return (
      <DownloadErrorState
        errorTitle={t(errorTitleKey)}
        error={errorDescKey ? t(errorDescKey) : errorDescFallback}
        onRetry={onRetry}
        t={t}
      />
    );
  }

  if (!fileList) {
    return null;
  }

  if (fileList.has_password && !passwordVerified) {
    return (
      <PasswordForm
        password={password}
        showPassword={showPassword}
        setPassword={setPassword}
        setShowPassword={setShowPassword}
        handlePasswordSubmit={handlePasswordSubmit}
        t={t}
      />
    );
  }

  if (fileList.files.length === 1) {
    const file = fileList.files[0];

    return (
      <>
        <SingleFileView
          file={file}
          fileList={fileList}
          isP2PDownload={isP2PDownload}
          p2pStatus={p2pStatus}
          p2pProgress={p2pProgress}
          p2pTimeRemaining={p2pTimeRemaining}
          p2pPeerDeviceInfo={p2pPeerDeviceInfo}
          downloading={downloading}
          downloadProgress={downloadProgress}
          downloadTimeRemaining={downloadTimeRemaining}
          loadingPreview={loadingPreview}
          singleFilePreviewUrl={singleFilePreviewUrl}
          singleFileThumbnail={singleFileThumbnail}
          handleDownload={handleDownload}
          handleCancelDownload={handleCancelDownload}
          handleCancelP2PDownload={handleCancelP2PDownload}
          closeP2PSession={closeP2PSession}
          setP2pEnabled={setP2pEnabled}
          openPreview={openPreview}
          navigate={navigate}
          t={t}
          language={language}
        />
        {previewFile && (
          <FilePreviewModal
            file={previewFile}
            onClose={() => setPreviewFile(null)}
          />
        )}
      </>
    );
  }

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAllFiles = () => {
    setSelectedFiles(new Set(fileList.files.map(f => f.id)));
  };

  const deselectAllFiles = () => {
    setSelectedFiles(new Set());
  };

  if (isP2PDownload && fileList.files.length > 1) {
    const allP2PCompleted = fileList.files.every(f => p2pCompletedFileIds.has(f.id));
    const anyP2PDownloading = p2pActiveFileId && (p2pStatus === 'downloading' || p2pStatus === 'connecting' || p2pStatus === 'processing');
    const awaitingNextSelection = !anyP2PDownloading && !allP2PCompleted && p2pCompletedFileIds.size > 0;

    return (
      <div className="min-h-full flex flex-col items-center justify-center pt-12 pb-20 px-4">
        <div className="w-full max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-5">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center',
                anyP2PDownloading ? 'bg-card border border-foreground/[0.09]' : 'bg-green-100 dark:bg-green-500/15'
              )}>
                {anyP2PDownloading ? (
                  <Spinner size="xl" />
                ) : allP2PCompleted ? (
                  <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" className="download-checkmark-path" />
                  </svg>
                ) : awaitingNextSelection ? (
                  <PauseIcon className="w-9 h-9 text-green-600" strokeWidth={4} />
                ) : (
                  <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                )}
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">
              {allP2PCompleted ? t('download.receiveCompleteTitle') :
               anyP2PDownloading ? t('download.downloading') :
               awaitingNextSelection ? t('download.awaitingNextSelection') :
               t('download.readyToReceive')}
            </h1>
            <p className="text-muted-foreground">
              {allP2PCompleted ? t('download.receivedSuccessfully') :
               anyP2PDownloading ? (p2pPeerDeviceInfo ? t('download.receivingFrom', { device: p2pPeerDeviceInfo }) : t('download.receivingPleaseWait')) :
               awaitingNextSelection ? t('download.awaitingNextSelectionDesc') :
               p2pPeerDeviceInfo ? t('download.connectedToDevice', { device: p2pPeerDeviceInfo }) : t('download.connectionSuccess')}
            </p>
          </div>
          <style>{`
            .download-checkmark-path {
              stroke-dasharray: 20;
              stroke-dashoffset: 20;
              animation: drawDownloadCheck 0.6s ease-out forwards;
            }
            @keyframes drawDownloadCheck {
              to {
                stroke-dashoffset: 0;
              }
            }
          `}</style>

          <Card className="rounded-3xl border-2 p-6 md:p-8">
            {fileList.description && (
              <div className="mb-8 p-4 bg-muted rounded-lg border border-foreground/[0.09]">
                <p className="text-foreground break-words whitespace-pre-wrap">{fileList.description}</p>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {t('download.fileListCount', { count: fileList.total_count })}
              </h3>
            </div>

            <div className="space-y-3 mb-8">
              {fileList.files.map((file) => {
                const isActive = p2pActiveFileId === file.id;
                const isDownloading = isActive && (p2pStatus === 'downloading' || p2pStatus === 'connecting');
                const isCompleted = p2pCompletedFileIds.has(file.id);
                const [nameBase, nameExt] = splitFilenameExt(file.file_name);

                return (
                  <div
                    key={file.id}
                    className={cn(
                      'px-3 py-2.5 rounded-lg border transition-all',
                      isActive ? 'bg-muted border-primary' : 'bg-muted border-foreground/[0.09]'
                    )}
                  >
                    <div className="flex items-center space-x-4 h-10">
                      <div className="flex-1 min-w-0 h-full">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-base font-semibold text-foreground flex items-baseline min-w-0 flex-1 leading-tight">
                            <span className="truncate">{nameBase}</span>
                            {nameExt && <span className="flex-shrink-0">{nameExt}</span>}
                          </h4>
                        </div>
                        <div className={cn("h-5 flex", isDownloading ? "items-end" : "items-start")}>
                          {isDownloading ? (
                            <div className="w-full flex items-center gap-1.5 sm:gap-2">
                              <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-primary h-full transition-all duration-1000 ease-out rounded-full"
                                  style={{ width: `${p2pProgress}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 leading-none">{p2pTimeRemaining || t('format.calculating')}</span>
                              <span className="text-xs font-semibold text-primary whitespace-nowrap flex-shrink-0 leading-none">{p2pProgress}%</span>
                              <button
                                onClick={handleCancelP2PDownload}
                                className="flex-shrink-0 p-0.5 -mr-1 can-hover:hover:bg-accent active:bg-accent rounded transition-colors"
                                title={t('download.cancelDownload')}
                                aria-label={t('download.cancelDownload')}
                              >
                                <XMarkIcon className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm text-muted-foreground leading-tight">{formatFileSize(file.file_size)}</p>
                          )}
                        </div>
                      </div>

                      {isCompleted ? (
                        <span className="flex-shrink-0 px-4 py-2 text-green-600 text-sm font-medium">
                          ✓ {t('common.done')}
                        </span>
                      ) : !isDownloading ? (
                        <Button
                          onClick={() => startP2PDownload(file.id)}
                          disabled={bulkP2PDownloading || Boolean(anyP2PDownloading)}
                          size="sm"
                          className="flex-shrink-0"
                        >
                          {t('common.download')}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 -mb-2 md:-mb-4 flex flex-col items-center gap-3">
              {!bulkP2PDownloading && p2pCompletedFileIds.size < fileList.files.length && (
                <Button
                  variant="secondary"
                  onClick={startBulkP2PDownload}
                  disabled={p2pEnabled}
                  className="w-full"
                >
                  {t('download.downloadAll') || '전체 다운로드'}
                </Button>
              )}
              {bulkP2PDownloading && (
                <p className="text-sm text-muted-foreground text-center">
                  {t('download.bulkProgress', { done: bulkTotalRef.current - bulkRemaining, total: bulkTotalRef.current })
                    || `${bulkTotalRef.current - bulkRemaining} / ${bulkTotalRef.current} 파일 받는 중…`}
                </p>
              )}
              {p2pCompletedFileIds.size > 0 && !bulkP2PDownloading && (
                <Button
                  onClick={() => { closeP2PSession(); navigate('/'); }}
                  className="w-full"
                >
                  {t('common.done')}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="text-sm text-muted-foreground can-hover:hover:text-foreground active:text-foreground"
              >
                {t('common.back')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <MultiFileList
        fileList={fileList}
        selectedFiles={selectedFiles}
        toggleFileSelection={toggleFileSelection}
        selectAllFiles={selectAllFiles}
        deselectAllFiles={deselectAllFiles}
        downloading={downloading}
        downloadProgress={downloadProgress}
        downloadTimeRemaining={downloadTimeRemaining}
        downloadAsZip={downloadAsZip}
        handleDownload={handleDownload}
        handleCancelDownload={handleCancelDownload}
        navigate={navigate}
        previews={filePreviews}
        t={t}
      />
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
};

export default DownloadFilePage;
