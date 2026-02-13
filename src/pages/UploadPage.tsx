import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import { fileAPI, workerAPI } from '../services/api';
import { ExpirationOption } from '../types';
import { formatFileSize, formatTimeRemaining, calculateTimeRemaining } from '../utils/format';
import { DocumentIcon, XMarkIcon, EyeIcon, EyeSlashIcon, CheckIcon, InformationCircleIcon, PlusIcon } from '@heroicons/react/24/outline';
import { toast } from '../context/ToastContext';
import { useTranslation } from '../i18n';
import TurnstileWidget from '../components/TurnstileWidget';
import FileThumbnail from '../components/FileThumbnail';
import FilePreviewModal from '../components/FilePreviewModal';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { t, language } = useTranslation();

  const fallbackFiles = location.state?.fallbackFiles as File[] | undefined;
  const fromP2PFallback = location.state?.fromP2PFallback as boolean | undefined;
  const fallbackHandledRef = useRef(false);

  const [files, setFiles] = useState<File[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiration, setExpiration] = useState<ExpirationOption>('five_minutes');
  const [isOneTime, setIsOneTime] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTimeRemaining, setUploadTimeRemaining] = useState<string>('');
  const [uploadAbortController, setUploadAbortController] = useState<AbortController | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [transferType, setTransferType] = useState<'server' | 'p2p'>('server');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [p2pTooltipMounted, setP2PTooltipMounted] = useState(false);
  const [p2pTooltipVisible, setP2PTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'right' | 'bottom'>('bottom');
  const p2pButtonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const lastTimeUpdateRef = useRef<number>(0);

  useEffect(() => {
    document.title = t('upload.pageTitle');
  }, [t]);

  useEffect(() => {
    if (fromP2PFallback && fallbackFiles && fallbackFiles.length > 0 && !fallbackHandledRef.current) {
      fallbackHandledRef.current = true;
      setFiles(fallbackFiles);
      setTransferType('server');
      toast.info(t('upload.fallbackNotice'));

      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromP2PFallback, fallbackFiles]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessingFiles(true);
    await new Promise(resolve => setTimeout(resolve, 10));
    setFiles(prev => [...prev, ...acceptedFiles]);
    setIsProcessingFiles(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error(t('upload.selectFilesError'));
      return;
    }

    if (!turnstileToken) {
      toast.error(t('upload.verifyNotRobot'));
      return;
    }

    const abortController = new AbortController();
    setUploadAbortController(abortController);

    const CHUNK_SIZE = 50 * 1024 * 1024;
    const MAX_CONCURRENT_UPLOADS = 10;
    const DIRECT_UPLOAD_THRESHOLD = 100 * 1024 * 1024;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      if (transferType === 'p2p') {
        const response = await fileAPI.createP2PSession(
          files.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream'
          })),
          turnstileToken,
          isAuthenticated && password ? password : undefined
        );

        navigate('/upload/success', {
          state: {
            uploadResult: response,
            uploadedFiles: files
          }
        });
        return;
      }

      const initResponse = await fileAPI.initMultipartUpload({
        files: files.map(file => ({
          file_name: file.name,
          file_size: file.size,
          content_type: file.type || 'application/octet-stream'
        })),
        description: description || undefined,
        password: isAuthenticated && password ? password : undefined,
        expiration: isAuthenticated ? expiration : undefined,
        is_one_time: isAuthenticated ? isOneTime : undefined,
        turnstile_token: turnstileToken,
        chunk_size: CHUNK_SIZE
      });

      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const uploadStartTime = Date.now();

      const completedFileParts: { [key: string]: { part_number: number; etag: string }[] } = {};
      const workerUploadIds: { [key: string]: string } = {};
      const partProgress: { [key: string]: number } = {};
      let completedBytes = 0;

      const updateTotalProgress = () => {
        const inProgressBytes = Object.values(partProgress).reduce((sum, bytes) => sum + bytes, 0);
        const totalUploaded = completedBytes + inProgressBytes;
        const percentage = Math.round((totalUploaded / totalSize) * 100);
        setUploadProgress(percentage);

        const now = Date.now();
        if (now - lastTimeUpdateRef.current >= 1000) {
          const remainingSeconds = calculateTimeRemaining(uploadStartTime, totalUploaded, totalSize);
          setUploadTimeRemaining(formatTimeRemaining(remainingSeconds, language));
          lastTimeUpdateRef.current = now;
        }
      };

      const MAX_CONCURRENT_FILES = 4;

      const uploadFile = async (fileIndex: number): Promise<void> => {
        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const file = files[fileIndex];
        const fileInit = initResponse.files[fileIndex];

        const useDirectUpload = file.size < DIRECT_UPLOAD_THRESHOLD;

        if (useDirectUpload) {
          const progressKey = `${fileIndex}-direct`;
          partProgress[progressKey] = 0;

          const result = await workerAPI.directUpload(
            fileInit.storage_key,
            file,
            (loaded) => {
              partProgress[progressKey] = loaded;
              updateTotalProgress();
            },
            abortController.signal
          );

          delete partProgress[progressKey];
          completedBytes += file.size;
          updateTotalProgress();

          workerUploadIds[fileInit.storage_key] = 'direct';
          completedFileParts[fileInit.storage_key] = [{ part_number: 1, etag: result.etag }];
        } else {
          const totalParts = fileInit.total_parts;
          const uploadId = fileInit.upload_id;

          workerUploadIds[fileInit.storage_key] = uploadId;

          const allPartNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);

          const presignedUrlsResponse = await fileAPI.getPartPresignedUrls({
            upload_session_id: initResponse.upload_session_id,
            storage_key: fileInit.storage_key,
            upload_id: uploadId,
            part_numbers: allPartNumbers
          });

          const presignedUrlMap = new Map<number, string>();
          presignedUrlsResponse.urls.forEach(u => presignedUrlMap.set(u.part_number, u.presigned_url));

          const uploadPartWithProgress = async (partNumber: number): Promise<{ part_number: number; etag: string }> => {
            if (abortController.signal.aborted) {
              throw new Error('Upload cancelled');
            }

            const start = (partNumber - 1) * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);
            const chunkSize = end - start;
            const partKey = `${fileIndex}-${partNumber}`;

            partProgress[partKey] = 0;

            const presignedUrl = presignedUrlMap.get(partNumber);
            if (!presignedUrl) {
              throw new Error(`No presigned URL for part ${partNumber}`);
            }

            const etag = await fileAPI.uploadPart(
              presignedUrl,
              chunk,
              (loaded) => {
                partProgress[partKey] = loaded;
                updateTotalProgress();
              },
              abortController.signal
            );

            delete partProgress[partKey];
            completedBytes += chunkSize;
            updateTotalProgress();

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
      };

      const fileIndices = Array.from({ length: files.length }, (_, i) => i);
      for (let i = 0; i < fileIndices.length; i += MAX_CONCURRENT_FILES) {
        const batch = fileIndices.slice(i, i + MAX_CONCURRENT_FILES);
        await Promise.all(batch.map(uploadFile));
      }

      setUploadProgress(100);

      const response = await fileAPI.completeMultipartUpload({
        upload_session_id: initResponse.upload_session_id,
        share_code: initResponse.share_code,
        files: initResponse.files.map((fileInit, i) => ({
          file_name: fileInit.file_name,
          storage_key: fileInit.storage_key,
          upload_id: workerUploadIds[fileInit.storage_key],
          file_size: files[i].size,
          content_type: files[i].type || 'application/octet-stream',
          parts: completedFileParts[fileInit.storage_key]
        }))
      });

      navigate('/upload/success', {
        state: {
          uploadResult: response,
          uploadedFile: undefined
        }
      });
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || err.message === 'Upload cancelled') {
        toast.info(t('upload.uploadCancelled'));
      } else if (err.response?.status === 400) {
        toast.error(err.response?.data?.message || t('upload.securityRequired'));
        setTurnstileToken('');
      } else if (err.response?.status === 403) {
        toast.error(err.response?.data?.message || t('upload.securityFailed'));
        setTurnstileToken('');
      } else {
        toast.error(err.response?.data?.message || t('upload.uploadFailed'));
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadAbortController(null);
      setTurnstileToken('');
    }
  };

  const handleCancelUpload = () => {
    if (uploadAbortController) {
      uploadAbortController.abort();
    }
  };

  const openP2PTooltip = useCallback(() => {
    setP2PTooltipMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setP2PTooltipVisible(true);
      });
    });
  }, []);

  const closeP2PTooltip = useCallback(() => {
    setP2PTooltipVisible(false);
    setTimeout(() => setP2PTooltipMounted(false), 300);
  }, []);

  const handleTransferTypeChange = (type: 'server' | 'p2p') => {
    setTransferType(type);
    if (type === 'p2p') {
      setIsOneTime(true);
      const dismissed = localStorage.getItem('hideP2PTooltip');
      if (!dismissed) {
        openP2PTooltip();
      }
    } else {
      closeP2PTooltip();
    }
  };

  const handleDismissP2PTooltip = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem('hideP2PTooltip', 'true');
    }
    closeP2PTooltip();
  };

  useEffect(() => {
    if (!p2pTooltipMounted) return;
    const checkPosition = () => {
      const container = p2pButtonRef.current?.closest('.relative') as HTMLElement | null;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const tooltipWidth = 524;
      setTooltipPosition(rect.right + tooltipWidth <= window.innerWidth ? 'right' : 'bottom');
    };
    checkPosition();
    window.addEventListener('resize', checkPosition);
    return () => window.removeEventListener('resize', checkPosition);
  }, [p2pTooltipMounted]);

  useEffect(() => {
    if (!p2pTooltipMounted) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
        p2pButtonRef.current && !p2pButtonRef.current.contains(e.target as Node)
      ) {
        closeP2PTooltip();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [p2pTooltipMounted, closeP2PTooltip]);

  const expirationOptions: { value: ExpirationOption; label: string }[] = [
    { value: 'five_minutes', label: t('format.5min') },
    { value: 'thirty_minutes', label: t('format.30min') },
    { value: 'one_hour', label: t('format.1hour') },
    { value: 'three_hours', label: t('format.3hours') },
    { value: 'six_hours', label: t('format.6hours') },
    { value: 'twelve_hours', label: t('format.12hours') },
    { value: 'twenty_four_hours', label: t('format.24hours') },
  ];

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 py-12 md:pb-32">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-[#EDEDED] mb-3">{t('upload.title')}</h1>
          <p className="text-lg text-gray-600 dark:text-[#888888]">{t('upload.subtitle')}</p>
        </div>

        <div className="mb-10">
          <div className="relative flex gap-1.5 w-full max-w-md bg-gray-100 dark:bg-[#0B0A0B] rounded-xl p-1.5">
            <div
              className="absolute top-1.5 h-[calc(100%-12px)] bg-white dark:bg-[#222222] rounded-lg transition-all duration-200 ease-out"
              style={{
                width: 'calc(50% - 9px)',
                left: transferType === 'server' ? '6px' : 'calc(50% + 3px)',
              }}
            />

            <button
              type="button"
              onClick={() => handleTransferTypeChange('server')}
              className={`relative z-10 flex-1 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                transferType === 'server'
                  ? 'text-gray-900 dark:text-[#EDEDED]'
                  : 'text-gray-600 dark:text-[#888888] hover:bg-gray-200/50 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-[#EDEDED]'
              }`}
            >
              {t('upload.serverTransfer')}
            </button>
            <button
              ref={p2pButtonRef}
              type="button"
              onClick={() => handleTransferTypeChange('p2p')}
              className={`relative z-10 flex-1 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                transferType === 'p2p'
                  ? 'text-gray-900 dark:text-[#EDEDED]'
                  : 'text-gray-600 dark:text-[#888888] hover:bg-gray-200/50 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-[#EDEDED]'
              }`}
            >
              {t('upload.p2pTransfer')}
            </button>

            {p2pTooltipMounted && (
              <div
                ref={tooltipRef}
                className={`absolute bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg p-4 text-sm text-gray-700 dark:text-[#888888] z-50 transition-all duration-300 break-keep
                  ${tooltipPosition === 'bottom'
                    ? 'top-full left-0 right-0 mt-3'
                    : 'top-1/2 left-full w-[32rem] ml-3 -translate-y-1/2'
                  }
                  ${p2pTooltipVisible ? 'opacity-100' : 'opacity-0'}
                `}
              >
                {tooltipPosition === 'bottom' && (
                  <div className="absolute -top-[7px] right-[25%] w-3.5 h-3.5 bg-white dark:bg-[#1A1A1A] border-l border-t border-gray-200 dark:border-white/10 transform rotate-45" />
                )}
                {tooltipPosition === 'right' && (
                  <div className="absolute top-1/2 -left-[7px] -translate-y-1/2 w-3.5 h-3.5 bg-white dark:bg-[#1A1A1A] border-l border-b border-gray-200 dark:border-white/10 transform rotate-45" />
                )}
                <p className="font-semibold text-blue-600 mb-2 flex items-center gap-1">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600" />
                  {t('upload.p2pNotice')}
                </p>
                <p className="mb-1 flex"><span className="flex-shrink-0 mr-1.5">•</span><span>{t('upload.p2pBullet1')}</span></p>
                <p className="mb-1 flex"><span className="flex-shrink-0 mr-1.5">•</span><span>{t('upload.p2pBullet2')}</span></p>
                <p className="mb-3 flex"><span className="flex-shrink-0 mr-1.5">•</span><span>{t('upload.p2pBullet3')}</span></p>
                <div className="border-t border-gray-100 dark:border-white/10 pt-3 px-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleDismissP2PTooltip(true)}
                    className="text-xs text-gray-400 dark:text-[#666666] hover:text-gray-600 dark:hover:text-[#888888] underline underline-offset-2 transition-colors"
                  >
                    {t('upload.dontShowAgain')}
                  </button>
                  <button
                    type="button"
                    onClick={() => closeP2PTooltip()}
                    className="px-5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {t('common.confirm')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-10">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl cursor-pointer transition-colors h-[calc(100vw-2rem)] md:h-[30rem] ${
              isDragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                : 'border-gray-300 bg-white hover:border-gray-400 dark:border-white/15 dark:bg-[#0B0A0B] dark:hover:border-white/25'
            } ${files.length > 0 ? 'p-4 md:p-6 flex flex-col' : 'p-6 md:p-16 text-center'}`}
          >
            <input {...getInputProps()} />

            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-14 h-14 md:w-20 md:h-20 bg-blue-100 dark:bg-blue-500/15 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-6">
                  <DocumentIcon className="w-7 h-7 md:w-10 md:h-10 text-blue-600" />
                </div>
                <p className="text-sm md:text-xl font-semibold text-gray-900 dark:text-[#EDEDED] mb-1 md:mb-2">
                  {t('upload.dropzoneText', { action: transferType === 'p2p' ? t('upload.dropzoneActionTransfer') : t('upload.dropzoneActionUpload') })}
                </p>
                {transferType !== 'p2p' && (
                  <p className="text-xs md:text-sm text-gray-500 dark:text-[#888888] mb-3 md:mb-6">
                    {t('upload.maxSizeNotice')}
                  </p>
                )}
                {transferType === 'p2p' && <div className="mb-3 md:mb-6" />}
                <button
                  type="button"
                  className="px-6 py-2 md:px-8 md:py-3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-[#EDEDED] text-sm md:text-base font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                >
                  {t('upload.selectFiles')}
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-gray-900 dark:text-[#EDEDED] mt-0.5 md:mt-0 mb-3.5 md:mb-4 flex-shrink-0">{t('upload.selectedFiles', { count: files.length })}</h3>
                <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFile(file);
                      }}
                      className="flex items-center justify-between p-3.5 bg-gray-100 dark:bg-white/5 rounded-lg md:hover:bg-gray-200/70 dark:md:hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <FileThumbnail source={file} fileName={file.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-[#EDEDED] truncate">{file.name}</p>
                          <p className="text-xs text-gray-500 dark:text-[#888888]">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                        className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded"
                      >
                        <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-[#888888]" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="w-full p-3.5 border-2 border-dashed border-gray-300 dark:border-white/15 rounded-lg flex items-center justify-center text-gray-400 dark:text-[#666666] hover:text-gray-600 dark:hover:text-[#888888] hover:border-gray-400 dark:hover:border-white/25 transition-colors"
                  >
                    <PlusIcon className="w-6 h-6" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {isProcessingFiles && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/30">
            <p className="text-sm font-medium text-gray-700 dark:text-[#EDEDED]">{t('upload.processingFiles')}</p>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED] mb-8">{t('upload.transferSettings')}</h2>

          {transferType !== 'p2p' && (
            <div className="mb-8">
              <h3 className={`text-base font-semibold text-gray-900 dark:text-[#EDEDED] ${!isAuthenticated ? 'mb-1' : 'mb-4'}`}>{t('upload.expiration')}</h3>
              {!isAuthenticated && (
                <p className="mb-4 text-sm text-gray-500 dark:text-[#888888]">
                  {t('upload.loginRequired')}
                </p>
              )}
              <div className="flex flex-wrap gap-2 md:gap-3 mb-4">
                {expirationOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setExpiration(option.value)}
                    disabled={!isAuthenticated && option.value !== 'five_minutes'}
                    className={`px-4 py-2 md:px-6 md:py-3 rounded-xl text-sm md:text-base font-medium transition-colors ${
                      expiration === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-[#EDEDED] hover:bg-gray-200 dark:hover:bg-white/10'
                    } ${!isAuthenticated && option.value !== 'five_minutes' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {isAuthenticated && (
                <div className="mt-4">
                  <div className="flex items-center">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isOneTime}
                        onChange={(e) => setIsOneTime(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        onClick={() => setIsOneTime(!isOneTime)}
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors cursor-pointer ${
                          isOneTime
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 dark:border-white/15 bg-white dark:bg-[#0B0A0B]'
                        }`}
                      >
                        {isOneTime && (
                          <CheckIcon className="w-4 h-4 text-white" strokeWidth={3} />
                        )}
                      </div>
                    </div>
                    <span
                      onClick={() => setIsOneTime(!isOneTime)}
                      className="ml-2.5 text-base font-medium cursor-pointer text-gray-900 dark:text-[#EDEDED]"
                    >
                      {t('upload.oneTimeDownload')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-base font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
              {t('upload.password')} <span className="text-sm text-gray-400 dark:text-[#666666] font-normal">{t('common.optional')}</span>
            </h3>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!isAuthenticated}
                placeholder={isAuthenticated ? t('upload.passwordPlaceholder') : t('upload.passwordPlaceholderDisabled')}
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-white/15 dark:bg-[#0B0A0B] dark:text-[#EDEDED] dark:placeholder-[#666666] rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/50 focus:border-transparent disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-white/5 dark:disabled:text-[#666666]"
              />
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-[#888888] hover:text-gray-700 dark:hover:text-[#EDEDED]"
                >
                  {showPassword ? (
                    <EyeIcon className="w-5 h-5" />
                  ) : (
                    <EyeSlashIcon className="w-5 h-5" />
                  )}
                </button>
              ) : (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400 dark:text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">
              {t('upload.description')} <span className="text-sm text-gray-400 dark:text-[#666666] font-normal">{t('common.optional')}</span>
            </h3>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('upload.descriptionPlaceholder')}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-white/15 dark:bg-[#0B0A0B] dark:text-[#EDEDED] dark:placeholder-[#666666] rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/50 focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="mt-7">
          {isUploading && transferType !== 'p2p' ? (
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 pl-2">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-[#EDEDED] self-start">
                      {uploadProgress === 100 ? t('upload.pleaseWait') : t('upload.uploading')}
                    </span>
                    {uploadProgress < 100 && (
                      <div className="flex items-center gap-2 self-end">
                        {uploadTimeRemaining && (
                          <span className="text-xs text-gray-500 dark:text-[#888888]">{uploadTimeRemaining}</span>
                        )}
                        <span className="text-xs font-semibold text-blue-600">{uploadProgress}%</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleCancelUpload}
                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded transition-colors flex-shrink-0"
                  title={t('upload.cancelUpload')}
                >
                  <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-[#888888]" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[22px] md:gap-4">
              <div>
                <TurnstileWidget
                  onVerify={(token) => setTurnstileToken(token)}
                  onError={() => {
                    setTurnstileToken('');
                    toast.error(t('upload.securityFailed'));
                  }}
                  onExpire={() => {
                    setTurnstileToken('');
                  }}
                />
              </div>

              <div className="flex justify-center md:justify-end">
                <button
                  onClick={handleUpload}
                  disabled={files.length === 0 || !turnstileToken || (isUploading && transferType === 'p2p')}
                  className="w-full md:w-auto min-w-[120px] px-10 py-3 md:py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-white/10 dark:disabled:text-[#666666] disabled:cursor-not-allowed transition-colors"
                >
                  {isUploading && transferType === 'p2p' ? t('upload.requesting') : (transferType === 'p2p' ? t('upload.transfer') : t('common.upload'))}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {previewFile && (
        <FilePreviewModal
          file={{
            fileName: previewFile.name,
            fileSize: previewFile.size,
            source: previewFile,
          }}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default UploadPage;
