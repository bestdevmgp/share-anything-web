import React, { useRef, useState, useLayoutEffect } from 'react';
import { FolderIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { UploadHistoryItem, UploadGroup, DownloadLog } from '../../types';
import { isPdfFile, isVideoFile, formatFileSize, formatDateTime } from '../../utils/format';
import { sanitizeRelativePath } from '../../utils/folderPath';
import { Language } from '../../context/LanguageContext';
import FileThumbnail from '../../components/FileThumbnail';
import TruncatedFilename from '../../components/TruncatedFilename';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import FolderTreeRows, { treeIndent } from '../../components/UnifiedFileBox/FolderTreeRows';
import Collapsible from '../../components/UnifiedFileBox/Collapsible';
import { buildFileTree, nodeFileCount, nodeSize } from '../../utils/fileTree';
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
  isExpired,
  isImageFileByType,
  PdfPreview,
  VideoPreview,
  t,
}) => {
  const expandRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [detailUploadId, setDetailUploadId] = useState<string | null>(null);
  const toggleFolder = (key: string) =>
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const groupFiles = (files: UploadHistoryItem[]) => {
    const folders = new Map<string, UploadHistoryItem[]>();
    const looseFiles: UploadHistoryItem[] = [];
    files.forEach((f) => {
      const rel = sanitizeRelativePath(f.relative_path || '');
      const slash = rel.indexOf('/');
      if (slash === -1) {
        looseFiles.push(f);
      } else {
        const top = rel.slice(0, slash);
        const arr = folders.get(top) ?? [];
        arr.push(f);
        folders.set(top, arr);
      }
    });
    return { folders, looseFiles };
  };

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
        const { folders, looseFiles } = groupFiles(group.files);
        const hasFoldersInGroup = folders.size > 0;
        const topLevelNames = [
          ...Array.from(folders.keys()).map((name) => `${name}/`),
          ...looseFiles.map((f) => f.file_name),
        ];
        const bundleTitle = topLevelNames.length > 1
          ? `${topLevelNames[0]} ${t('unifiedBox.bundleExtraCount', { count: topLevelNames.length - 1 })}`
          : (topLevelNames[0] ?? group.shareCode);
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
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <div className="absolute -bottom-1.5 -right-1.5 w-12 h-12 rounded-md bg-muted border border-foreground/[0.15]" />
                    <div className="absolute -bottom-[3px] -right-[3px] w-12 h-12 rounded-md bg-card border border-foreground/[0.15]" />
                    <div className="relative">
                      <FileThumbnail source={getThumbnailSource(firstFile)} fileName={firstFile.file_name} size="md" />
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 z-10 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-card">
                      {group.files.length}
                    </span>
                  </div>
                ) : (
                  <FileThumbnail source={getThumbnailSource(firstFile)} fileName={firstFile.file_name} size="md" />
                )}
                <div className="flex-1 min-w-0 h-12 overflow-hidden flex flex-col justify-center">
                  {isBundle ? (
                    <>
                      <h3 className="text-sm font-medium text-foreground leading-4 truncate">
                        {bundleTitle}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate leading-4 mt-0.5">
                        {group.shareCode}
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
                      <TruncatedFilename name={firstFile.file_name} className="text-sm font-medium text-foreground leading-4" />
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
                        <span className="ml-2 text-foreground">{group.shareCode}</span>
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

                {(() => {
                const renderFileDetail = (upload: UploadHistoryItem) => (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">{t('history.preview')}</h4>
                      <Card
                        className={cn(
                          'rounded-lg shadow-none overflow-hidden cursor-pointer can-hover:hover:border-primary/50 active:border-primary/50 transition-colors',
                          isExpired(upload.expires_at) ? 'h-28' :
                          (isImageFileByType(upload.file_type) || isVideoFile(upload.file_name)) ? 'aspect-square' : 'h-32'
                        )}
                        onClick={() => { setDetailUploadId(null); openPreviewModal(upload); }}
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
                              <span className="ml-2 text-foreground">{upload.share_code}</span>
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
                  );
                  const detailUpload = detailUploadId ? group.files.find((f) => f.id === detailUploadId) : null;
                  const fileRowDetail = (upload: UploadHistoryItem, compact: boolean, depth = 0) => (
                    <button
                      type="button"
                      data-row={compact ? '' : undefined}
                      onClick={(e) => { e.stopPropagation(); setDetailUploadId(upload.id); }}
                      className={cn(
                        'w-full flex items-center gap-3 min-w-0 text-left can-hover:hover:bg-accent active:bg-accent transition-colors',
                        compact ? '-mx-2.5 px-2.5 py-2 rounded-lg' : 'p-3 rounded-lg bg-muted border border-foreground/[0.09]'
                      )}
                      style={compact ? { marginLeft: `calc(-0.625rem + ${treeIndent(depth)})` } : undefined}
                    >
                      <FileThumbnail source={getThumbnailSource(upload)} fileName={upload.file_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <TruncatedFilename name={upload.file_name} className="text-sm font-medium text-foreground" />
                        <p className="text-xs text-muted-foreground">{formatFileSize(upload.file_size)}</p>
                      </div>
                    </button>
                  );
                  return (isBundle || hasFoldersInGroup) ? (
                    <div className="space-y-2" style={{ containerType: 'inline-size' }}>
                      {buildFileTree(group.files.map((f) => ({ id: f.id, file_name: f.file_name, file_size: f.file_size, relative_path: f.relative_path }))).map((node) => {
                        if (node.kind === 'file') {
                          const upload = group.files.find((f) => f.id === node.id);
                          return upload ? <React.Fragment key={node.id}>{fileRowDetail(upload, false)}</React.Fragment> : null;
                        }
                        if (node.children.length === 0) {
                          return (
                            <div key={`folder:${node.path}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-foreground/[0.09]">
                              <div className="w-11 h-11 rounded bg-background flex items-center justify-center flex-shrink-0">
                                <FolderIcon className="w-6 h-6 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground truncate">{node.name}</p>
                                <p className="text-xs text-muted-foreground">{t('upload.folderEmpty')}</p>
                              </div>
                            </div>
                          );
                        }
                        const isOpen = openFolders.has(node.path);
                        return (
                          <div key={`folder:${node.path}`} className="bg-muted rounded-lg border border-foreground/[0.09] overflow-hidden">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleFolder(node.path); }}
                              className="w-full flex items-center gap-3 p-3 text-left can-hover:hover:bg-accent active:bg-accent transition-colors"
                            >
                              <div className="w-11 h-11 rounded bg-background flex items-center justify-center flex-shrink-0">
                                <FolderIcon className="w-6 h-6 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground truncate">{node.name}</p>
                                <p className="text-xs text-muted-foreground">{t('upload.folderItemCount', { count: nodeFileCount(node) })} · {formatFileSize(nodeSize(node))}</p>
                              </div>
                              <ChevronDownIcon className={cn('w-5 h-5 text-muted-foreground/50 transition-transform flex-shrink-0', isOpen && 'rotate-180')} />
                            </button>
                            <Collapsible open={isOpen}>
                              <div className="px-3 pb-3">
                                <div className="border-t border-foreground/[0.08] pt-2.5 space-y-1">
                                  <FolderTreeRows
                                    nodes={node.children}
                                    depth={1}
                                    openFolders={openFolders}
                                    toggleFolder={toggleFolder}
                                    t={t}
                                    renderFile={(file, depth) => {
                                      const upload = group.files.find((f) => f.id === file.id);
                                      return upload ? fileRowDetail(upload, true, depth) : null;
                                    }}
                                  />
                                </div>
                              </div>
                            </Collapsible>
                          </div>
                        );
                      })}
                      {detailUpload && (
                        <Dialog open onOpenChange={(o) => { if (!o) setDetailUploadId(null); }}>
                          <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="truncate">{detailUpload.file_name}</DialogTitle>
                            </DialogHeader>
                            {renderFileDetail(detailUpload)}
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  ) : (
                    group.files.map((upload) => (
                      <React.Fragment key={upload.id}>{renderFileDetail(upload)}</React.Fragment>
                    ))
                  );
                  })()}
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
