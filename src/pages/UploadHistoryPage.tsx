import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, fileAPI } from '../services/api';
import { UploadHistoryItem, DownloadLog } from '../types';
import { toast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import FileThumbnail from '../components/FileThumbnail';
import { isPdfFile, isPptxFile, isVideoFile, formatDateTime } from '../utils/format';
import { useThumbnail } from '../hooks/useThumbnail';
import FilePreviewModal from '../components/FilePreviewModal';
import { useTranslation } from '../i18n';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Spinner } from '../components/ui/spinner';
import { Skeleton } from '../components/ui/skeleton';
import { Card, CardContent } from '../components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table';
import { Separator } from '../components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import HistoryTable from './history/HistoryTable';
import HistoryMobileCards from './history/HistoryMobileCards';
import HistoryPagination from './history/HistoryPagination';

const PRESIGNED_URL_MAX_AGE_MS = 50 * 60 * 1000; // 50 minutes

const PdfPreview: React.FC<{ source: string; fileName: string; width?: number }> = ({ source, fileName, width = 600 }) => {
  const { url, loading } = useThumbnail(source, fileName, width);
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <Spinner size="lg" />
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
      .filter(u => new Date(u.expires_at) >= new Date() && (u.file_type.startsWith('image/') || isPdfFile(u.file_name) || isVideoFile(u.file_name)))
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

  const handleDeleteAll = async () => {
    if (!window.confirm(t('history.confirmDeleteAll'))) {
      return;
    }

    try {
      await userAPI.deleteAllFiles();
      toast.success(t('history.deleteAllSuccess'));
      setUploads([]);
      setTotal(0);
      setExpandedRow(null);
      setDownloadLogs({});
      setPresignedUrls({});
      setFailedPreviews(new Set());
    } catch (error: any) {
      console.error('Failed to delete all files:', error);
      toast.error(t('history.deleteAllFailed'));
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

  const truncateFileName = (fileName: string, maxLength: number = 40) => {
    const normalized = fileName.normalize('NFC');
    if (normalized.length <= maxLength) return normalized;

    const lastDotIndex = normalized.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return normalized.substring(0, maxLength) + '...';
    }

    const extension = normalized.substring(lastDotIndex);
    const nameWithoutExt = normalized.substring(0, lastDotIndex);
    const maxNameLength = maxLength - extension.length - 3;

    if (nameWithoutExt.length <= maxNameLength) return normalized;

    return nameWithoutExt.substring(0, maxNameLength) + '...' + extension;
  };

  const handlePreviewError = useCallback((uploadId: string) => {
    setFailedPreviews(prev => new Set(prev).add(uploadId));
  }, []);

  const getThumbnailSource = (upload: UploadHistoryItem): string | null => {
    if (isExpired(upload.expires_at)) return null;
    if (isImageFileByType(upload.file_type) || isPdfFile(upload.file_name) || isVideoFile(upload.file_name)) {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-16 pb-20">
        <div className="mb-4">
          <Skeleton className="h-9 w-36" />
          <div className="flex items-center justify-between mt-1 min-h-9">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
        <div className="hidden md:block bg-card rounded-xl border-2 border-border overflow-hidden">
          <div className="bg-muted px-6 py-4 flex gap-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-6 py-3 border-t border-border">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="h-12 w-12 rounded" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <div className="flex gap-0.5">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="md:hidden space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border-2 border-border p-4 relative">
              <div className="absolute top-1/2 -translate-y-1/2 right-3 flex gap-1">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
              <div className="flex items-center gap-3 pr-20">
                <Skeleton className="h-12 w-12 rounded flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-16 pb-20">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-foreground">{t('history.pageTitle')}</h1>
        <div className="flex items-center justify-between mt-1">
          <p className="text-muted-foreground min-h-9 flex items-center">{t('history.validFileCount', { count: uploads.filter(u => !isExpired(u.expires_at)).length })}</p>
          {uploads.length > 0 && (
            <Button
              variant="ghost"
              onClick={handleDeleteAll}
              className="text-red-600 dark:text-red-400 can-hover:hover:bg-red-50 can-hover:hover:text-red-600 dark:can-hover:hover:bg-red-500/10 dark:can-hover:hover:text-red-400 active:bg-red-50 active:text-red-600 dark:active:bg-red-500/10 dark:active:text-red-400 -mr-3"
            >
              {t('history.deleteAll')}
            </Button>
          )}
        </div>
      </div>

      <HistoryTable
        uploads={uploads}
        expandedRow={expandedRow}
        closingRow={closingRow}
        downloadLogs={downloadLogs}
        loadingLogs={loadingLogs}
        presignedUrls={presignedUrls}
        failedPreviews={failedPreviews}
        tableScrollRef={tableScrollRef}
        showTableScrollHint={showTableScrollHint}
        language={language}
        handleRowClick={handleRowClick}
        handleShowQRCode={handleShowQRCode}
        handleDelete={handleDelete}
        handleViewAllLogs={handleViewAllLogs}
        openPreviewModal={openPreviewModal}
        handlePreviewError={handlePreviewError}
        getThumbnailSource={getThumbnailSource}
        truncateFileName={truncateFileName}
        isExpired={isExpired}
        isImageFileByType={isImageFileByType}
        PdfPreview={PdfPreview}
        t={t}
        onUploadClick={() => navigate('/upload')}
      />

      {uploads.length === 0 ? (
        <Card className="md:hidden rounded-xl border-2 border-border shadow-none">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">{t('history.noFiles')}</p>
            <Button
              onClick={() => navigate('/upload')}
              className="mt-4"
            >
              {t('history.shareFiles')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <HistoryMobileCards
            uploads={uploads}
            expandedRow={expandedRow}
            closingRow={closingRow}
            downloadLogs={downloadLogs}
            loadingLogs={loadingLogs}
            presignedUrls={presignedUrls}
            failedPreviews={failedPreviews}
            language={language}
            handleRowClick={handleRowClick}
            handleShowQRCode={handleShowQRCode}
            handleDelete={handleDelete}
            handleViewAllLogs={handleViewAllLogs}
            openPreviewModal={openPreviewModal}
            handlePreviewError={handlePreviewError}
            getThumbnailSource={getThumbnailSource}
            truncateFileName={truncateFileName}
            isExpired={isExpired}
            isImageFileByType={isImageFileByType}
            PdfPreview={PdfPreview}
            t={t}
          />

          <HistoryPagination
            totalPages={totalPages}
            currentPage={currentPage}
            offset={offset}
            limit={limit}
            total={total}
            handlePreviousPage={handlePreviousPage}
            handleNextPage={handleNextPage}
            t={t}
          />
        </>
      )}

      <Dialog open={showAllLogsModal && !!selectedFileForLogs} onOpenChange={setShowAllLogsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-6">
            <DialogTitle>{t('history.allDownloadHistory')}</DialogTitle>
          </DialogHeader>
          <Separator />
          <div className="relative flex-1 min-h-0 flex flex-col rounded-b-xl">
            <div ref={logsScrollRef} className="overflow-auto flex-1 min-h-0">
            {selectedFileForLogs && downloadLogs[selectedFileForLogs]?.length > 0 ? (
              <Table className="min-w-full">
                <TableHeader className="bg-muted sticky top-0">
                  <TableRow>
                    <TableHead className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap h-auto">
                      {t('history.receiver')}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap h-auto">
                      {t('downloadLogs.platform')}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap h-auto">
                      {t('downloadLogs.ipAddress')}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap h-auto">
                      {t('history.downloadTime')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-card">
                  {selectedFileForLogs && downloadLogs[selectedFileForLogs].map((log) => (
                    <TableRow key={log.id} className="can-hover:hover:bg-muted active:bg-muted">
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground text-center">
                        {log.downloader_name || t('common.anonymousUser')}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-center">
                        {log.device_platform}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-center">
                        {log.ip_address}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-center">
                        {formatDateTime(log.downloaded_at, language)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
          <div className="flex flex-col items-center mt-2">
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyLink}
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                  >
                    {copiedLink ? (
                      <CheckIcon className="w-5 h-5 text-green-600" />
                    ) : (
                      <ClipboardDocumentIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('history.copyLink')}</TooltipContent>
              </Tooltip>
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
