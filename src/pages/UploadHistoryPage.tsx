import React, { useEffect, useRef, useState } from 'react';
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

const PdfPreview: React.FC<{ source: string; fileName: string; width?: number }> = ({ source, fileName, width = 600 }) => {
  const { url, loading } = useThumbnail(source, fileName, width);
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-white/5">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (url) {
    return <img src={url} alt={fileName} className="w-full h-full object-contain" />;
  }
  return (
    <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-white/5">
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
  const [closingRow, setClosingRow] = useState<string | null>(null);
  const [previewModalFile, setPreviewModalFile] = useState<{ fileName: string; fileSize: number; source: string; presignedUrl?: string } | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedShareCode, setSelectedShareCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const { t, language } = useTranslation();
  const logsScrollRef = useRef<HTMLDivElement>(null);

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
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchUploads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (showAllLogsModal || showQRModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAllLogsModal, showQRModal]);

  useEffect(() => {
    document.title = t('history.pageTitle');
    return () => {
      document.title = 'ShareAnything';
    };
  }, [t]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showQRModal) {
        setShowQRModal(false);
      }
    };

    if (showQRModal) {
      window.addEventListener('keydown', handleEscKey);
    }

    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showQRModal]);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUploads(limit, offset);

      const urls: Record<string, string> = {};
      const promises = response.items
        .filter(u => new Date(u.expires_at) >= new Date() && (u.file_type.startsWith('image/') || isPdfFile(u.file_name)))
        .map(async (upload) => {
          try {
            const result = await fileAPI.getDownloadUrl(upload.share_code, upload.id, undefined, true, true);
            urls[upload.id] = result.download_url;
          } catch {}
        });
      await Promise.all(promises);

      setPresignedUrls(urls);
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
    }
  };

  const openPreviewModal = async (upload: UploadHistoryItem) => {
    if (isExpired(upload.expires_at)) return;
    let url = presignedUrls[upload.id];
    if (!url) {
      try {
        const result = await fileAPI.getDownloadUrl(upload.share_code, upload.id, undefined, true, true);
        url = result.download_url;
      } catch {
        return;
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#010001]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-gray-500 dark:text-[#888888]">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-16 pb-32">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-[#EDEDED]">{t('history.pageTitle')}</h1>
        <p className="text-gray-600 dark:text-[#888888] mt-2">{t('history.validFileCount', { count: uploads.filter(u => !isExpired(u.expires_at)).length })}</p>
      </div>

      {uploads.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center dark:bg-[#0B0A0B] dark:shadow-none dark:border dark:border-white/10">
          <p className="text-gray-500 dark:text-[#888888]">{t('history.noFiles')}</p>
          <button
            onClick={() => navigate('/upload')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            {t('history.shareFiles')}
          </button>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl border-[3px] border-gray-100 dark:bg-[#0B0A0B] dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] divide-y divide-gray-200 dark:divide-white/10 table-fixed">
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-[#888888] uppercase tracking-wider whitespace-nowrap align-middle">
                      {t('history.fileName')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-[#888888] uppercase tracking-wider whitespace-nowrap align-middle">
                      {t('history.size')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-[#888888] uppercase tracking-wider whitespace-nowrap align-middle">
                      {t('history.uploadDate')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-[#888888] uppercase tracking-wider whitespace-nowrap align-middle">
                      {t('history.expirationDate')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-[#888888] uppercase tracking-wider whitespace-nowrap align-middle">
                      {t('history.downloads')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-[#888888] uppercase tracking-wider whitespace-nowrap align-middle">
                      {t('history.status')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-[#888888] uppercase tracking-wider whitespace-nowrap align-middle">
                      {t('history.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-[#0B0A0B] dark:divide-white/10">
                  {uploads.map((upload) => (
                    <React.Fragment key={upload.id}>
                      <tr
                        onClick={() => handleRowClick(upload.id)}
                        className={`cursor-pointer transition-colors bg-white hover:bg-gray-50 dark:bg-[#0B0A0B] dark:hover:bg-white/5 ${expandedRow === upload.id ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
                      >
                        <td className="px-6 py-4 max-w-0">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <FileThumbnail source={getThumbnailSource(upload)} fileName={upload.file_name} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-[#EDEDED]" title={upload.file_name}>
                                {truncateFileName(upload.file_name)}
                              </div>
                              {upload.description && (
                                <div className="text-sm text-gray-500 dark:text-[#888888] truncate">
                                  {upload.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-[#888888] text-center">
                          {formatFileSize(upload.file_size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-[#888888] text-center">
                          {formatDateTime(upload.created_at, language)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-[#888888] text-center">
                          {formatDateTime(upload.expires_at, language)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-[#EDEDED] text-center">
                          {t('common.countUnit', { count: upload.download_count })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isExpired(upload.expires_at) ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400">
                              {t('history.expired')}
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400">
                              {t('history.active')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-end gap-0.5">
                            {!isExpired(upload.expires_at) && (
                              <button
                                onClick={(e) => handleShowQRCode(upload.share_code, e)}
                                className="p-2 text-gray-700 hover:bg-gray-200 dark:text-[#888888] dark:hover:bg-white/10 rounded transition-colors"
                                title={t('history.qrCode')}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDelete(upload.id, e)}
                              className="p-2 text-gray-700 hover:text-red-600 hover:bg-gray-200 dark:text-[#888888] dark:hover:text-red-400 dark:hover:bg-white/10 rounded transition-colors"
                              title={t('common.delete')}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {(expandedRow === upload.id || closingRow === upload.id) && (
                        <tr>
                          <td colSpan={7} className="px-6 bg-[#F9FAFB] dark:bg-[#010001]">
                            <div className={`py-6 ${closingRow === upload.id ? 'animate-collapse-up' : 'animate-expand-down'}`}>
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="h-0 min-h-full flex flex-col overflow-hidden">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-4 flex-shrink-0">{t('history.preview')}</h3>
                                  <div
                                    className="bg-white rounded-lg border border-gray-200 overflow-hidden w-full flex-1 max-w-md cursor-pointer hover:border-blue-300 dark:bg-[#0B0A0B] dark:border-white/10 dark:hover:border-blue-500/50 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); openPreviewModal(upload); }}
                                  >
                                    {isExpired(upload.expires_at) ? (
                                      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-white/5">
                                        <p className="text-sm text-gray-500 dark:text-[#888888] text-center px-4">{t('history.expiredFile')}</p>
                                      </div>
                                    ) : isImageFileByType(upload.file_type) ? (
                                      presignedUrls[upload.id] ? (
                                        <img
                                          src={presignedUrls[upload.id]}
                                          alt={upload.file_name}
                                          className="w-full h-full object-contain"
                                        />
                                      ) : (
                                        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-white/5">
                                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                                        </div>
                                      )
                                    ) : isPdfFile(upload.file_name) ? (
                                      presignedUrls[upload.id] ? (
                                        <PdfPreview source={presignedUrls[upload.id]} fileName={upload.file_name} />
                                      ) : (
                                        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-white/5">
                                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                                        </div>
                                      )
                                    ) : (
                                      <div className="flex flex-col items-center justify-center h-full bg-gray-100 dark:bg-white/5 p-4 gap-4">
                                        <FileThumbnail source={null} fileName={upload.file_name} size="md" />
                                        <p className="text-sm text-gray-500 dark:text-[#888888] text-center">{t('history.clickToPreview')}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  <div className="flex flex-col">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED] mb-4">{t('history.detailInfo')}</h3>
                                    <div className="bg-white rounded-lg border border-gray-200 dark:bg-[#0B0A0B] dark:border-white/10 p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                                      <div className="col-span-2">
                                        <span className="text-sm font-medium text-gray-500 dark:text-[#888888]">{t('history.fileNameLabel')}</span>
                                        <p className="text-sm text-gray-900 dark:text-[#EDEDED] break-all">{upload.file_name}</p>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="text-sm font-medium text-gray-500 dark:text-[#888888]">{t('history.descriptionLabel')}</span>
                                        <p className="text-sm text-gray-900 dark:text-[#EDEDED] break-words whitespace-pre-wrap">{upload.description || t('common.none')}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-[#888888]">{t('history.fileTypeLabel')}</span>
                                        <p className="text-sm text-gray-900 dark:text-[#EDEDED]">{upload.file_type}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-[#888888]">{t('history.fileSizeLabel')}</span>
                                        <p className="text-sm text-gray-900 dark:text-[#EDEDED]">{formatFileSize(upload.file_size)}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-[#888888]">{t('history.shareCodeLabel')}</span>
                                        <p className="text-sm text-gray-900 dark:text-[#EDEDED] font-mono">{upload.share_code}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-[#888888]">{t('history.passwordLabel')}</span>
                                        <p className="text-sm text-gray-900 dark:text-[#EDEDED]">{upload.has_password ? t('common.exists') : t('common.none')}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-[#888888]">{t('history.oneTimeShareLabel')}</span>
                                        <p className="text-sm text-gray-900 dark:text-[#EDEDED]">{upload.is_one_time ? t('common.yes') : t('common.no')}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-[#888888]">{t('history.downloadCountLabel')}</span>
                                        <p className="text-sm text-gray-900 dark:text-[#EDEDED]">{t('common.countUnit', { count: upload.download_count })}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-[#888888]">{t('history.uploadDateLabel')}</span>
                                        <p className="text-sm text-gray-900 dark:text-[#EDEDED]">{formatDateTime(upload.created_at, language)}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-[#888888]">{t('history.expirationDateLabel')}</span>
                                        <p className="text-sm text-gray-900 dark:text-[#EDEDED]">{formatDateTime(upload.expires_at, language)}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="h-0 min-h-full flex flex-col overflow-hidden">
                                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                      <h3 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDED]">{t('history.downloadHistory')}</h3>
                                      {downloadLogs[upload.id]?.length > 3 && (
                                        <button
                                          onClick={(e) => handleViewAllLogs(upload.id, e)}
                                          className="px-3 py-1.5 text-sm text-gray-700 rounded hover:bg-gray-200 dark:text-[#888888] dark:hover:bg-white/10 transition-colors font-medium"
                                        >
                                          {t('history.viewAll')}
                                        </button>
                                      )}
                                    </div>
                                    <div className="bg-white rounded-lg border border-gray-200 dark:bg-[#0B0A0B] dark:border-white/10 p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                                      {loadingLogs[upload.id] ? (
                                        <div className="text-sm text-gray-500 dark:text-[#888888] text-center py-4 flex-1 flex items-center justify-center">{t('common.loading')}</div>
                                      ) : downloadLogs[upload.id]?.length > 0 ? (
                                        <div className="space-y-4 overflow-y-auto pr-2 flex-1">
                                          {downloadLogs[upload.id].map((log) => (
                                            <div
                                              key={log.id}
                                              className="text-sm border-b border-gray-100 dark:border-white/10 pb-4 last:border-0 last:pb-0"
                                            >
                                              <div className="flex justify-between items-start gap-4">
                                                <div className="min-w-0 flex-1">
                                                  <p className="font-medium text-gray-900 dark:text-[#EDEDED]">
                                                    {log.downloader_name || t('common.anonymousUser')}
                                                  </p>
                                                  <p className="text-gray-500 dark:text-[#888888] text-xs mt-2">
                                                    {log.device_platform}
                                                  </p>
                                                  <p className="text-gray-500 dark:text-[#888888] text-xs">
                                                    {log.ip_address}
                                                  </p>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-[#888888] whitespace-nowrap flex-shrink-0">
                                                  {formatDateTime(log.downloaded_at, language)}
                                                </p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-gray-500 dark:text-[#888888] text-center py-4 flex-1 flex items-center justify-center">
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
          </div>

          <div className="md:hidden space-y-2">
            {uploads.map((upload) => (
              <div key={upload.id} className="bg-white rounded-xl border-[3px] border-gray-100 dark:bg-[#0B0A0B] dark:border-white/10 overflow-hidden">
                <div className="relative">
                  <div className="absolute top-1/2 -translate-y-1/2 right-3 flex gap-1 z-10">
                    {!isExpired(upload.expires_at) && (
                      <button
                        onClick={(e) => handleShowQRCode(upload.share_code, e)}
                        className="p-2 text-gray-700 hover:bg-gray-200 dark:text-[#888888] dark:hover:bg-white/10 rounded transition-colors"
                        title={t('history.qrCode')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(upload.id, e)}
                      className="p-2 text-gray-700 hover:text-red-600 hover:bg-gray-200 dark:text-[#888888] dark:hover:text-red-400 dark:hover:bg-white/10 rounded transition-colors"
                      title={t('common.delete')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>

                  <div
                    onClick={() => handleRowClick(upload.id)}
                    className={`p-4 cursor-pointer ${expandedRow === upload.id ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
                  >
                    <div className="flex items-center space-x-3 pr-20">
                    <FileThumbnail source={getThumbnailSource(upload)} fileName={upload.file_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-[#EDEDED]" title={upload.file_name}>
                        {truncateFileName(upload.file_name, 25)}
                      </h3>
                      <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500 dark:text-[#888888]">
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
                        <p className="mt-1 text-xs text-gray-500 dark:text-[#888888] line-clamp-2 overflow-hidden text-ellipsis">
                          {upload.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

                {(expandedRow === upload.id || closingRow === upload.id) && (
                  <div className={`border-t border-gray-200 dark:border-white/10 p-4 bg-[#F9FAFB] dark:bg-[#010001] ${closingRow === upload.id ? 'animate-collapse-up' : 'animate-expand-down'}`}>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">{t('history.preview')}</h4>
                        <div
                          className={`bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-300 dark:bg-[#0B0A0B] dark:border-white/10 dark:hover:border-blue-500/50 transition-colors ${
                            isExpired(upload.expires_at) ? 'h-28' :
                            isImageFileByType(upload.file_type) ? 'aspect-square' : 'h-32'
                          }`}
                          onClick={() => openPreviewModal(upload)}
                        >
                          {isExpired(upload.expires_at) ? (
                            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-white/5">
                              <p className="text-xs text-gray-500 dark:text-[#888888] text-center px-4">{t('history.expiredFile')}</p>
                            </div>
                          ) : isImageFileByType(upload.file_type) ? (
                            presignedUrls[upload.id] ? (
                              <img
                                src={presignedUrls[upload.id]}
                                alt={upload.file_name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-white/5">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                              </div>
                            )
                          ) : isPdfFile(upload.file_name) ? (
                            presignedUrls[upload.id] ? (
                              <PdfPreview source={presignedUrls[upload.id]} fileName={upload.file_name} />
                            ) : (
                              <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-white/5">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full bg-gray-100 dark:bg-white/5 p-4 gap-4">
                              <FileThumbnail source={null} fileName={upload.file_name} size="md" />
                              <p className="text-xs text-gray-500 dark:text-[#888888] text-center">{t('history.clickToPreview')}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-[#EDEDED] mb-2">{t('history.detailInfo')}</h4>
                        <div className="bg-white rounded-lg border border-gray-200 dark:bg-[#0B0A0B] dark:border-white/10 p-3 space-y-2 text-xs">
                          <div>
                            <span className="text-gray-500 dark:text-[#888888]">{t('history.fileTypeLabel')}:</span>
                            <span className="ml-2 text-gray-900 dark:text-[#EDEDED]">{upload.file_type}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-[#888888]">{t('history.shareCodeLabel')}:</span>
                            <span className="ml-2 text-gray-900 dark:text-[#EDEDED] font-mono">{upload.share_code}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-[#888888]">{t('history.passwordLabel')}:</span>
                            <span className="ml-2 text-gray-900 dark:text-[#EDEDED]">{upload.has_password ? t('common.exists') : t('common.none')}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-[#888888]">{t('history.oneTimeShareLabel')}:</span>
                            <span className="ml-2 text-gray-900 dark:text-[#EDEDED]">{upload.is_one_time ? t('common.yes') : t('common.no')}</span>
                          </div>
                          <div>
                            <div className="text-gray-500 dark:text-[#888888] mb-1">{t('history.descriptionLabel')}:</div>
                            <div className="text-gray-900 dark:text-[#EDEDED] break-words whitespace-pre-wrap">{upload.description || t('common.none')}</div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-[#888888]">{t('history.uploadDateLabel')}:</span>
                            <span className="ml-2 text-gray-900 dark:text-[#EDEDED]">{formatDateTime(upload.created_at, language)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-[#888888]">{t('history.expirationDateLabel')}:</span>
                            <span className="ml-2 text-gray-900 dark:text-[#EDEDED]">{formatDateTime(upload.expires_at, language)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-[#EDEDED]">{t('history.downloadHistory')}</h4>
                          {downloadLogs[upload.id]?.length > 2 && (
                            <button
                              onClick={(e) => handleViewAllLogs(upload.id, e)}
                              className="px-2 py-1 text-xs text-gray-700 rounded hover:bg-gray-200 dark:text-[#888888] dark:hover:bg-white/10 transition-colors"
                            >
                              {t('history.viewAll')}
                            </button>
                          )}
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 dark:bg-[#0B0A0B] dark:border-white/10 p-4">
                          {loadingLogs[upload.id] ? (
                            <div className="h-20 flex items-center justify-center text-xs text-gray-500 dark:text-[#888888] text-center">{t('common.loading')}</div>
                          ) : downloadLogs[upload.id]?.length > 0 ? (
                            <div className="space-y-4 overflow-y-auto pr-1" style={{
                              maxHeight: downloadLogs[upload.id].length <= 2 ? 'none' : '240px'
                            }}>
                              {downloadLogs[upload.id].map((log) => (
                                <div key={log.id} className="text-xs border-b border-gray-100 dark:border-white/10 pb-4 last:border-0 last:pb-0">
                                  <p className="font-medium text-gray-900 dark:text-[#EDEDED]">{log.downloader_name || t('common.anonymousUser')}</p>
                                  <p className="text-gray-500 dark:text-[#888888] mt-2">
                                    {log.device_platform} • {log.ip_address}
                                  </p>
                                  <p className="text-gray-500 dark:text-[#888888] mt-2">{formatDateTime(log.downloaded_at, language)}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-20 flex items-center justify-center text-xs text-gray-500 dark:text-[#888888] text-center">
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
            <div className="flex items-center justify-between px-4 py-3 bg-white sm:px-6 mt-4 rounded-lg border-[3px] border-gray-100 dark:bg-[#0B0A0B] dark:border-white/10">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={handlePreviousPage}
                  disabled={offset === 0}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:border-white/15 dark:text-[#EDEDED] dark:bg-[#0B0A0B] dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('history.previous')}
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={offset + limit >= total}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:border-white/15 dark:text-[#EDEDED] dark:bg-[#0B0A0B] dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('history.next')}
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-[#EDEDED]">
                    {t('history.pagination', { from: offset + 1, to: Math.min(offset + limit, total), total })}
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={handlePreviousPage}
                      disabled={offset === 0}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:border-white/15 dark:bg-[#0B0A0B] dark:text-[#888888] dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">{t('history.previous')}</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 dark:border-white/15 dark:bg-[#0B0A0B] dark:text-[#EDEDED]">
                      {t('history.pageOf', { current: currentPage, total: totalPages })}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={offset + limit >= total}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:border-white/15 dark:bg-[#0B0A0B] dark:text-[#888888] dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">{t('history.next')}</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showAllLogsModal && selectedFileForLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0B0A0B] rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-[#EDEDED]">{t('history.allDownloadHistory')}</h2>
              <button
                onClick={() => setShowAllLogsModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded"
              >
                <svg className="w-6 h-6 text-gray-500 dark:text-[#888888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="relative flex-1 min-h-0 flex flex-col rounded-b-xl">
              <div ref={logsScrollRef} className="overflow-auto flex-1 min-h-0">
              {downloadLogs[selectedFileForLogs]?.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                  <thead className="bg-gray-50 dark:bg-white/5 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-[#888888] uppercase tracking-wider whitespace-nowrap">
                        {t('history.receiver')}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-[#888888] uppercase tracking-wider whitespace-nowrap">
                        {t('downloadLogs.platform')}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-[#888888] uppercase tracking-wider whitespace-nowrap">
                        {t('downloadLogs.ipAddress')}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-[#888888] uppercase tracking-wider whitespace-nowrap">
                        {t('history.downloadTime')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-[#0B0A0B] dark:divide-white/10">
                    {downloadLogs[selectedFileForLogs].map((log) => (
                      <tr key={log.id} className="sm:hover:bg-gray-50 dark:sm:hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-[#EDEDED] text-center">
                          {log.downloader_name || t('common.anonymousUser')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-[#888888] text-center">
                          {log.device_platform}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-[#888888] text-center">
                          {log.ip_address}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-[#888888] text-center">
                          {formatDateTime(log.downloaded_at, language)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-gray-500 dark:text-[#888888] py-8">
                  {t('history.noDownloadLogs')}
                </div>
              )}
              </div>

              {showScrollHint && (
                <div
                  className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none z-10"
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
          </div>
        </div>
      )}

      {showQRModal && selectedShareCode && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="bg-white dark:bg-[#0B0A0B] rounded-xl p-6 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-[#EDEDED]">{t('history.qrCode')}</h2>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded"
              >
                <svg className="w-6 h-6 text-gray-500 dark:text-[#888888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex justify-center p-2 bg-white">
                <QRCodeSVG
                  value={`${window.location.origin}/download/${selectedShareCode}`}
                  size={256}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-[#888888] text-center mt-3">
                {t('history.scanQR')}
              </p>
            </div>
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-[#EDEDED] mb-2">
                {t('history.shareLink')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={`${window.location.origin}/download/${selectedShareCode}`}
                  readOnly
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 dark:bg-white/5 dark:border-white/15 dark:text-[#EDEDED]"
                />
                <button
                  onClick={handleCopyLink}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-300 dark:hover:bg-white/10 rounded-lg transition-colors"
                  title={t('history.copyLink')}
                >
                  {copiedLink ? (
                    <CheckIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <ClipboardDocumentIcon className="w-5 h-5 text-gray-600 dark:text-[#888888]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          animation: scrollHint 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default UploadHistoryPage;
