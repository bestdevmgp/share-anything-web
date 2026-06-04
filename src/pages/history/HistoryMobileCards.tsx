import React, { useRef, useLayoutEffect } from 'react';
import { UploadHistoryItem, UploadGroup, DownloadLog } from '../../types';
import { isPdfFile, isVideoFile, formatFileSize, formatDateTime } from '../../utils/format';
import { Language } from '../../context/LanguageContext';
import FileThumbnail from '../../components/FileThumbnail';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Card, CardContent } from '../../components/ui/card';
import { cn } from 'lib/utils';

interface PdfPreviewProps {
  source: string;
  fileName: string;
  width?: number;
}

interface VideoPreviewProps {
  source: string;
  fileName: string;
}

interface HistoryMobileCardsProps {
  groups: UploadGroup[];
  expandedRow: string | null;
  closingRow: string | null;
  downloadLogs: { [key: string]: DownloadLog[] };
  loadingLogs: { [key: string]: boolean };
  presignedUrls: Record<string, string>;
  failedPreviews: Set<string>;
  language: Language;
  handleRowClick: (shareCode: string) => void;
  handleShowQRCode: (shareCode: string, e: React.MouseEvent) => void;
  handleDeleteGroup: (shareCode: string, e: React.MouseEvent) => void;
  handleViewAllLogs: (fileId: string, e: React.MouseEvent) => void;
  openPreviewModal: (upload: UploadHistoryItem) => void;
  handlePreviewError: (uploadId: string) => void;
  getThumbnailSource: (upload: UploadHistoryItem) => string | null;
  truncateFileName: (fileName: string, maxLength?: number) => string;
  isExpired: (expiresAt: string) => boolean;
  isImageFileByType: (fileType: string) => boolean;
  PdfPreview: React.FC<PdfPreviewProps>;
  VideoPreview: React.FC<VideoPreviewProps>;
  t: (key: string, params?: Record<string, any>) => string;
}

const renderMobilePreview = (
  upload: UploadHistoryItem,
  presignedUrls: Record<string, string>,
  failedPreviews: Set<string>,
  handlePreviewError: (uploadId: string) => void,
  isExpired: (expiresAt: string) => boolean,
  isImageFileByType: (fileType: string) => boolean,
  PdfPreview: React.FC<PdfPreviewProps>,
  VideoPreview: React.FC<VideoPreviewProps>,
  t: (key: string, params?: Record<string, any>) => string,
) => {
  if (isExpired(upload.expires_at)) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <p className="text-xs text-muted-foreground text-center px-4">{t('history.expiredFile')}</p>
      </div>
    );
  }
  if (isImageFileByType(upload.file_type)) {
    return presignedUrls[upload.id] && !failedPreviews.has(upload.id) ? (
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
    );
  }
  if (isVideoFile(upload.file_name)) {
    return presignedUrls[upload.id] && !failedPreviews.has(upload.id) ? (
      <VideoPreview source={presignedUrls[upload.id]} fileName={upload.file_name} />
    ) : (
      <div className="flex flex-col items-center justify-center h-full bg-muted p-4 gap-4">
        <FileThumbnail source={null} fileName={upload.file_name} size="md" />
        <p className="text-xs text-muted-foreground text-center">{t('history.clickToPreview')}</p>
      </div>
    );
  }
  if (isPdfFile(upload.file_name)) {
    return presignedUrls[upload.id] && !failedPreviews.has(upload.id) ? (
      <PdfPreview source={presignedUrls[upload.id]} fileName={upload.file_name} />
    ) : (
      <div className="flex flex-col items-center justify-center h-full bg-muted p-4 gap-4">
        <FileThumbnail source={null} fileName={upload.file_name} size="md" />
        <p className="text-xs text-muted-foreground text-center">{t('history.clickToPreview')}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted p-4 gap-4">
      <FileThumbnail source={null} fileName={upload.file_name} size="md" />
      <p className="text-xs text-muted-foreground text-center">{t('history.clickToPreview')}</p>
    </div>
  );
};

const HistoryMobileCards: React.FC<HistoryMobileCardsProps> = ({
  groups,
  expandedRow,
  closingRow,
  downloadLogs,
  loadingLogs,
  presignedUrls,
  failedPreviews,
  language,
  handleRowClick,
  handleShowQRCode,
  handleDeleteGroup,
  handleViewAllLogs,
  openPreviewModal,
  handlePreviewError,
  getThumbnailSource,
  truncateFileName,
  isExpired,
  isImageFileByType,
  PdfPreview,
  VideoPreview,
  t,
}) => {
  const expandRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useLayoutEffect(() => {
    if (!closingRow) return;
    const el = expandRefs.current.get(closingRow);
    if (!el) return;
    const h = el.getBoundingClientRect().height;
    el.style.transition = 'none';
    el.style.height = h + 'px';
    el.style.overflow = 'hidden';
    el.getBoundingClientRect();
    el.style.transition = 'height 0.2s ease';
    el.style.height = '0px';
  }, [closingRow]);

  useLayoutEffect(() => {
    if (!expandedRow) return;
    const el = expandRefs.current.get(expandedRow);
    if (!el) return;
    const h = el.scrollHeight;
    el.style.transition = 'none';
    el.style.height = '0px';
    el.style.overflow = 'hidden';
    el.getBoundingClientRect();
    el.style.transition = 'height 0.2s ease';
    el.style.height = h + 'px';
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== 'height') return;
      el.style.height = 'auto';
      el.style.overflow = '';
      el.removeEventListener('transitionend', onEnd);
    };
    el.addEventListener('transitionend', onEnd);
    return () => el.removeEventListener('transitionend', onEnd);
  }, [expandedRow]);

  return (
    <div className="md:hidden space-y-2">
      {groups.map((group) => {
        const isBundle = group.files.length > 1;
        const firstFile = group.files[0];
        const expired = isExpired(group.expiresAt);
        return (
        <Card key={group.shareCode} className="rounded-xl border-2 border-border shadow-none overflow-hidden">
          <div className="relative">
            <div className="absolute top-1/2 -translate-y-1/2 right-3 flex gap-1 z-10">
              {!expired && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleShowQRCode(group.shareCode, e)}
                  className="text-muted-foreground [&_svg]:h-5 [&_svg]:w-5"
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
                onClick={(e) => handleDeleteGroup(group.shareCode, e)}
                className="text-muted-foreground can-hover:hover:text-red-600 dark:can-hover:hover:text-red-400 active:text-red-600 dark:active:text-red-400 [&_svg]:h-5 [&_svg]:w-5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </Button>
            </div>

            <div
              onClick={() => handleRowClick(group.shareCode)}
              className={cn('p-4 cursor-pointer', expandedRow === group.shareCode && 'bg-muted')}
            >
              <div className="flex items-center space-x-3 pr-20">
                {isBundle ? (
                  <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                  </div>
                ) : (
                  <FileThumbnail source={getThumbnailSource(firstFile)} fileName={firstFile.file_name} size="md" />
                )}
                <div className="flex-1 min-w-0 h-12 overflow-hidden flex flex-col justify-center">
                  {isBundle ? (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground font-mono tracking-wide leading-4 truncate">
                          {group.shareCode}
                        </h3>
                        <span className="inline-flex items-center text-[10px] px-1.5 py-[1px] rounded-full font-medium bg-primary/10 text-primary flex-shrink-0">
                          {t('history.bundleFileCount', { count: group.files.length })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate leading-4 mt-0.5">
                        {group.files.slice(0, 2).map(f => f.file_name).join(', ')}
                        {group.files.length > 2 && ` +${group.files.length - 2}`}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground leading-4 mt-0.5">
                        <span>{formatFileSize(group.totalSize)}</span>
                        <span>•</span>
                        {expired ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">{t('history.expired')}</span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400 font-medium">{t('history.active')}</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className={cn("text-sm font-medium text-foreground leading-4 truncate")} title={firstFile.file_name}>
                        {truncateFileName(firstFile.file_name, 28)}
                      </h3>
                      <div className={cn("flex items-center space-x-2 text-xs text-muted-foreground leading-4", firstFile.description ? "mt-0.5" : "mt-1")}>
                        <span>{formatFileSize(group.totalSize)}</span>
                        <span>•</span>
                        <span>{t('common.downloadCount', { count: group.downloadCount })}</span>
                        <span>•</span>
                        {expired ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">{t('history.expired')}</span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400 font-medium">{t('history.active')}</span>
                        )}
                      </div>
                      {firstFile.description && (
                        <p className="text-xs text-muted-foreground truncate leading-4 mt-0.5">
                          {firstFile.description}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {(expandedRow === group.shareCode || closingRow === group.shareCode) && (
            <div ref={(el) => {
              if (el) expandRefs.current.set(group.shareCode, el);
              else expandRefs.current.delete(group.shareCode);
            }}>
              <div className="border-t border-border p-4 bg-background space-y-4">
                {isBundle && (
                  <Card className="rounded-lg shadow-none">
                    <CardContent className="p-3 space-y-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">{t('history.shareCodeLabel')}:</span>
                        <span className="ml-2 text-foreground font-mono">{group.shareCode}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('history.bundleSize')}:</span>
                        <span className="ml-2 text-foreground">{formatFileSize(group.totalSize)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('history.passwordLabel')}:</span>
                        <span className="ml-2 text-foreground">{group.hasPassword ? t('common.exists') : t('common.none')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('history.oneTimeShareLabel')}:</span>
                        <span className="ml-2 text-foreground">{group.isOneTime ? t('common.yes') : t('common.no')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('history.expirationDateLabel')}:</span>
                        <span className="ml-2 text-foreground">{formatDateTime(group.expiresAt, language)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {isBundle && (
                  <h4 className="text-sm font-semibold text-foreground">{t('history.filesInBundle')}</h4>
                )}

                {group.files.map((upload) => (
                  <div key={upload.id} className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">{t('history.preview')}</h4>
                      <Card
                        className={cn(
                          'rounded-lg shadow-none overflow-hidden cursor-pointer can-hover:hover:border-primary/50 active:border-primary/50 transition-colors',
                          isExpired(upload.expires_at) ? 'h-28' :
                          (isImageFileByType(upload.file_type) || isVideoFile(upload.file_name)) ? 'aspect-square' : 'h-32'
                        )}
                        onClick={() => openPreviewModal(upload)}
                      >
                        {renderMobilePreview(
                          upload,
                          presignedUrls,
                          failedPreviews,
                          handlePreviewError,
                          isExpired,
                          isImageFileByType,
                          PdfPreview,
                          VideoPreview,
                          t,
                        )}
                      </Card>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">{t('history.detailInfo')}</h4>
                      <Card className="rounded-lg shadow-none">
                        <CardContent className="p-3 space-y-2 text-xs">
                        <div>
                          <div className="text-muted-foreground mb-1">{t('history.fileNameLabel')}:</div>
                          <div className="text-foreground break-all">{upload.file_name}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('history.fileTypeLabel')}:</span>
                          <span className="ml-2 text-foreground">{upload.file_type}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('history.fileSizeLabel')}:</span>
                          <span className="ml-2 text-foreground">{formatFileSize(upload.file_size)}</span>
                        </div>
                        {!isBundle && (
                          <>
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
                          </>
                        )}
                        <div>
                          <div className="text-muted-foreground mb-1">{t('history.descriptionLabel')}:</div>
                          <div className="text-foreground break-words whitespace-pre-wrap">{upload.description || t('common.none')}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('history.downloadCountLabel')}:</span>
                          <span className="ml-2 text-foreground">{t('common.countUnit', { count: upload.download_count })}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('history.uploadDateLabel')}:</span>
                          <span className="ml-2 text-foreground">{formatDateTime(upload.created_at, language)}</span>
                        </div>
                        {!isBundle && (
                          <div>
                            <span className="text-muted-foreground">{t('history.expirationDateLabel')}:</span>
                            <span className="ml-2 text-foreground">{formatDateTime(upload.expires_at, language)}</span>
                          </div>
                        )}
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-foreground">{t('history.downloadHistory')}</h4>
                        {downloadLogs[upload.id]?.length > 2 && (
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
                      <Card className="rounded-lg shadow-none">
                        <CardContent className="p-4">
                        {loadingLogs[upload.id] ? (
                          <div className="space-y-4">
                            {[0, 1].map((i) => (
                              <div key={i} className="border-b border-border pb-4 last:border-0 last:pb-0">
                                <Skeleton className="h-3.5 w-20" />
                                <Skeleton className="h-3 w-36 mt-2" />
                                <Skeleton className="h-3 w-36 mt-2" />
                              </div>
                            ))}
                          </div>
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
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
        );
      })}
    </div>
  );
};

export default HistoryMobileCards;
