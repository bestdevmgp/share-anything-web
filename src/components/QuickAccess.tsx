import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import { quickAccessAPI } from '../services/api';
import { QuickAccessFile } from '../types';
import { formatFileSize, copyToClipboard } from '../utils/format';
import { PlusIcon, TrashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import UploadProgressRow from './UploadProgressRow';
import { toast } from '../context/ToastContext';
import { useTranslation } from '../i18n';
import { useNavigate } from 'react-router-dom';
import FileThumbnail from './FileThumbnail';
import FilePreviewModal from './FilePreviewModal';
import TruncatedFilename from './TruncatedFilename';
import CopyButton from './CopyButton';
import { Hint } from './ui/Hint';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Popover, PopoverContent, PopoverAnchor } from './ui/popover';
import { cn } from 'lib/utils';
import { useQuickAccessUpload } from '../context/QuickAccessUploadContext';
import { pushSession } from '../utils/recentSessions';

interface PreviewModalFile {
  fileName: string;
  fileSize: number;
  source: string;
  presignedUrl?: string;
}

// Public share grants expire 30 min after creation on the backend.
const SHARE_GRANT_TTL_MS = 30 * 60 * 1000;

const QuickAccess: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { uploadingFiles, isUploading, handleUpload, handleCancelUpload, completedCounter } = useQuickAccessUpload();

  const [files, setFiles] = useState<QuickAccessFile[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Set<string>>(new Set());
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

  const handleDelete = (fileId: string) => {
    setPendingDelete(prev => new Set(prev).add(fileId));

    const restore = () =>
      setPendingDelete(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });

    const commit = async () => {
      try {
        await quickAccessAPI.deleteFile(fileId);
      } catch {
        toast.error(tRef.current('quickAccess.deleteFailed'));
        restore();
        return;
      }
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setPreviewUrls(prev => {
        const next = new Map(prev);
        next.delete(fileId);
        return next;
      });
      restore();
    };

    toast.action(tRef.current('common.deleted'), {
      actionLabel: tRef.current('common.undo'),
      duration: 5000,
      onAction: restore,
      onAutoClose: commit,
    });
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
  const [sharedCode, setSharedCode] = useState<{ fileId: string; code: string; url: string } | null>(null);

  const handleShare = async (file: QuickAccessFile) => {
    try {
      setSharingFileId(file.id);
      const response = await quickAccessAPI.shareFile(file.id);
      const shareUrl = `${window.location.origin}/download/${response.share_code}`;
      await copyToClipboard(shareUrl);
      setSharedCode({ fileId: file.id, code: response.share_code, url: shareUrl });
      pushSession({
        code: response.share_code,
        fileNames: [file.file_name],
        totalSize: file.file_size,
        expiresAt: new Date(Date.now() + SHARE_GRANT_TTL_MS).toISOString(),
        createdAt: new Date().toISOString(),
      });
      window.dispatchEvent(new Event('recent-shares:refresh'));
      toast.success(t('quickAccess.shareSuccess'));
    } catch {
      toast.error(t('quickAccess.shareFailed'));
    } finally {
      setSharingFileId(null);
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

  const visibleFiles = files.filter(f => !pendingDelete.has(f.id));
  const hasContent = visibleFiles.length > 0 || uploadingFiles.length > 0;

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
                {t('quickAccess.titleShort')}{visibleFiles.length > 0 && <span className="text-muted-foreground/50 font-normal ml-1">({t('quickAccess.fileCount', { count: visibleFiles.length })})</span>}
              </h3>
              <span className="text-xs text-muted-foreground/50">
                {t('quickAccess.dragOrClick')}
              </span>
            </div>
            <div
              className="flex-1 overflow-y-auto px-4 pb-1 md:px-5 md:pb-1 mb-3 md:mb-4 space-y-2"
            >
              {uploadingFiles.map((uf) => (
                <UploadProgressRow
                  key={uf.id}
                  fileName={uf.fileName}
                  fileSize={uf.fileSize}
                  progress={uf.progress}
                  timeRemaining={uf.timeRemaining}
                  statusText={uf.completed ? t('upload.pleaseWait') : undefined}
                  onCancel={() => handleCancelUpload(uf.id)}
                  cancelDisabled={uf.completed}
                />
              ))}
              {visibleFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center px-3 py-2.5 bg-muted rounded-lg border border-foreground/[0.09] can-hover:hover:bg-accent active:bg-accent transition-colors cursor-pointer"
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
                    <TruncatedFilename name={file.file_name} className="text-sm font-medium text-foreground" />
                    <p className="text-xs text-muted-foreground truncate">
                      {formatFileSize(file.file_size)} · {getRemainingTime(file.expires_at)}
                    </p>
                    <p className="text-xs text-muted-foreground/50 truncate mt-0.5">
                      {formatCompactDate(file.created_at)}
                      {file.uploaded_from && <> · {t('quickAccess.uploadedFrom', { device: file.uploaded_from })}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Popover
                      open={sharedCode?.fileId === file.id}
                      onOpenChange={(open) => { if (!open) setSharedCode(null); }}
                    >
                      <PopoverAnchor className="inline-flex">
                        <Hint label={t('quickAccess.share')}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleShare(file); }}
                            disabled={sharingFileId === file.id}
                            className="p-1.5 rounded-lg transition-colors text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:bg-foreground/10 active:text-muted-foreground active:bg-foreground/10 disabled:opacity-50"
                            aria-label={t('quickAccess.share')}
                          >
                            <ArrowUpTrayIcon className="w-5 h-5" />
                          </button>
                        </Hint>
                      </PopoverAnchor>
                      <PopoverContent
                        side="left"
                        align="center"
                        sideOffset={10}
                        className="w-auto p-0 border-none bg-transparent shadow-none overflow-visible"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="relative inline-flex items-center">
                          <span
                            className="inline-flex items-center rounded-[10px] pl-3 pr-1.5 py-[7px]"
                            style={{
                              background: 'var(--share-bubble-bg)',
                              backdropFilter: 'blur(20px) saturate(180%)',
                              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                              boxShadow: 'var(--share-bubble-shadow)',
                              border: '1px solid var(--share-bubble-border)',
                            }}
                          >
                            <span className="flex items-center gap-1">
                              <span className="text-[1.125rem] font-bold text-foreground tracking-[0.06em] leading-none">
                                {sharedCode?.code.slice(0, 3)}<span className="inline-block w-1" />{sharedCode?.code.slice(3)}
                              </span>
                              <CopyButton
                                key={sharedCode?.code}
                                value={sharedCode?.url ?? ''}
                                defaultCopied
                                stopPropagation
                                onCopied={() => toast.success(t('quickAccess.shareSuccess'))}
                                className="p-1.5 can-hover:hover:bg-foreground/10 active:bg-foreground/10"
                                iconClassName="w-4 h-4"
                                iconCopiedClass="text-green-600 dark:text-green-400"
                              />
                          </span>
                        </span>
                          <span
                            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{
                              right: '-6px',
                              width: '7px',
                              height: '12px',
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'var(--share-bubble-bg)',
                                backdropFilter: 'blur(20px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                                clipPath: 'polygon(0% 0%, 100% 50%, 0% 100%)',
                              }}
                            />
                            <svg
                              width="7"
                              height="12"
                              viewBox="0 0 7 12"
                              style={{
                                position: 'absolute',
                                inset: 0,
                                overflow: 'visible',
                              }}
                            >
                              <polyline
                                points="1,0 7,6 1,12"
                                fill="none"
                                stroke="var(--share-bubble-border)"
                                strokeWidth="1.5"
                                strokeLinejoin="miter"
                                vectorEffect="non-scaling-stroke"
                              />
                            </svg>
                          </span>
                        </span>
                      </PopoverContent>
                    </Popover>
                    <Hint label={t('common.download')}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                        className="p-1.5 rounded-lg transition-colors text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:bg-foreground/10 active:text-muted-foreground active:bg-foreground/10"
                        aria-label={t('common.download')}
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                      </button>
                    </Hint>
                    <Hint label={t('common.delete')}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                        className="p-1.5 rounded-lg transition-colors text-muted-foreground/50 can-hover:hover:text-red-600 dark:can-hover:hover:text-red-400 can-hover:hover:bg-red-100/50 dark:can-hover:hover:bg-red-500/15 active:text-red-600 dark:active:text-red-400 active:bg-red-100/50 dark:active:bg-red-500/15"
                        aria-label={t('common.delete')}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </Hint>
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
