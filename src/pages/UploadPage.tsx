import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import { fileAPI, workerAPI } from '../services/api';
import { ExpirationOption } from '../types';
import { formatTimeRemaining, calculateTimeRemaining, getImageDimensions } from '../utils/format';
import { toast } from '../context/ToastContext';
import { useTranslation, translateApiError } from '../i18n';
import FilePreviewModal from '../components/FilePreviewModal';
import TransferTypeToggle from './upload/TransferTypeToggle';
import FileDropzone from './upload/FileDropzone';
import TransferSettings from './upload/TransferSettings';
import UploadProgressBar from './upload/UploadProgressBar';
import { storeUploadFiles, restoreUploadFiles, clearUploadFiles } from '../utils/uploadFileStorage';

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

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { t, language } = useTranslation();

  const fallbackFiles = location.state?.fallbackFiles as File[] | undefined;
  const fromP2PFallback = location.state?.fromP2PFallback as boolean | undefined;
  const fallbackHandledRef = useRef(false);

  const initialFiles = location.state?.initialFiles as File[] | undefined;
  const fromUnifiedBox = location.state?.fromUnifiedBox as boolean | undefined;
  const initialFilesHandledRef = useRef(false);

  const [files, setFiles] = useState<File[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiration, setExpiration] = useState<ExpirationOption>('five_minutes');
  const [isOneTime, setIsOneTime] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [uploadTimeRemaining, setUploadTimeRemaining] = useState<string>('');
  const [uploadAbortController, setUploadAbortController] = useState<AbortController | null>(null);
  const [transferType, setTransferType] = useState<'server' | 'p2p'>('server');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [p2pTooltipMounted, setP2PTooltipMounted] = useState(false);
  const [p2pTooltipVisible, setP2PTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'right' | 'bottom'>('bottom');
  const p2pButtonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const lastTimeUpdateRef = useRef<number>(0);

  const filesRef = useRef(files);
  filesRef.current = files;
  const transferTypeRef = useRef(transferType);
  transferTypeRef.current = transferType;
  const descriptionRef = useRef(description);
  descriptionRef.current = description;
  const passwordRef = useRef(password);
  passwordRef.current = password;
  const expirationRef = useRef(expiration);
  expirationRef.current = expiration;
  const isOneTimeRef = useRef(isOneTime);
  isOneTimeRef.current = isOneTime;
  const isRestoringRef = useRef(false);

  useEffect(() => {
    document.title = t('upload.pageTitle');
  }, [t]);

  useEffect(() => {
    const wasRefresh = sessionStorage.getItem('uploadPageRefreshing');
    sessionStorage.removeItem('uploadPageRefreshing');

    if (wasRefresh) {
      const savedTransferType = sessionStorage.getItem('uploadTransferType') as 'server' | 'p2p' | null;
      const savedDescription = sessionStorage.getItem('uploadDescription');
      const savedPassword = sessionStorage.getItem('uploadPassword');
      const savedExpiration = sessionStorage.getItem('uploadExpiration') as ExpirationOption | null;
      const savedIsOneTime = sessionStorage.getItem('uploadIsOneTime');

      if (savedTransferType) {
        setTransferType(savedTransferType);
        if (savedTransferType === 'p2p') {
          setIsOneTime(true);
        }
      }
      if (savedDescription !== null) setDescription(savedDescription);
      if (savedPassword !== null) setPassword(savedPassword);
      if (savedExpiration) setExpiration(savedExpiration);
      if (savedIsOneTime !== null) setIsOneTime(savedIsOneTime === 'true');
      isRestoringRef.current = true;
      restoreUploadFiles().then(restored => {
        if (restored.length > 0) {
          setFiles(restored);
        }
        isRestoringRef.current = false;
      });
    } else {
      clearUploadFiles();
      sessionStorage.removeItem('uploadTransferType');
      sessionStorage.removeItem('uploadDescription');
      sessionStorage.removeItem('uploadPassword');
      sessionStorage.removeItem('uploadExpiration');
      sessionStorage.removeItem('uploadIsOneTime');
    }
  }, []);

  useEffect(() => {
    if (isRestoringRef.current) return;
    sessionStorage.setItem('uploadTransferType', transferType);
    sessionStorage.setItem('uploadDescription', description);
    sessionStorage.setItem('uploadPassword', password);
    sessionStorage.setItem('uploadExpiration', expiration);
    sessionStorage.setItem('uploadIsOneTime', isOneTime ? 'true' : 'false');
  }, [transferType, description, password, expiration, isOneTime]);

  useEffect(() => {
    if (isRestoringRef.current) return;

    if (files.length > 0) {
      storeUploadFiles(files);
    } else {
      clearUploadFiles();
    }
  }, [files]);

  useEffect(() => {
    const handlePageHide = () => {
      if (filesRef.current.length > 0) {
        sessionStorage.setItem('uploadPageRefreshing', 'true');
        sessionStorage.setItem('uploadTransferType', transferTypeRef.current);
        sessionStorage.setItem('uploadDescription', descriptionRef.current);
        sessionStorage.setItem('uploadPassword', passwordRef.current);
        sessionStorage.setItem('uploadExpiration', expirationRef.current);
        sessionStorage.setItem('uploadIsOneTime', isOneTimeRef.current ? 'true' : 'false');
      }
    };
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        sessionStorage.removeItem('uploadPageRefreshing');
      }
    };
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

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

  useEffect(() => {
    if (fromUnifiedBox && initialFiles && initialFiles.length > 0 && !initialFilesHandledRef.current) {
      initialFilesHandledRef.current = true;
      setFiles(initialFiles);
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromUnifiedBox, initialFiles]);

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
            fileInit.upload_signature,
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

          const results = await runConcurrent(
            allPartNumbers.map(pn => () => uploadPartWithProgress(pn)),
            MAX_CONCURRENT_UPLOADS
          );

          completedFileParts[fileInit.storage_key] = results.sort((a, b) => a.part_number - b.part_number);
        }
      };

      const fileIndices = Array.from({ length: files.length }, (_, i) => i);
      await runConcurrent(
        fileIndices.map(i => () => uploadFile(i)),
        MAX_CONCURRENT_FILES
      );

      setUploadProgress(100);
      setIsCompleting(true);

      const dimensions = await Promise.all(
        files.map(file => getImageDimensions(file))
      );

      const response = await fileAPI.completeMultipartUpload({
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
        toast.error(translateApiError(err.response?.data, t) || t('upload.securityRequired'));
      } else if (err.response?.status === 403) {
        toast.error(translateApiError(err.response?.data, t) || t('upload.securityFailed'));
      } else {
        toast.error(translateApiError(err.response?.data, t) || t('upload.uploadFailed'));
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setIsCompleting(false);
      setUploadAbortController(null);
    }
  };

  const handleCancelUpload = () => {
    if (uploadAbortController) {
      uploadAbortController.abort();
    }
  };

  const openP2PTooltip = useCallback(() => {
    const container = p2pButtonRef.current?.closest('.relative') as HTMLElement | null;
    if (container) {
      const rect = container.getBoundingClientRect();
      const tooltipWidth = 524;
      setTooltipPosition(rect.right + tooltipWidth <= window.innerWidth ? 'right' : 'bottom');
    }
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
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-20">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-3">{t('upload.title')}</h1>
          <p className="text-lg text-muted-foreground">{t('upload.subtitle')}</p>
        </div>

        <TransferTypeToggle
          transferType={transferType}
          onTransferTypeChange={handleTransferTypeChange}
          p2pTooltipMounted={p2pTooltipMounted}
          p2pTooltipVisible={p2pTooltipVisible}
          tooltipPosition={tooltipPosition}
          p2pButtonRef={p2pButtonRef}
          tooltipRef={tooltipRef}
          onDismissP2PTooltip={handleDismissP2PTooltip}
          onCloseP2PTooltip={closeP2PTooltip}
        />

        <FileDropzone
          files={files}
          transferType={transferType}
          isAuthenticated={isAuthenticated}
          isDragActive={isDragActive}
          isProcessingFiles={isProcessingFiles}
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          onRemoveFile={removeFile}
          onPreviewFile={setPreviewFile}
        />

        <TransferSettings
          transferType={transferType}
          isAuthenticated={isAuthenticated}
          expiration={expiration}
          onExpirationChange={setExpiration}
          isOneTime={isOneTime}
          onIsOneTimeChange={setIsOneTime}
          password={password}
          onPasswordChange={setPassword}
          showPassword={showPassword}
          onShowPasswordToggle={() => setShowPassword(!showPassword)}
          description={description}
          onDescriptionChange={setDescription}
          expirationOptions={expirationOptions}
        />

        <UploadProgressBar
          isUploading={isUploading}
          transferType={transferType}
          uploadProgress={uploadProgress}
          isCompleting={isCompleting}
          uploadTimeRemaining={uploadTimeRemaining}
          files={files}
          onUpload={handleUpload}
          onCancelUpload={handleCancelUpload}
        />
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
