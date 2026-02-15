import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, fileAPI } from '../services/api';
import { UploadHistoryItem, DownloadLog } from '../types';
import { toast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import FileThumbnail from '../components/FileThumbnail';
import { isPdfFile, isPptxFile, formatFileSize, formatDateTime } from '../utils/format';
import { useThumbnail } from '../hooks/useThumbnail';
import FilePreviewModal from '../components/FilePreviewModal';
import { useTranslation } from '../i18n';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { cn } from 'lib/utils';

const PRESIGNED_URL_MAX_AGE_MS = 50 * 60 * 1000; // 50 minutes

const PdfPreview: React.FC<{ source: string; fileName: string; width?: number }> = ({ source, fileName, width = 600 }) => {
  const { url, loading } = useThumbnail(source, fileName, width);
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }
  if (url) {
    return <img src={url} alt={fileName} className="w-full h-full object-contain" />;
  }
  return (
    <div className="flex items-center justify-center h-full bg-muted">
      <FileThumbnail source={null} fileName={fileName} size="md" />
    </div>
  );
};

const UploadHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [uploads, setUploads] = useState<UploadHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [downloadLogs, setDownloadLogs] = useState<{ [key: string]: DownloadLog[] }>({});
  const [loadingLogs, setLoadingLogs] = useState<{ [key: string]: boolean }>({});
  const [showAllLogsModal, setShowAllLogsModal] = useState(false);
  const [selectedFileForLogs, setSelectedFileForLogs] = useState<string | null>(null);
  const [presignedUrls, setPresignedUrls] = useState<Record<string, string>>({});
  const [failedPreviews, setFailedPreviews] = useState<Set<string>>(new Set());
  const presignedUrlsFetchedAt = useRef<number>(0);
  const [closingRow, setClosingRow] = useState<string | null>(null);
  const [previewModalFile, setPreviewModalFile] = useState<{ fileName: string; fileSize: number; source: string; presignedUrl?: string } | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedShareCode, setSelectedShareCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [showTableScrollHint, setShowTableScrollHint] = useState(false);
  const { t, language } = useTranslation();
  const logsScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showAllLogsModal && selectedFileForLogs) {
      const timer = setTimeout(() => {
        const container = logsScrollRef.current;
        if (container && container.scrollWidth > container.clientWidth) {
          setShowScrollHint(true);

          const dismiss = () => setShowScrollHint(false);
          container.addEventListener('scroll', dismiss, { once: true, passive: true });
          container.addEventListener('touchstart', dismiss, { once: true, passive: true });
          return () => {
            container.removeEventListener('scroll', dismiss);
            container.removeEventListener('touchstart', dismiss);
          };
        }
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setShowScrollHint(false);
    }
  }, [showAllLogsModal, selectedFileForLogs]);

  useEffect(() => {
    if (loading || uploads.length === 0) return;
    const timer = setTimeout(() => {
      const container = tableScrollRef.current;
      if (container && container.scrollWidth > container.clientWidth) {
        setShowTableScrollHint(true);
        const dismiss = () => setShowTableScrollHint(false);
        container.addEventListener('scroll', dismiss, { once: true, passive: true });
        container.addEventListener('touchstart', dismiss, { once: true, passive: true });
        container.addEventListener('mousedown', dismiss, { once: true });
        return () => {
          container.removeEventListener('scroll', dismiss);
          container.removeEventListener('touchstart', dismiss);
          container.removeEventListener('mousedown', dismiss);
        };
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [loading, uploads]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }
    fetchUploads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    document.title = t('history.pageTitle');
    return () => {
      document.title = 'ShareAnything';
    };
  }, [t]);

  const fetchPresignedUrls = useCallback(async (items: UploadHistoryItem[]): Promise<Record<string, string>> => {
    const urls: Record<string, string> = {};
    const promises = items
      .filter(u => new Date(u.expires_at) >= new Date() && (u.file_type.startsWith('image/') || isPdfFile(u.file_name)))
      .map(async (upload) => {
        try {
          const result = await fileAPI.getDownloadUrl(upload.share_code, upload.id, undefined, true, true);
          urls[upload.id] = result.download_url;
        } catch {}
      });
    await Promise.all(promises);
    presignedUrlsFetchedAt.current = Date.now();
    return urls;
  }, []);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUploads(limit, offset);

      const urls = await fetchPresignedUrls(response.items);

      setPresignedUrls(urls);
      setFailedPreviews(new Set());
      setUploads(response.items);
      setTotal(response.total);
    } catch (error: any) {
      console.error('Failed to fetch uploads:', error);
      toast.error(t('history.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchDownloadLogs = async (fileId: string) => {
    if (downloadLogs[fileId]) {
      return;
    }

    try {
      setLoadingLogs({ ...loadingLogs, [fileId]: true });
      const logs = await userAPI.getDownloadLogs(fileId);
      setDownloadLogs({ ...downloadLogs, [fileId]: logs });
    } catch (error: any) {
      console.error('Failed to fetch download logs:', error);
      toast.error(t('history.downloadLogFetchError'));
    } finally {
      setLoadingLogs({ ...loadingLogs, [fileId]: false });
    }
  };

  const refreshPresignedUrlIfNeeded = useCallback(async (upload: UploadHistoryItem) => {
    if (isExpired(upload.expires_at)) return;
    if (!(upload.file_type.startsWith('image/') || isPdfFile(upload.file_name))) return;

    const isStale = Date.now() - presignedUrlsFetchedAt.current > PRESIGNED_URL_MAX_AGE_MS;
    const isMissing = !presignedUrls[upload.id];

    if (isStale || isMissing) {
      try {
        const result = await fileAPI.getDownloadUrl(upload.share_code, upload.id, undefined, true, true);
        setPresignedUrls(prev => ({ ...prev, [upload.id]: result.download_url }));
        setFailedPreviews(prev => {
          const next = new Set(prev);
          next.delete(upload.id);
          return next;
        });
        if (isStale && !isMissing) {
          presignedUrlsFetchedAt.current = Date.now();
        }
      } catch {}
    }
  }, [presignedUrls]);

  const handleRowClick = (fileId: string) => {
    if (expandedRow === fileId) {
      setExpandedRow(null);
      setClosingRow(fileId);
      setTimeout(() => {
        setClosingRow(null);
      }, 300);
    } else {
      setExpandedRow(fileId);
      fetchDownloadLogs(fileId);
      const upload = uploads.find(u => u.id === fileId);
      if (upload) {
        refreshPresignedUrlIfNeeded(upload);
      }
    }
  };

  const openPreviewModal = async (upload: UploadHistoryItem) => {
    if (isExpired(upload.expires_at)) return;
    let url = presignedUrls[upload.id];
    const isStale = Date.now() - presignedUrlsFetchedAt.current > PRESIGNED_URL_MAX_AGE_MS;
    if (!url || isStale) {
      try {
        const result = await fileAPI.getDownloadUrl(upload.share_code, upload.id, undefined, true, true);
        url = result.download_url;
        setPresignedUrls(prev => ({ ...prev, [upload.id]: url! }));
      } catch {
        if (!url) return;
      }
    }
    setPreviewModalFile({
      fileName: upload.file_name,
      fileSize: upload.file_size,
      source: url,
      presignedUrl: isPptxFile(upload.file_name) ? url : undefined
    });
  };

  const handleDelete = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('history.confirmDelete'))) {
      return;
    }

    try {
      await userAPI.deleteFile(fileId);
      toast.success(t('history.deleteSuccess'));
      setUploads(uploads.filter(upload => upload.id !== fileId));
      setTotal(total - 1);
      if (expandedRow === fileId) {
        setExpandedRow(null);
      }
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      toast.error(t('history.deleteFailed'));
    }
  };

  const handleViewAllLogs = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFileForLogs(fileId);
    setShowAllLogsModal(true);
  };

  const handleShowQRCode = (shareCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedShareCode(shareCode);
    setShowQRModal(true);
    setCopiedLink(false);
  };

  const handleCopyLink = async () => {
    if (!selectedShareCode) return;

    const url = `${window.location.origin}/download/${selectedShareCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const isImageFileByType = (fileType: string) => {
    return fileType.startsWith('image/');
  };

  const truncateFileName = (fileName: string, maxLength: number = 50) => {
    if (fileName.length <= maxLength) return fileName;

    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return fileName.substring(0, maxLength) + '...';
    }

    const extension = fileName.substring(lastDotIndex);
    const nameWithoutExt = fileName.substring(0, lastDotIndex);
    const maxNameLength = maxLength - extension.length - 3;

    if (nameWithoutExt.length <= maxNameLength) return fileName;

    return nameWithoutExt.substring(0, maxNameLength) + '...' + extension;
  };

  const handlePreviewError = useCallback((uploadId: string) => {
    setFailedPreviews(prev => new Set(prev).add(uploadId));
  }, []);

  const getThumbnailSource = (upload: UploadHistoryItem): string | null => {
    if (isExpired(upload.expires_at)) return null;
    if (isImageFileByType(upload.file_type) || isPdfFile(upload.file_name)) {
      return presignedUrls[upload.id] || null;
    }
    return null;
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handlePreviousPage = () => {
    if (offset > 0) {
      setOffset(offset - limit);
    }
  };

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <div className="text-muted-foreground">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-16 pb-32">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t('history.pageTitle')}</h1>
        <p className="text-muted-foreground mt-2">{t('history.validFileCount', { count: uploads.filter(u => !isExpired(u.expires_at)).length })}</p>
      </div>

      {uploads.length === 0 ? (
        <div className="bg-card rounded-lg shadow p-12 text-center dark:shadow-none dark:border dark:border-border">
          <p className="text-muted-foreground">{t('history.noFiles')}</p>
          <Button
            onClick={() => navigate('/upload')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            {t('history.shareFiles')}
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-card rounded-xl border-2 border-border overflow-hidden relative">
            <div ref={tableScrollRef} className="overflow-x-auto">
              <table className="w-full min-w-[1200px] divide-y divide-border table-fixed">
                <colgroup>
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '11%' }} />
                </colgroup>
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap align-middle">
                      {t('history.fileName')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap align-middle">
                      {t('history.size')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap align-middle">
                      {t('history.uploadDate')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap align-middle">
                      {t('history.expirationDate')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap align-middle">
                      {t('history.downloads')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap align-middle">
                      {t('history.status')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap align-middle">
                      {t('history.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {uploads.map((upload) => (
                    <React.Fragment key={upload.id}>
                      <tr
                        onClick={() => handleRowClick(upload.id)}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-muted',
                          expandedRow === upload.id ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-card'
                        )}
                      >
                        <td className="px-6 py-4 max-w-0">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <FileThumbnail source={getThumbnailSource(upload)} fileName={upload.file_name} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-foreground" title={upload.file_name}>
                                {truncateFileName(upload.file_name)}
                              </div>
                              {upload.description && (
                                <div className="text-sm text-muted-foreground truncate">
                                  {upload.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-center">
                          {formatFileSize(upload.file_size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-center">
                          {formatDateTime(upload.created_at, language)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-center">
                          {formatDateTime(upload.expires_at, language)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-center">
                          {t('common.countUnit', { count: upload.download_count })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isExpired(upload.expires_at) ? (
                            <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400">
                              {t('history.expired')}
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400">
                              {t('history.active')}
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-center gap-0.5">
                            {!isExpired(upload.expires_at) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleShowQRCode(upload.share_code, e)}
                                className="text-muted-foreground"
                                title={t('history.qrCode')}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                                </svg>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDelete(upload.id, e)}
                              className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                              title={t('common.delete')}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {(expandedRow === upload.id || closingRow === upload.id) && (
                        <tr>
                          <td colSpan={7} className="px-6 bg-background">
                            <div className={cn('py-6', closingRow === upload.id ? 'animate-collapse-up' : 'animate-expand-down')}>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="h-0 min-h-full flex flex-col overflow-hidden">
                                  <h3 className="text-lg font-semibold text-foreground mb-4 flex-shrink-0">{t('history.preview')}</h3>
                                  <div
                                    className="bg-card rounded-lg border border-border overflow-hidden w-full flex-1 max-w-md cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); openPreviewModal(upload); }}
                                  >
                                    {isExpired(upload.expires_at) ? (
                                      <div className="flex items-center justify-center h-full bg-muted">
                                        <p className="text-sm text-muted-foreground text-center px-4">{t('history.expiredFile')}</p>
                                      </div>
                                    ) : isImageFileByType(upload.file_type) ? (
                                      presignedUrls[upload.id] && !failedPreviews.has(upload.id) ? (
                                        <img
                                          src={presignedUrls[upload.id]}
                                          alt={upload.file_name}
                                          className="w-full h-full object-contain"
                                          onError={() => handlePreviewError(upload.id)}
                                        />
                                      ) : (
                                        <div className="flex flex-col items-center justify-center h-full bg-muted p-4 gap-4">
                                          <FileThumbnail source={null} fileName={upload.file_name} size="md" />
                                          <p className="text-sm text-muted-foreground text-center">{t('history.clickToPreview')}</p>
                                        </div>
                                      )
                                    ) : isPdfFile(upload.file_name) ? (
                                      presignedUrls[upload.id] && !failedPreviews.has(upload.id) ? (
                                        <PdfPreview source={presignedUrls[upload.id]} fileName={upload.file_name} />
                                      ) : (
                                        <div className="flex flex-col items-center justify-center h-full bg-muted p-4 gap-4">
                                          <FileThumbnail source={null} fileName={upload.file_name} size="md" />
                                          <p className="text-sm text-muted-foreground text-center">{t('history.clickToPreview')}</p>
                                        </div>
                                      )
                                    ) : (
                                      <div className="flex flex-col items-center justify-center h-full bg-muted p-4 gap-4">
                                        <FileThumbnail source={null} fileName={upload.file_name} size="md" />
                                        <p className="text-sm text-muted-foreground text-center">{t('history.clickToPreview')}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="col-span-2 grid grid-cols-2 gap-4">
                                  <div className="flex flex-col">
                                    <h3 className="text-lg font-semibold text-foreground mb-4">{t('history.detailInfo')}</h3>
                                    <div className="bg-card rounded-lg border border-border p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                                      <div className="col-span-2">
                                        <span className="text-sm font-medium text-muted-foreground">{t('history.fileNameLabel')}</span>
                                        <p className="text-sm text-foreground break-all">{upload.file_name}</p>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="text-sm font-medium text-muted-foreground">{t('history.descriptionLabel')}</span>
                                        <p className="text-sm text-foreground break-words whitespace-pre-wrap">{upload.description || t('common.none')}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-muted-foreground">{t('history.fileTypeLabel')}</span>
                                        <p className="text-sm text-foreground">{upload.file_type}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-muted-foreground">{t('history.fileSizeLabel')}</span>
                                        <p className="text-sm text-foreground">{formatFileSize(upload.file_size)}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-muted-foreground">{t('history.shareCodeLabel')}</span>
                                        <p className="text-sm text-foreground font-mono">{upload.share_code}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-muted-foreground">{t('history.passwordLabel')}</span>
                                        <p className="text-sm text-foreground">{upload.has_password ? t('common.exists') : t('common.none')}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-muted-foreground">{t('history.oneTimeShareLabel')}</span>
                                        <p className="text-sm text-foreground">{upload.is_one_time ? t('common.yes') : t('common.no')}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-muted-foreground">{t('history.downloadCountLabel')}</span>
                                        <p className="text-sm text-foreground">{t('common.countUnit', { count: upload.download_count })}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-muted-foreground">{t('history.uploadDateLabel')}</span>
                                        <p className="text-sm text-foreground">{formatDateTime(upload.created_at, language)}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-muted-foreground">{t('history.expirationDateLabel')}</span>
                                        <p className="text-sm text-foreground">{formatDateTime(upload.expires_at, language)}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="h-0 min-h-full flex flex-col overflow-hidden">
                                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                      <h3 className="text-lg font-semibold text-foreground">{t('history.downloadHistory')}</h3>
                                      {downloadLogs[upload.id]?.length > 3 && (
                                        <Button
                                          variant="ghost"
                                          onClick={(e) => handleViewAllLogs(upload.id, e)}
                                          className="px-3 py-1.5 text-sm text-muted-foreground font-medium"
                                        >
                                          {t('history.viewAll')}
                                        </Button>
                                      )}
                                    </div>
                                    <div className="bg-card rounded-lg border border-border p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                                      {loadingLogs[upload.id] ? (
                                        <div className="text-sm text-muted-foreground text-center py-4 flex-1 flex items-center justify-center">{t('common.loading')}</div>
                                      ) : downloadLogs[upload.id]?.length > 0 ? (
                                        <div className="space-y-4 overflow-y-auto pr-2 flex-1">
                                          {downloadLogs[upload.id].map((log) => (
                                            <div
                                              key={log.id}
                                              className="text-sm border-b border-border pb-4 last:border-0 last:pb-0"
                                            >
                                              <div className="flex justify-between items-start gap-4">
                                                <div className="min-w-0 flex-1">
                                                  <p className="font-medium text-foreground">
                                                    {log.downloader_name || t('common.anonymousUser')}
                                                  </p>
                                                  <p className="text-muted-foreground text-xs mt-2">
                                                    {log.device_platform}
                                                  </p>
                                                  <p className="text-muted-foreground text-xs">
                                                    {log.ip_address}
                                                  </p>
                                                </div>
                                                <p className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                                                  {formatDateTime(log.downloaded_at, language)}
                                                </p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-muted-foreground text-center py-4 flex-1 flex items-center justify-center">
                                          {t('history.noDownloadLogs')}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {showTableScrollHint && (
              <div className="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none z-10 rounded-xl">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-8 rounded-full bg-white/30 relative overflow-hidden">
                    <div className="w-6 h-6 rounded-full bg-white absolute top-1 animate-scroll-hint" />
                  </div>
                  <span className="text-white text-sm font-medium">{t('common.scrollHorizontally')}</span>
                </div>
              </div>
            )}
          </div>

          <div className="md:hidden space-y-2">
            {uploads.map((upload) => (
              <div key={upload.id} className="bg-card rounded-xl border-2 border-border overflow-hidden">
                <div className="relative">
                  <div className="absolute top-1/2 -translate-y-1/2 right-3 flex gap-1 z-10">
                    {!isExpired(upload.expires_at) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleShowQRCode(upload.share_code, e)}
                        className="text-muted-foreground"
                        title={t('history.qrCode')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                        </svg>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(upload.id, e)}
                      className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                      title={t('common.delete')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </Button>
                  </div>

                  <div
                    onClick={() => handleRowClick(upload.id)}
                    className={cn('p-4 cursor-pointer', expandedRow === upload.id && 'bg-blue-50 dark:bg-blue-500/10')}
                  >
                    <div className="flex items-center space-x-3 pr-20">
                    <FileThumbnail source={getThumbnailSource(upload)} fileName={upload.file_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground" title={upload.file_name}>
                        {truncateFileName(upload.file_name, 25)}
                      </h3>
                      <div className="mt-1 flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(upload.file_size)}</span>
                        <span>•</span>
                        <span>{t('common.countUnit', { count: upload.download_count })}</span>
                        <span>•</span>
                        {isExpired(upload.expires_at) ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">{t('history.expired')}</span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400 font-medium">{t('history.active')}</span>
                        )}
                      </div>
                      {upload.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 overflow-hidden text-ellipsis">
                          {upload.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

                {(expandedRow === upload.id || closingRow === upload.id) && (
                  <div className={cn('border-t border-border p-4 bg-background', closingRow === upload.id ? 'animate-collapse-up' : 'animate-expand-down')}>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">{t('history.preview')}</h4>
                        <div
                          className={cn(
                            'bg-card rounded-lg border border-border overflow-hidden cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors',
                            isExpired(upload.expires_at) ? 'h-28' :
                            isImageFileByType(upload.file_type) ? 'aspect-square' : 'h-32'
                          )}
                          onClick={() => openPreviewModal(upload)}
                        >
                          {isExpired(upload.expires_at) ? (
                            <div className="flex items-center justify-center h-full bg-muted">
                              <p className="text-xs text-muted-foreground text-center px-4">{t('history.expiredFile')}</p>
                            </div>
                          ) : isImageFileByType(upload.file_type) ? (
                            presignedUrls[upload.id] && !failedPreviews.has(upload.id) ? (
                              <img
                                src={presignedUrls[upload.id]}
                                alt={upload.file_name}
                                className="w-full h-full object-contain"
                                onError={() => handlePreviewError(upload.id)}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full bg-muted p-4 gap-4">
                                <FileThumbnail source={null} fileName={upload.file_name} size="md" />
                                <p className="text-xs text-muted-foreground text-center">{t('history.clickToPreview')}</p>
                              </div>
                            )
                          ) : isPdfFile(upload.file_name) ? (
                            presignedUrls[upload.id] && !failedPreviews.has(upload.id) ? (
                              <PdfPreview source={presignedUrls[upload.id]} fileName={upload.file_name} />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full bg-muted p-4 gap-4">
                                <FileThumbnail source={null} fileName={upload.file_name} size="md" />
                                <p className="text-xs text-muted-foreground text-center">{t('history.clickToPreview')}</p>
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full bg-muted p-4 gap-4">
                              <FileThumbnail source={null} fileName={upload.file_name} size="md" />
                              <p className="text-xs text-muted-foreground text-center">{t('history.clickToPreview')}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">{t('history.detailInfo')}</h4>
                        <div className="bg-card rounded-lg border border-border p-3 space-y-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">{t('history.fileTypeLabel')}:</span>
                            <span className="ml-2 text-foreground">{upload.file_type}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('history.shareCodeLabel')}:</span>
                            <span className="ml-2 text-foreground font-mono">{upload.share_code}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('history.passwordLabel')}:</span>
                            <span className="ml-2 text-foreground">{upload.has_password ? t('common.exists') : t('common.none')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('history.oneTimeShareLabel')}:</span>
                            <span className="ml-2 text-foreground">{upload.is_one_time ? t('common.yes') : t('common.no')}</span>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-1">{t('history.descriptionLabel')}:</div>
                            <div className="text-foreground break-words whitespace-pre-wrap">{upload.description || t('common.none')}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('history.uploadDateLabel')}:</span>
                            <span className="ml-2 text-foreground">{formatDateTime(upload.created_at, language)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('history.expirationDateLabel')}:</span>
                            <span className="ml-2 text-foreground">{formatDateTime(upload.expires_at, language)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-foreground">{t('history.downloadHistory')}</h4>
                          {downloadLogs[upload.id]?.length > 2 && (
                            <Button
                              variant="ghost"
                              onClick={(e) => handleViewAllLogs(upload.id, e)}
                              className="px-2 py-1 text-xs text-muted-foreground"
                            >
                              {t('history.viewAll')}
                            </Button>
                          )}
                        </div>
                        <div className="bg-card rounded-lg border border-border p-4">
                          {loadingLogs[upload.id] ? (
                            <div className="h-20 flex items-center justify-center text-xs text-muted-foreground text-center">{t('common.loading')}</div>
                          ) : downloadLogs[upload.id]?.length > 0 ? (
                            <div className="space-y-4 overflow-y-auto pr-1" style={{
                              maxHeight: downloadLogs[upload.id].length <= 2 ? 'none' : '240px'
                            }}>
                              {downloadLogs[upload.id].map((log) => (
                                <div key={log.id} className="text-xs border-b border-border pb-4 last:border-0 last:pb-0">
                                  <p className="font-medium text-foreground">{log.downloader_name || t('common.anonymousUser')}</p>
                                  <p className="text-muted-foreground mt-2">
                                    {log.device_platform} • {log.ip_address}
                                  </p>
                                  <p className="text-muted-foreground mt-2">{formatDateTime(log.downloaded_at, language)}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-20 flex items-center justify-center text-xs text-muted-foreground text-center">
                              {t('history.noDownloadLogs')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-card sm:px-6 mt-4 rounded-lg border-2 border-border">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button
                  variant="outline"
                  onClick={handlePreviousPage}
                  disabled={offset === 0}
                >
                  {t('history.previous')}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNextPage}
                  disabled={offset + limit >= total}
                  className="ml-3"
                >
                  {t('history.next')}
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-foreground">
                    {t('history.pagination', { from: offset + 1, to: Math.min(offset + limit, total), total })}
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <Button
                      variant="outline"
                      onClick={handlePreviousPage}
                      disabled={offset === 0}
                      className="rounded-r-none"
                    >
                      <span className="sr-only">{t('history.previous')}</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </Button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-input bg-background text-sm font-medium text-foreground">
                      {t('history.pageOf', { current: currentPage, total: totalPages })}
                    </span>
                    <Button
                      variant="outline"
                      onClick={handleNextPage}
                      disabled={offset + limit >= total}
                      className="rounded-l-none"
                    >
                      <span className="sr-only">{t('history.next')}</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={showAllLogsModal && !!selectedFileForLogs} onOpenChange={setShowAllLogsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-6 border-b border-border">
            <DialogTitle>{t('history.allDownloadHistory')}</DialogTitle>
          </DialogHeader>
          <div className="relative flex-1 min-h-0 flex flex-col rounded-b-xl">
            <div ref={logsScrollRef} className="overflow-auto flex-1 min-h-0">
            {selectedFileForLogs && downloadLogs[selectedFileForLogs]?.length > 0 ? (
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {t('history.receiver')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {t('downloadLogs.platform')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {t('downloadLogs.ipAddress')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {t('history.downloadTime')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {selectedFileForLogs && downloadLogs[selectedFileForLogs].map((log) => (
                    <tr key={log.id} className="sm:hover:bg-muted">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground text-center">
                        {log.downloader_name || t('common.anonymousUser')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-center">
                        {log.device_platform}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-center">
                        {log.ip_address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-center">
                        {formatDateTime(log.downloaded_at, language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                {t('history.noDownloadLogs')}
              </div>
            )}
            </div>

            {showScrollHint && (
              <div
                className="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none z-10"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-8 rounded-full bg-white/30 relative overflow-hidden">
                    <div className="w-6 h-6 rounded-full bg-white absolute top-1 animate-scroll-hint" />
                  </div>
                  <span className="text-white text-sm font-medium">{t('common.scrollHorizontally')}</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showQRModal && !!selectedShareCode} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-lg rounded-xl p-6">
          <DialogHeader>
            <DialogTitle>{t('history.qrCode')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center">
            <div className="flex justify-center p-2 bg-white">
              <QRCodeSVG
                value={selectedShareCode ? `${window.location.origin}/download/${selectedShareCode}` : ''}
                size={256}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center mt-3">
              {t('history.scanQR')}
            </p>
          </div>
          <div className="mt-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('history.shareLink')}
            </label>
            <div className="relative">
              <Input
                type="text"
                value={selectedShareCode ? `${window.location.origin}/download/${selectedShareCode}` : ''}
                readOnly
                className="w-full pr-12"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyLink}
                className="absolute right-1 top-1/2 -translate-y-1/2"
                title={t('history.copyLink')}
              >
                {copiedLink ? (
                  <CheckIcon className="w-5 h-5 text-green-600" />
                ) : (
                  <ClipboardDocumentIcon className="w-5 h-5 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {previewModalFile && (
        <FilePreviewModal
          file={previewModalFile}
          onClose={() => setPreviewModalFile(null)}
        />
      )}

      <style>{`
        @keyframes expandDown {
          from {
            max-height: 0;
            overflow: hidden;
          }
          to {
            max-height: 2000px;
          }
        }

        @keyframes collapseUp {
          from {
            max-height: 2000px;
          }
          to {
            max-height: 0;
            overflow: hidden;
          }
        }

        .animate-expand-down {
          animation: expandDown 0.3s ease-out forwards;
        }

        .animate-collapse-up {
          animation: collapseUp 0.3s ease-in forwards;
        }

        @keyframes scrollHint {
          0%, 100% { left: 2px; }
          50% { left: calc(100% - 26px); }
        }

        .animate-scroll-hint {
          animation: scrollHint 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default UploadHistoryPage;
