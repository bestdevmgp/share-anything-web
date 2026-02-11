import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fileAPI } from '../services/api';
import { FileListResponse } from '../types';
import { formatFileSize, downloadFile, formatDateTime, isImageFile, isPptxFile, formatTimeRemaining, calculateTimeRemaining } from '../utils/format';
import { DocumentIcon, LockClosedIcon, CheckIcon, ArrowDownTrayIcon, EyeIcon, EyeSlashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from '../context/ToastContext';
import { useTranslation } from '../i18n';
import TurnstileWidget from '../components/TurnstileWidget';
import { useP2PDownloader } from '../hooks/useP2PDownloader';
import FileThumbnail from '../components/FileThumbnail';
import FilePreviewModal from '../components/FilePreviewModal';
import { useThumbnail } from '../hooks/useThumbnail';

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

  const [turnstileToken, setTurnstileToken] = useState<string>('');
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

      const list = await fileAPI.getFileList(code, turnstileToken);
      setFileList(list);
      setPasswordVerified(true);
      toast.success(t('download.passwordVerified'));

      if (list.files.length === 1) {
        setSelectedFiles(new Set([list.files[0].id]));
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 mb-8 text-gray-600 dark:text-[#888888]">
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-[#888888]">{t('download.loadingFileInfo')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-3xl border-2 border-gray-200 dark:bg-[#0B0A0B] dark:border-white/10 p-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 18L18 6" className="error-x-path-1" />
                <path d="M6 6l12 12" className="error-x-path-2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED] mb-2">{errorTitle}</h2>
            <p className="text-gray-600 dark:text-[#888888] mb-6">{error}</p>
            <button
              onClick={() => navigate('/', { state: { autoFocus: true } })}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('common.retry')}
            </button>
          </div>
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
          <div className="bg-white rounded-3xl border-2 border-gray-200 dark:bg-[#0B0A0B] dark:border-white/10 p-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <LockClosedIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-[#EDEDED] mb-2">{t('download.passwordTitle')}</h1>
              <p className="text-gray-600 dark:text-[#888888]">
                {t('download.passwordProtected')}
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-6">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('download.passwordPlaceholder')}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-white/15 dark:bg-[#0B0A0B] dark:text-[#EDEDED] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:text-[#888888] dark:hover:text-[#EDEDED]"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
              >
                {t('common.confirm')}
              </button>
            </form>
          </div>
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
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                isP2PDownload && p2pStatus === 'downloading' ? 'bg-blue-100 dark:bg-blue-500/15' : 'bg-green-100 dark:bg-green-500/15'
              }`}>
                {isP2PDownload && p2pStatus === 'downloading' ? (
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                ) : (
                  <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke={isP2PDownload && p2pStatus === 'completed' ? '#16a34a' : '#16a34a'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" className="download-checkmark-path" />
                  </svg>
                )}
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-[#EDEDED] mb-3">
              {isP2PDownload ? (
                p2pStatus === 'waiting' || p2pStatus === 'connecting' ? t('download.readyToReceive') :
                p2pStatus === 'downloading' ? t('download.downloading') :
                p2pStatus === 'completed' ? t('download.downloadCompleteTitle') :
                t('download.readyToDownload')
              ) : t('download.readyToDownload')}
            </h1>
            <p className="text-gray-600 dark:text-[#888888]">
              {isP2PDownload ? (
                p2pStatus === 'downloading' ? (p2pPeerDeviceInfo ? t('download.receivingFrom', { device: p2pPeerDeviceInfo }) : t('download.receivingPleaseWait')) :
                p2pStatus === 'completed' ? t('download.downloadedSuccessfully') :
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

          <div className="bg-white rounded-3xl border-2 border-gray-200 dark:bg-[#0B0A0B] dark:border-white/10 p-6 md:p-8">
            <div className="flex justify-center mb-5">
              {loadingPreview ? (
                <div className="w-24 h-24 bg-blue-100 dark:bg-blue-500/15 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                  <DocumentIcon className="w-12 h-12 text-blue-600" />
                </div>
              )}
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED] mb-3 text-center break-all">
                {file.file_name}
              </h2>
              {fileList.description && (
                <p className="text-gray-600 dark:text-[#888888] text-center mb-6 break-words whitespace-pre-wrap">
                  {fileList.description}
                </p>
              )}
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-white/10">
                <span className="text-gray-600 dark:text-[#888888]">{t('download.fileSize')}</span>
                <span className="font-semibold text-gray-900 dark:text-[#EDEDED]">{formatFileSize(file.file_size)}</span>
              </div>
              {fileList.description && (
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-white/10">
                  <span className="text-gray-600 dark:text-[#888888]">{t('download.uploader')}</span>
                  <span className="font-semibold text-gray-900 dark:text-[#EDEDED]">{t('common.anonymousUser')}</span>
                </div>
              )}
              {!isP2PDownload && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 dark:text-[#888888]">{t('download.expiresAt')}</span>
                  <span className="font-semibold text-gray-900 dark:text-[#EDEDED]">{formatDateTime(fileList.expires_at, language)}</span>
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
                          <span className="text-sm font-medium text-gray-700 dark:text-[#EDEDED] self-start">
                            {p2pStatus === 'connecting' ? t('download.connectingP2P') : t('download.downloadingP2P')}
                          </span>
                          {p2pStatus === 'downloading' && (
                            <div className="flex items-center gap-2 self-end">
                              {p2pTimeRemaining && (
                                <span className="text-xs text-gray-500">{p2pTimeRemaining}</span>
                              )}
                              <span className="text-xs font-semibold text-blue-600">{p2pProgress}%</span>
                            </div>
                          )}
                        </div>
                        {p2pStatus === 'downloading' && (
                          <div className="bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                              style={{ width: `${p2pProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleCancelP2PDownload}
                        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded transition-colors flex-shrink-0"
                        title={t('download.cancelDownload')}
                      >
                        <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-[#888888]" />
                      </button>
                    </div>
                  </div>
                ) : p2pStatus === 'completed' ? (
                  <div className="text-center py-4 text-green-600 font-semibold">
                    ✓ {t('download.downloadCompleteMark')}
                  </div>
                ) : (
                  <button
                    onClick={() => setP2pEnabled(true)}
                    className="w-full px-6 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    <span>{t('download.startDownload')}</span>
                  </button>
                )
              ) : downloading ? (
                <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 pl-2">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-[#EDEDED] self-start">
                          {downloadProgress === 100 ? t('download.pleaseWait') : t('download.downloadingP2P')}
                        </span>
                        {downloadProgress < 100 && (
                          <div className="flex items-center gap-2 self-end">
                            {downloadTimeRemaining && (
                              <span className="text-xs text-gray-500">{downloadTimeRemaining}</span>
                            )}
                            <span className="text-xs font-semibold text-blue-600">{downloadProgress}%</span>
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleCancelDownload}
                      className="p-1 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded transition-colors flex-shrink-0"
                      title={t('download.cancelDownload')}
                    >
                      <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-[#888888]" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleDownload(false)}
                  className="w-full px-6 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  <span>{t('download.downloadFile')}</span>
                </button>
              )}
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-[#888888] dark:hover:text-[#EDEDED]"
              >
                {t('common.back')}
              </button>
            </div>
          </div>
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
    return (
      <div className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-[#EDEDED] mb-3">{t('download.pageTitle')}</h1>
            <p className="text-gray-600 dark:text-[#888888]">
              {p2pPeerDeviceInfo ? t('download.connectedToDeviceShort', { device: p2pPeerDeviceInfo }) : ''}{t('download.selectFileToDownload')}
            </p>
          </div>

          <div className="bg-white rounded-3xl border-2 border-gray-200 dark:bg-[#0B0A0B] dark:border-white/10 p-10">
            {fileList.description && (
              <div className="mb-8 p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
                <p className="text-gray-700 dark:text-[#EDEDED] break-words whitespace-pre-wrap">{fileList.description}</p>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
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
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isActive ? 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30' : 'bg-gray-50 border-transparent dark:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <FileThumbnail source={null} fileName={file.file_name} size="md" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-gray-900 dark:text-[#EDEDED] truncate">
                          {file.file_name}
                        </h4>
                        {isDownloading ? (
                          <div className="mt-1.5">
                            <div className="bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                                style={{ width: `${p2pProgress}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-[#888888]">{formatFileSize(file.file_size)}</p>
                        )}
                      </div>

                      {isCompleted ? (
                        <span className="flex-shrink-0 px-4 py-2 text-green-600 text-sm font-medium">
                          ✓ {t('common.done')}
                        </span>
                      ) : isDownloading ? (
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-blue-600 text-sm font-medium">{p2pProgress}%</span>
                            {p2pTimeRemaining && (
                              <p className="text-xs text-gray-500">{p2pTimeRemaining}</p>
                            )}
                          </div>
                          <button
                            onClick={handleCancelP2PDownload}
                            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded transition-colors"
                            title={t('download.cancelDownload')}
                          >
                            <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-[#888888]" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startP2PDownload(file.id)}
                          disabled={p2pEnabled && !isActive}
                          className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-white/10 disabled:cursor-not-allowed transition-colors"
                        >
                          {t('common.download')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-[#888888] dark:hover:text-[#EDEDED]"
              >
                {t('common.back')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-[#EDEDED] mb-3">{t('download.pageTitle')}</h1>
          <p className="text-gray-600 dark:text-[#888888]">
            {t('download.totalFilesAvailable', { count: fileList.total_count })}
          </p>
        </div>

        <div className="bg-white rounded-3xl border-2 border-gray-200 dark:bg-[#0B0A0B] dark:border-white/10 p-10">
          {fileList.description && (
            <div className="mb-8 p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
              <p className="text-gray-700 dark:text-[#EDEDED] break-words whitespace-pre-wrap">{fileList.description}</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED]">
              {t('download.fileListSelected', { selected: selectedFiles.size, total: fileList.total_count })}
            </h3>
            <div className="flex gap-1">
              <button
                onClick={selectAllFiles}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg"
              >
                {t('download.selectAll')}
              </button>
              <button
                onClick={deselectAllFiles}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-[#888888] hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
              >
                {t('download.deselectAll')}
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            {fileList.files.map((file) => (
              <div
                key={file.id}
                onClick={() => toggleFileSelection(file.id)}
                className={`flex items-center space-x-4 p-4 rounded-xl cursor-pointer transition-all ${
                  selectedFiles.has(file.id)
                    ? 'bg-blue-50 border-2 border-blue-500 dark:bg-blue-500/10'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex-shrink-0">
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                    selectedFiles.has(file.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 dark:border-white/15'
                  }`}>
                    {selectedFiles.has(file.id) && (
                      <CheckIcon className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <FileThumbnail source={null} fileName={file.file_name} size="md" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-[#EDEDED] truncate">
                    {file.file_name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-[#888888]">{formatFileSize(file.file_size)}</p>
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
                      <span className="text-sm font-medium text-gray-700 dark:text-[#EDEDED] self-start">
                        {downloadProgress === 100 ? t('download.pleaseWait') : (downloadAsZip ? t('download.creatingZip') : t('download.downloadingP2P'))}
                      </span>
                      {downloadProgress < 100 && (
                        <div className="flex items-center gap-2 self-end">
                          {downloadTimeRemaining && (
                            <span className="text-xs text-gray-500">{downloadTimeRemaining}</span>
                          )}
                          <span className="text-xs font-semibold text-blue-600">{downloadProgress}%</span>
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCancelDownload}
                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded transition-colors flex-shrink-0"
                    title={t('download.cancelDownload')}
                  >
                    <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-[#888888]" />
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
                    <button
                      onClick={() => handleDownload(true)}
                      disabled={selectedFiles.size === 0}
                      className="flex-1 px-4 py-3 md:py-4 bg-gray-100 text-gray-700 text-base font-semibold rounded-xl hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors dark:bg-white/5 dark:text-[#EDEDED] dark:hover:bg-white/10"
                    >
                      {t('download.zipDownload')}
                    </button>
                    <button
                      onClick={() => handleDownload(false)}
                      disabled={selectedFiles.size === 0}
                      className="flex-1 px-4 py-3 md:py-4 bg-blue-600 text-white text-base font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-white/10 disabled:cursor-not-allowed transition-colors"
                    >
                      {t('common.download')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDownload(false)}
                    disabled={selectedFiles.size === 0}
                    className="w-full px-6 py-3 md:py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-white/10 disabled:cursor-not-allowed transition-colors"
                  >
                    {selectedFiles.size === 0
                      ? t('download.selectFilePrompt')
                      : selectedFiles.size === 1
                      ? t('common.download')
                      : t('download.multiFileDownload', { count: selectedFiles.size })
                    }
                  </button>
                );
              })()
            )}
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-[#888888] dark:hover:text-[#EDEDED]"
            >
              {t('common.back')}
            </button>
          </div>
        </div>
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
