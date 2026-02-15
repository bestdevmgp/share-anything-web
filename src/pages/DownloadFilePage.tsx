import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fileAPI } from '../services/api';
import { FileListResponse } from '../types';
import { formatFileSize, downloadFile, formatDateTime, isImageFile, isPptxFile, formatTimeRemaining, calculateTimeRemaining, getDeviceInfo } from '../utils/format';
import { DocumentIcon, LockClosedIcon, CheckIcon, ArrowDownTrayIcon, EyeIcon, EyeSlashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from '../context/ToastContext';
import { useTranslation } from '../i18n';
import TurnstileWidget from '../components/TurnstileWidget';
import { useP2PDownloader } from '../hooks/useP2PDownloader';
import { createWebSocketConnection, generatePeerId, sendSignalingMessage } from '../utils/webrtc';
import FileThumbnail from '../components/FileThumbnail';
import FilePreviewModal from '../components/FilePreviewModal';
import { useThumbnail } from '../hooks/useThumbnail';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { cn } from 'lib/utils';

const DownloadFilePage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { t, language } = useTranslation();

  useEffect(() => {
    document.title = t('download.pageTitle');
  }, [t]);
  const navigate = useNavigate();

  const [fileList, setFileList] = useState<FileListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorTitle, setErrorTitle] = useState('');

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

  const [, setTurnstileToken] = useState<string>('');
  const [turnstileVerified, setTurnstileVerified] = useState(false);

  const [isP2PDownload, setIsP2PDownload] = useState(false);
  const [p2pEnabled, setP2pEnabled] = useState(false);
  const [p2pActiveFileId, setP2pActiveFileId] = useState<string | null>(null);
  const [p2pCompletedFileIds, setP2pCompletedFileIds] = useState<Set<string>>(new Set());

  const handleP2PDownloadComplete = useCallback((blob: Blob, fileName: string) => {
    downloadFile(blob, fileName);
    toast.success(t('download.downloadComplete'));
    setP2pCompletedFileIds(prev => new Set(prev).add(p2pActiveFileId || ''));
    setP2pActiveFileId(null);
    setP2pEnabled(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p2pActiveFileId]);

  const singleFile = fileList?.files?.length === 1 ? fileList.files[0] : null;
  const singleFileThumbnail = useThumbnail(
    singleFile && singleFilePreviewUrl && !isImageFile(singleFile.file_name) ? singleFilePreviewUrl : null,
    singleFile?.file_name || '',
    600
  );
  const p2pActiveFile = p2pActiveFileId ? fileList?.files?.find(f => f.id === p2pActiveFileId) : singleFile;

  const { status: p2pStatus, progress: p2pProgress, timeRemaining: p2pTimeRemaining, peerDeviceInfo: p2pPeerDeviceInfo, reset: resetP2P, cancelDownload } = useP2PDownloader({
    shareCode: code || '',
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
    resetP2P();
    setP2pActiveFileId(fileId);
    setP2pEnabled(true);
  }, [resetP2P]);

  const handleCancelP2PDownload = useCallback(() => {
    cancelDownload();
    setP2pActiveFileId(null);
    setP2pEnabled(false);
  }, [cancelDownload]);

  useEffect(() => {
    if (p2pStatus === 'error' || p2pStatus === 'cancelled') {
      setP2pActiveFileId(null);
      setP2pEnabled(false);
    }
  }, [p2pStatus]);

  useEffect(() => {
    if (!isP2PDownload || !fileList || !passwordVerified || !code) return;

    const ws = createWebSocketConnection(() => {});

    ws.onopen = () => {
      sendSignalingMessage(ws, {
        type: 'downloader_arrived',
        share_code: code,
        peer_id: generatePeerId(),
        device_info: getDeviceInfo()
      });
    };

    return () => {
      ws.close();
    };
  }, [isP2PDownload, fileList, passwordVerified, code]);

  const loadFileList = useCallback(async (token: string) => {
    if (!code) {
      navigate('/');
      return;
    }

    try {
      setLoading(true);
      const list = await fileAPI.getFileList(code, token);
      setFileList(list);

      if (list.transfer_type === 'p2p') {
        setIsP2PDownload(true);

        if (list.uploader_online === false) {
          setErrorTitle(t('download.senderOffline'));
          setError(t('download.senderOfflineDesc'));
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
        setErrorTitle(t('download.invalidCode'));
        setError(t('download.notFoundOrExpired'));
      } else if (statusCode === 429) {
        setErrorTitle(t('download.blockedIP'));
        setError(t('download.blockedIPDesc'));
      } else {
        setErrorTitle(t('download.unknownError'));
        setError(err.response?.data?.message || t('download.tryAgainLater'));
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, navigate]);

  const handleTurnstileVerify = useCallback(async (token: string) => {
    setTurnstileToken(token);
    await loadFileList(token);
    setTurnstileVerified(true);
  }, [loadFileList]);

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
      if (!fileList || !code || fileList.files.length !== 1) return;

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
  }, [fileList, code, password]);

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

        downloadFile(blob, `${code}.zip`);
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
        toast.error(err.response?.data?.message || t('download.downloadFailed'));
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


  if (!turnstileVerified) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 mb-8 text-muted-foreground">
            {loading ? t('download.loadingFileInfo') : t('download.verifyingRequest')}
          </p>
          <TurnstileWidget
            onVerify={handleTurnstileVerify}
            onError={() => {
              toast.error(t('download.securityFailed'));
            }}
            onExpire={() => {
              toast.error(t('download.securityExpired'));
            }}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('download.loadingFileInfo')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <Card className="rounded-3xl border-2 p-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 18L18 6" className="error-x-path-1" />
                <path d="M6 6l12 12" className="error-x-path-2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{errorTitle}</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button
              onClick={() => navigate('/', { state: { autoFocus: true } })}
              className="px-6 py-2"
            >
              {t('common.retry')}
            </Button>
          </Card>
          <style>{`
            .error-x-path-1,
            .error-x-path-2 {
              stroke-dasharray: 17;
              stroke-dashoffset: 17;
            }
            .error-x-path-1 {
              animation: drawX 0.4s ease-out forwards;
            }
            .error-x-path-2 {
              animation: drawX 0.4s ease-out 0.2s forwards;
            }
            @keyframes drawX {
              to {
                stroke-dashoffset: 0;
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!fileList) {
    return null;
  }

  if (fileList.has_password && !passwordVerified) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full">
          <Card className="rounded-3xl border-2 p-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <LockClosedIcon className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{t('download.passwordTitle')}</h1>
              <p className="text-muted-foreground">
                {t('download.passwordProtected')}
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-6">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('download.passwordPlaceholder')}
                    className="h-12 pr-12 rounded-lg"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeIcon className="w-5 h-5" />
                    ) : (
                      <EyeSlashIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold rounded-lg"
              >
                {t('common.confirm')}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  if (fileList.files.length === 1) {
    const file = fileList.files[0];

    return (
      <div className="flex items-center justify-center px-4 py-12">
    <div className="max-w-2xl w-full">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-5">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center',
                isP2PDownload && p2pStatus === 'downloading' ? 'bg-blue-100 dark:bg-blue-500/15' : 'bg-green-100 dark:bg-green-500/15'
              )}>
                {isP2PDownload && p2pStatus === 'downloading' ? (
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                ) : (
                  <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke={isP2PDownload && p2pStatus === 'completed' ? '#16a34a' : '#16a34a'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" className="download-checkmark-path" />
                  </svg>
                )}
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">
              {isP2PDownload ? (
                p2pStatus === 'waiting' || p2pStatus === 'connecting' ? t('download.readyToReceive') :
                p2pStatus === 'downloading' ? t('download.downloading') :
                p2pStatus === 'completed' ? t('download.receiveCompleteTitle') :
                t('download.readyToDownload')
              ) : t('download.readyToDownload')}
            </h1>
            <p className="text-muted-foreground">
              {isP2PDownload ? (
                p2pStatus === 'downloading' ? (p2pPeerDeviceInfo ? t('download.receivingFrom', { device: p2pPeerDeviceInfo }) : t('download.receivingPleaseWait')) :
                p2pStatus === 'completed' ? t('download.receivedSuccessfully') :
                p2pPeerDeviceInfo ? t('download.connectedToDevice', { device: p2pPeerDeviceInfo }) : t('download.connectionSuccess')
              ) : t('download.checkFileBeforeDownload')}
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
            <div className="flex justify-center mb-5">
              {loadingPreview ? (
                <div className="w-24 h-24 bg-blue-100 dark:bg-blue-500/15 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : singleFilePreviewUrl && isImageFile(file.file_name) ? (
                <div
                  className="max-w-full max-h-96 overflow-hidden rounded-2xl cursor-pointer"
                  onClick={() => openPreview(file.file_name, file.file_size, file.id, singleFilePreviewUrl!)}
                >
                  <img
                    src={singleFilePreviewUrl}
                    alt={file.file_name}
                    className="max-w-full max-h-96 object-contain"
                  />
                </div>
              ) : singleFilePreviewUrl && singleFileThumbnail.url ? (
                <div
                  className="max-w-full max-h-[28rem] overflow-hidden rounded-2xl cursor-pointer"
                  onClick={() => openPreview(file.file_name, file.file_size, file.id, singleFilePreviewUrl!)}
                >
                  <img
                    src={singleFileThumbnail.url}
                    alt={file.file_name}
                    className="max-w-full max-h-[28rem] object-contain rounded-2xl"
                  />
                </div>
              ) : singleFilePreviewUrl ? (
                <div
                  className="cursor-pointer"
                  onClick={() => openPreview(file.file_name, file.file_size, file.id, singleFilePreviewUrl!)}
                >
                  <FileThumbnail source={singleFilePreviewUrl} fileName={file.file_name} size="md" />
                </div>
              ) : (
                <div className="w-24 h-24 bg-blue-100 dark:bg-blue-500/15 rounded-full flex items-center justify-center">
                  <DocumentIcon className="w-12 h-12 text-primary" />
                </div>
              )}
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-3 text-center break-all">
                {file.file_name}
              </h2>
              {fileList.description && (
                <p className="text-muted-foreground text-center mb-6 break-words whitespace-pre-wrap">
                  {fileList.description}
                </p>
              )}
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">{t('download.fileSize')}</span>
                <span className="font-semibold text-foreground">{formatFileSize(file.file_size)}</span>
              </div>
              {fileList.description && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('download.uploader')}</span>
                  <span className="font-semibold text-foreground">{t('common.anonymousUser')}</span>
                </div>
              )}
              {!isP2PDownload && (
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">{t('download.expiresAt')}</span>
                  <span className="font-semibold text-foreground">{formatDateTime(fileList.expires_at, language)}</span>
                </div>
              )}
            </div>

            <div className="">
              {isP2PDownload ? (
                p2pStatus === 'downloading' || p2pStatus === 'connecting' ? (
                  <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 pl-2">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium text-foreground self-start">
                            {p2pStatus === 'connecting' ? t('download.connectingP2P') : t('download.downloadingP2P')}
                          </span>
                          {p2pStatus === 'downloading' && (
                            <div className="flex items-center gap-2 self-end">
                              {p2pTimeRemaining && (
                                <span className="text-xs text-muted-foreground">{p2pTimeRemaining}</span>
                              )}
                              <span className="text-xs font-semibold text-primary">{p2pProgress}%</span>
                            </div>
                          )}
                        </div>
                        {p2pStatus === 'downloading' && (
                          <Progress value={p2pProgress} className="h-1.5 bg-muted" />
                        )}
                      </div>
                      <button
                        onClick={handleCancelP2PDownload}
                        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded transition-colors flex-shrink-0"
                        title={t('download.cancelDownload')}
                      >
                        <XMarkIcon className="w-6 h-6 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                ) : p2pStatus === 'completed' ? (
                  <div className="text-center py-4 text-green-600 font-semibold">
                    ✓ {t('download.receiveCompleteMark')}
                  </div>
                ) : (
                  <Button
                    onClick={() => setP2pEnabled(true)}
                    className="w-full h-auto px-6 py-4 text-lg font-semibold rounded-xl space-x-2"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    <span>{t('download.startDownload')}</span>
                  </Button>
                )
              ) : downloading ? (
                <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 pl-2">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-foreground self-start">
                          {downloadProgress === 100 ? t('download.pleaseWait') : t('download.downloadingP2P')}
                        </span>
                        {downloadProgress < 100 && (
                          <div className="flex items-center gap-2 self-end">
                            {downloadTimeRemaining && (
                              <span className="text-xs text-muted-foreground">{downloadTimeRemaining}</span>
                            )}
                            <span className="text-xs font-semibold text-primary">{downloadProgress}%</span>
                          </div>
                        )}
                      </div>
                      <Progress value={downloadProgress} className="h-1.5 bg-muted" />
                    </div>
                    <button
                      onClick={handleCancelDownload}
                      className="p-1 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded transition-colors flex-shrink-0"
                      title={t('download.cancelDownload')}
                    >
                      <XMarkIcon className="w-6 h-6 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => handleDownload(false)}
                  className="w-full h-auto px-6 py-4 text-lg font-semibold rounded-xl space-x-2"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  <span>{t('download.downloadFile')}</span>
                </Button>
              )}
            </div>

            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t('common.back')}
              </Button>
            </div>
          </Card>
        </div>

        {previewFile && (
          <FilePreviewModal
            file={previewFile}
            onClose={() => setPreviewFile(null)}
          />
        )}
      </div>
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
    const anyP2PDownloading = p2pActiveFileId && (p2pStatus === 'downloading' || p2pStatus === 'connecting');

    return (
      <div className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-5">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center',
                anyP2PDownloading ? 'bg-blue-100 dark:bg-blue-500/15' : 'bg-green-100 dark:bg-green-500/15'
              )}>
                {anyP2PDownloading ? (
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                ) : (
                  <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" className="download-checkmark-path" />
                  </svg>
                )}
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">
              {allP2PCompleted ? t('download.receiveCompleteTitle') :
               anyP2PDownloading ? t('download.downloading') :
               t('download.readyToReceive')}
            </h1>
            <p className="text-muted-foreground">
              {allP2PCompleted ? t('download.receivedSuccessfully') :
               anyP2PDownloading ? (p2pPeerDeviceInfo ? t('download.receivingFrom', { device: p2pPeerDeviceInfo }) : t('download.receivingPleaseWait')) :
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

          <Card className="rounded-3xl border-2 p-10">
            {fileList.description && (
              <div className="mb-8 p-4 bg-muted rounded-lg">
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

                return (
                  <div
                    key={file.id}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all',
                      isActive ? 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30' : 'bg-muted border-transparent'
                    )}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <FileThumbnail source={null} fileName={file.file_name} size="md" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-foreground truncate">
                          {file.file_name}
                        </h4>
                        {isDownloading ? (
                          <div className="mt-1.5">
                            <Progress value={p2pProgress} className="h-1.5 bg-secondary" />
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">{formatFileSize(file.file_size)}</p>
                        )}
                      </div>

                      {isCompleted ? (
                        <span className="flex-shrink-0 px-4 py-2 text-green-600 text-sm font-medium">
                          ✓ {t('common.done')}
                        </span>
                      ) : isDownloading ? (
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-primary text-sm font-medium">{p2pProgress}%</span>
                            {p2pTimeRemaining && (
                              <p className="text-xs text-muted-foreground">{p2pTimeRemaining}</p>
                            )}
                          </div>
                          <button
                            onClick={handleCancelP2PDownload}
                            className="p-1 [@media(hover:hover)]:hover:bg-blue-100 [@media(hover:hover)]:dark:hover:bg-blue-500/20 active:bg-blue-100 dark:active:bg-blue-500/20 rounded transition-colors"
                            title={t('download.cancelDownload')}
                          >
                            <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => startP2PDownload(file.id)}
                          disabled={p2pEnabled && !isActive}
                          size="sm"
                          className="flex-shrink-0 rounded-lg"
                        >
                          {t('common.download')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="text-sm text-muted-foreground hover:text-foreground"
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
    <div className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-3">{t('download.pageTitle')}</h1>
          <p className="text-muted-foreground">
            {t('download.totalFilesAvailable', { count: fileList.total_count })}
          </p>
        </div>

        <Card className="rounded-3xl border-2 p-10">
          {fileList.description && (
            <div className="mb-8 p-4 bg-muted rounded-lg">
              <p className="text-foreground break-words whitespace-pre-wrap">{fileList.description}</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              {t('download.fileListSelected', { selected: selectedFiles.size, total: fileList.total_count })}
            </h3>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                onClick={selectAllFiles}
                className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10"
              >
                {t('download.selectAll')}
              </Button>
              <Button
                variant="ghost"
                onClick={deselectAllFiles}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
              >
                {t('download.deselectAll')}
              </Button>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            {fileList.files.map((file) => (
              <div
                key={file.id}
                onClick={() => toggleFileSelection(file.id)}
                className={cn(
                  'flex items-center space-x-4 p-4 rounded-xl cursor-pointer transition-all',
                  selectedFiles.has(file.id)
                    ? 'bg-blue-50 border-2 border-blue-500 dark:bg-blue-500/10'
                    : 'bg-muted border-2 border-transparent hover:bg-accent'
                )}
              >
                <div className="flex-shrink-0">
                  <div className={cn(
                    'w-6 h-6 rounded-md border-2 flex items-center justify-center',
                    selectedFiles.has(file.id)
                      ? 'bg-primary border-primary'
                      : 'border-input'
                  )}>
                    {selectedFiles.has(file.id) && (
                      <CheckIcon className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <FileThumbnail source={null} fileName={file.file_name} size="md" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-foreground truncate">
                    {file.file_name}
                  </h4>
                  <p className="text-sm text-muted-foreground">{formatFileSize(file.file_size)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="">
            {downloading ? (
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 pl-2">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-foreground self-start">
                        {downloadProgress === 100 ? t('download.pleaseWait') : (downloadAsZip ? t('download.creatingZip') : t('download.downloadingP2P'))}
                      </span>
                      {downloadProgress < 100 && (
                        <div className="flex items-center gap-2 self-end">
                          {downloadTimeRemaining && (
                            <span className="text-xs text-muted-foreground">{downloadTimeRemaining}</span>
                          )}
                          <span className="text-xs font-semibold text-primary">{downloadProgress}%</span>
                        </div>
                      )}
                    </div>
                    <Progress value={downloadProgress} className="h-1.5 bg-muted" />
                  </div>
                  <button
                    onClick={handleCancelDownload}
                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded transition-colors flex-shrink-0"
                    title={t('download.cancelDownload')}
                  >
                    <XMarkIcon className="w-6 h-6 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ) : (
              (() => {
                const selectedTotalSize = fileList.files
                  .filter(f => selectedFiles.has(f.id))
                  .reduce((sum, f) => sum + f.file_size, 0);
                const ZIP_SIZE_LIMIT = 500 * 1024 * 1024;
                const canDownloadAsZip = selectedFiles.size > 1 && selectedTotalSize < ZIP_SIZE_LIMIT;

                return canDownloadAsZip ? (
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => handleDownload(true)}
                      disabled={selectedFiles.size === 0}
                      className="flex-1 h-auto px-4 py-3 md:py-4 text-base font-semibold rounded-xl"
                    >
                      {t('download.zipDownload')}
                    </Button>
                    <Button
                      onClick={() => handleDownload(false)}
                      disabled={selectedFiles.size === 0}
                      className="flex-1 h-auto px-4 py-3 md:py-4 text-base font-semibold rounded-xl"
                    >
                      {t('common.download')}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleDownload(false)}
                    disabled={selectedFiles.size === 0}
                    className="w-full h-auto px-6 py-3 md:py-4 text-lg font-semibold rounded-xl"
                  >
                    {selectedFiles.size === 0
                      ? t('download.selectFilePrompt')
                      : selectedFiles.size === 1
                      ? t('common.download')
                      : t('download.multiFileDownload', { count: selectedFiles.size })
                    }
                  </Button>
                );
              })()
            )}
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t('common.back')}
            </Button>
          </div>
        </Card>
      </div>

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default DownloadFilePage;
