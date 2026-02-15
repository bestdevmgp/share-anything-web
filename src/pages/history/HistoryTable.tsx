import React from 'react';
import { UploadHistoryItem, DownloadLog } from '../../types';
import { isPdfFile, formatFileSize, formatDateTime } from '../../utils/format';
import { Language } from '../../context/LanguageContext';
import FileThumbnail from '../../components/FileThumbnail';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { cn } from 'lib/utils';

interface PdfPreviewProps {
  source: string;
  fileName: string;
  width?: number;
}

interface HistoryTableProps {
  uploads: UploadHistoryItem[];
  expandedRow: string | null;
  closingRow: string | null;
  downloadLogs: { [key: string]: DownloadLog[] };
  loadingLogs: { [key: string]: boolean };
  presignedUrls: Record<string, string>;
  failedPreviews: Set<string>;
  tableScrollRef: React.RefObject<HTMLDivElement | null>;
  showTableScrollHint: boolean;
  language: Language;
  handleRowClick: (fileId: string) => void;
  handleShowQRCode: (shareCode: string, e: React.MouseEvent) => void;
  handleDelete: (fileId: string, e: React.MouseEvent) => void;
  handleViewAllLogs: (fileId: string, e: React.MouseEvent) => void;
  openPreviewModal: (upload: UploadHistoryItem) => void;
  handlePreviewError: (uploadId: string) => void;
  getThumbnailSource: (upload: UploadHistoryItem) => string | null;
  truncateFileName: (fileName: string, maxLength?: number) => string;
  isExpired: (expiresAt: string) => boolean;
  isImageFileByType: (fileType: string) => boolean;
  PdfPreview: React.FC<PdfPreviewProps>;
  t: (key: string, params?: Record<string, any>) => string;
}

const HistoryTable: React.FC<HistoryTableProps> = ({
  uploads,
  expandedRow,
  closingRow,
  downloadLogs,
  loadingLogs,
  presignedUrls,
  failedPreviews,
  tableScrollRef,
  showTableScrollHint,
  language,
  handleRowClick,
  handleShowQRCode,
  handleDelete,
  handleViewAllLogs,
  openPreviewModal,
  handlePreviewError,
  getThumbnailSource,
  truncateFileName,
  isExpired,
  isImageFileByType,
  PdfPreview,
  t,
}) => {
  return (
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
                    expandedRow === upload.id ? 'bg-muted' : 'bg-card'
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleShowQRCode(upload.share_code, e)}
                              className="text-muted-foreground"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                              </svg>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('history.qrCode')}</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDelete(upload.id, e)}
                            className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('common.delete')}</TooltipContent>
                      </Tooltip>
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
                              className="bg-card rounded-lg border border-border overflow-hidden w-full flex-1 max-w-md cursor-pointer hover:border-primary/50 transition-colors"
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
                                    size="sm"
                    className="text-muted-foreground"
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
  );
};

export default HistoryTable;
