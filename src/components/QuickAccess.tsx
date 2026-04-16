import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import { quickAccessAPI } from '../services/api';
import { QuickAccessFile } from '../types';
import { formatFileSize } from '../utils/format';
import { PlusIcon, TrashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, XMarkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { toast } from '../context/ToastContext';
import { useTranslation } from '../i18n';
import { useNavigate } from 'react-router-dom';
import FileThumbnail from './FileThumbnail';
import FilePreviewModal from './FilePreviewModal';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { cn } from 'lib/utils';
import { useQuickAccessUpload } from '../context/QuickAccessUploadContext';

interface PreviewModalFile {
  fileName: string;
  fileSize: number;
  source: string;
  presignedUrl?: string;
}

const QuickAccess: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { uploadingFiles, isUploading, handleUpload, handleCancelUpload, completedCounter } = useQuickAccessUpload();

  const [files, setFiles] = useState<QuickAccessFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setTick] = useState(0);

  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map());
  const [previewModalFile, setPreviewModalFile] = useState<PreviewModalFile | null>(null);

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

  useEffect(() => {
    if (files.length === 0) return;

    const fetchPreviewUrls = async () => {
      const newUrls = new Map<string, string>();
      await Promise.all(
        files.map(async (file) => {
          if (previewUrls.has(file.id)) {
            newUrls.set(file.id, previewUrls.get(file.id)!);
            return;
          }
          try {
            const response = await quickAccessAPI.previewFile(file.id);
            newUrls.set(file.id, response.preview_url);
          } catch {
          }
        })
      );
      setPreviewUrls(newUrls);
    };

    fetchPreviewUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

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

  useEffect(() => {
    if (completedCounter > 0) fetchFiles();
  }, [completedCounter, fetchFiles]);

  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setIsFileDialogOpen(false);
    if (!isAuthenticated) return;
    if (isUploading) return;
    handleUpload(acceptedFiles);
  }, [isAuthenticated, isUploading, handleUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: isUploading,
    noDrag: isUploading,
    onFileDialogOpen: () => setIsFileDialogOpen(true),
    onFileDialogCancel: () => setIsFileDialogOpen(false),
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

  const [sharingFileId, setSharingFileId] = useState<string | null>(null);
  const [sharedInfo, setSharedInfo] = useState<{ fileId: string; code: string; url: string } | null>(null);
  const [copiedSharedLink, setCopiedSharedLink] = useState(false);

  const handleShare = async (file: QuickAccessFile) => {
    try {
      setSharingFileId(file.id);
      const response = await quickAccessAPI.shareFile(file.id);
      const shareUrl = `${window.location.origin}/download/${response.share_code}`;
      await navigator.clipboard.writeText(shareUrl);
      setSharedInfo({ fileId: file.id, code: response.share_code, url: shareUrl });
      setCopiedSharedLink(true);
      setTimeout(() => setCopiedSharedLink(false), 2000);
      toast.success(t('quickAccess.shareSuccess'));
    } catch {
      toast.error(t('quickAccess.shareFailed'));
    } finally {
      setSharingFileId(null);
    }
  };

  const handleCopySharedLink = async () => {
    if (!sharedInfo) return;
    await navigator.clipboard.writeText(sharedInfo.url);
    setCopiedSharedLink(true);
    setTimeout(() => setCopiedSharedLink(false), 2000);
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

  const CONTAINER_HEIGHT = 'h-[316px] md:h-[412px]';

  if (!isAuthenticated) {
    return (
      <div className={cn('bg-card rounded-2xl border-[3px] border-dashed border-border', CONTAINER_HEIGHT, 'flex flex-col items-center justify-center text-center px-6')}>
        <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4">
          <PlusIcon className="w-7 h-7 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t('quickAccess.title')}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('quickAccess.description')}
        </p>
        <Button
          onClick={() => navigate('/signin')}
        >
          {t('quickAccess.loginRequired')}
        </Button>
      </div>
    );
  }

  const hasContent = files.length > 0 || uploadingFiles.length > 0;

  if (isLoading && !hasContent) {
    return (
      <div className={cn('bg-card rounded-2xl border-[3px] border-dashed border-border', CONTAINER_HEIGHT, 'flex flex-col')}>
        <div className="flex items-center justify-between px-7 pt-4 pb-3 md:px-8 md:pt-5 md:pb-4 flex-shrink-0">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="flex-1 overflow-hidden px-4 md:px-5 pb-1 md:pb-1 mb-3 md:mb-4 flex flex-col gap-2 md:gap-[8px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn(
              'flex items-center px-3 py-[12px] md:py-3 rounded-lg border border-foreground/[0.09]',
              i >= 3 && 'hidden md:flex'
            )}>
              <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0 mr-3" />
              <div className="flex-1 min-w-0 mr-3">
                <Skeleton className="h-4 w-[60%] mb-1.5" />
                <Skeleton className="h-3 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          'bg-card rounded-2xl border-[3px] border-dashed border-border transition-colors',
          CONTAINER_HEIGHT,
          'flex flex-col cursor-pointer',
          isDragActive
            ? 'border-primary bg-primary/5'
            : isFileDialogOpen
              ? 'border-input'
              : 'border-foreground/[0.09] can-hover:hover:border-foreground/40 active:border-foreground/40'
        )}
      >
        <input {...getInputProps()} />

        {!hasContent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <PlusIcon className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('quickAccess.title')}
            </h3>
            <p className="text-sm text-muted-foreground mb-1.5">
              {t('quickAccess.description')}
            </p>
            <p className="text-xs text-muted-foreground/50">
              {t('quickAccess.dragOrClick')}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-7 pt-4 pb-3 md:px-8 md:pt-5 md:pb-4 flex-shrink-0">
              <h3 className="text-base font-semibold text-foreground">
                {t('quickAccess.titleShort')}{files.length > 0 && <span className="text-muted-foreground/50 font-normal ml-1">({t('quickAccess.fileCount', { count: files.length })})</span>}
              </h3>
              <span className="text-xs text-muted-foreground/50">
                {t('quickAccess.dragOrClick')}
              </span>
            </div>
            <div
              className="flex-1 overflow-y-auto px-4 pb-1 md:px-5 md:pb-1 mb-3 md:mb-4 space-y-2"
            >
              {uploadingFiles.map((uf) => (
                <div
                  key={uf.id}
                  className="flex items-center px-3 py-2.5 bg-muted rounded-lg border border-foreground/[0.09]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex-shrink-0 mr-3">
                    <FileThumbnail source={null} fileName={uf.fileName} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-foreground truncate">
                      {uf.fileName}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(uf.fileSize)}
                      </span>
                      <div className="flex items-center gap-2">
                        {uf.completed ? (
                          <span className="text-xs text-muted-foreground">{t('upload.pleaseWait')}</span>
                        ) : (
                          <>
                            {uf.timeRemaining && <span className="text-xs text-muted-foreground">{uf.timeRemaining}</span>}
                            <span className="text-xs font-semibold text-primary">{uf.progress}%</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center h-4 mt-0.5">
                      <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-1000 ease-out rounded-full"
                          style={{ width: `${uf.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {!uf.completed && (
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => handleCancelUpload(uf.id)}
                        className="p-1.5 rounded-lg transition-colors text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:bg-foreground/10 active:text-muted-foreground active:bg-foreground/10"
                        title={t('common.cancel')}
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {files.map((file) => {
                const isShared = sharedInfo?.fileId === file.id;
                return (
                  <div key={file.id} className="space-y-1.5">
                    <div
                      className={cn(
                        "flex items-center px-3 py-2.5 rounded-lg border transition-colors cursor-pointer",
                        isShared
                          ? "bg-primary/5 border-primary/30"
                          : "bg-muted border-foreground/[0.09] can-hover:hover:bg-accent active:bg-accent"
                      )}
                      onClick={(e) => { e.stopPropagation(); handlePreviewClick(file); }}
                    >
                      <div className="flex-shrink-0 mr-3">
                        <FileThumbnail
                          source={previewUrls.get(file.id) || null}
                          fileName={file.file_name}
                          size="sm"
                        />
                      </div>
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-medium text-foreground truncate">
                          {file.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)} · {getRemainingTime(file.expires_at)}
                        </p>
                        <p className="text-xs text-muted-foreground/50 truncate mt-0.5">
                          {formatCompactDate(file.created_at)}
                          {file.uploaded_from && <> · {t('quickAccess.uploadedFrom', { device: file.uploaded_from })}</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleShare(file); }}
                          disabled={sharingFileId === file.id}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors disabled:opacity-50",
                            isShared
                              ? "text-primary"
                              : "text-muted-foreground/50 can-hover:hover:text-primary can-hover:hover:bg-primary/10 active:text-primary active:bg-primary/10"
                          )}
                          title={t('quickAccess.share')}
                        >
                          <ArrowUpTrayIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                          className="p-1.5 rounded-lg transition-colors text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:bg-foreground/10 active:text-muted-foreground active:bg-foreground/10"
                          title={t('common.download')}
                        >
                          <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                          className="p-1.5 rounded-lg transition-colors text-muted-foreground/50 can-hover:hover:text-red-600 dark:can-hover:hover:text-red-400 can-hover:hover:bg-red-100/50 dark:can-hover:hover:bg-red-500/15 active:text-red-600 dark:active:text-red-400 active:bg-red-100/50 dark:active:bg-red-500/15"
                          title={t('common.delete')}
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    {isShared && (
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="font-mono text-lg font-bold text-primary tracking-widest">
                          {sharedInfo.code.slice(0, 3)} {sharedInfo.code.slice(3)}
                        </span>
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          {sharedInfo.url}
                        </span>
                        <button
                          onClick={handleCopySharedLink}
                          className="p-1.5 rounded-lg transition-colors text-muted-foreground can-hover:hover:text-foreground can-hover:hover:bg-foreground/10 active:text-foreground active:bg-foreground/10 flex-shrink-0"
                        >
                          {copiedSharedLink ? (
                            <CheckIcon className="w-4 h-4 text-primary" />
                          ) : (
                            <ClipboardDocumentIcon className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setSharedInfo(null)}
                          className="p-1.5 rounded-lg transition-colors text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:bg-foreground/10 active:text-muted-foreground active:bg-foreground/10 flex-shrink-0"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
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
