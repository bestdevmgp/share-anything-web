import React, { useRef, useState, useLayoutEffect } from 'react';
import { FolderIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { UploadHistoryItem, UploadGroup, DownloadLog } from '../../types';
import { isPdfFile, isVideoFile, formatFileSize, formatDateTime } from '../../utils/format';
import { sanitizeRelativePath } from '../../utils/folderPath';
import { Language } from '../../context/LanguageContext';
import FileThumbnail from '../../components/FileThumbnail';
import TruncatedFilename from '../../components/TruncatedFilename';
import { Button } from '../../components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { Skeleton } from '../../components/ui/skeleton';
import { Card, CardContent } from '../../components/ui/card';
import {
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
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

interface HistoryTableProps {
  groups: UploadGroup[];
  expandedRow: string | null;
  closingRow: string | null;
  downloadLogs: { [key: string]: DownloadLog[] };
  loadingLogs: { [key: string]: boolean };
  presignedUrls: Record<string, string>;
  failedPreviews: Set<string>;
  tableScrollRef: React.RefObject<HTMLDivElement | null>;
  showTableScrollHint: boolean;
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
  onUploadClick?: () => void;
}

const renderFilePreview = (
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
        <p className="text-sm text-muted-foreground text-center px-4">{t('history.expiredFile')}</p>
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
        <p className="text-sm text-muted-foreground text-center">{t('history.clickToPreview')}</p>
      </div>
    );
  }
  if (isVideoFile(upload.file_name)) {
    return presignedUrls[upload.id] && !failedPreviews.has(upload.id) ? (
      <VideoPreview source={presignedUrls[upload.id]} fileName={upload.file_name} />
    ) : (
      <div className="flex flex-col items-center justify-center h-full bg-muted p-4 gap-4">
        <FileThumbnail source={null} fileName={upload.file_name} size="md" />
        <p className="text-sm text-muted-foreground text-center">{t('history.clickToPreview')}</p>
      </div>
    );
  }
  if (isPdfFile(upload.file_name)) {
    return presignedUrls[upload.id] && !failedPreviews.has(upload.id) ? (
      <PdfPreview source={presignedUrls[upload.id]} fileName={upload.file_name} />
    ) : (
      <div className="flex flex-col items-center justify-center h-full bg-muted p-4 gap-4">
        <FileThumbnail source={null} fileName={upload.file_name} size="md" />
        <p className="text-sm text-muted-foreground text-center">{t('history.clickToPreview')}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted p-4 gap-4">
      <FileThumbnail source={null} fileName={upload.file_name} size="md" />
      <p className="text-sm text-muted-foreground text-center">{t('history.clickToPreview')}</p>
    </div>
  );
};

const HistoryTable: React.FC<HistoryTableProps> = ({
  groups,
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
  onUploadClick,
}) => {
  const expandRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
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
    <Card className="hidden md:block rounded-xl border-2 border-border shadow-none overflow-hidden relative">
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
          <TableHeader className="bg-muted">
            <TableRow className="can-hover:hover:bg-transparent">
              <TableHead className="px-6 py-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap align-middle h-auto">
                {t('history.fileName')}
              </TableHead>
              <TableHead className="px-6 py-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap align-middle h-auto">
                {t('history.size')}
              </TableHead>
              <TableHead className="px-6 py-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap align-middle h-auto">
                {t('history.uploadDate')}
              </TableHead>
              <TableHead className="px-6 py-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap align-middle h-auto">
                {t('history.expirationDate')}
              </TableHead>
              <TableHead className="px-6 py-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap align-middle h-auto">
                {t('history.downloads')}
              </TableHead>
              <TableHead className="px-6 py-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap align-middle h-auto">
                {t('history.status')}
              </TableHead>
              <TableHead className="px-6 py-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap align-middle h-auto">
                {t('history.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-card divide-y divide-border">
            {groups.length === 0 ? (
              <TableRow className="can-hover:hover:bg-transparent">
                <TableCell colSpan={7} className="p-12 text-center">
                  <p className="text-muted-foreground">{t('history.noFiles')}</p>
                  {onUploadClick && (
                    <Button onClick={onUploadClick} className="mt-4">
                      {t('history.shareFiles')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : groups.map((group) => {
              const isBundle = group.files.length > 1;
              const firstFile = group.files[0];
              const expired = isExpired(group.expiresAt);
              const { folders, looseFiles } = groupFiles(group.files);
              const hasFoldersInGroup = folders.size > 0;
              const topLevelNames = [
                ...Array.from(folders.keys()).map((name) => `${name}/`),
                ...looseFiles.map((f) => f.file_name),
              ];
              return (
              <React.Fragment key={group.shareCode}>
                <TableRow
                  onClick={() => handleRowClick(group.shareCode)}
                  className={cn(
                    'cursor-pointer can-hover:hover:bg-muted active:bg-muted',
                    expandedRow === group.shareCode ? 'bg-muted' : 'bg-card'
                  )}
                >
                  <TableCell className="px-6 py-3 max-w-0">
                    <div className="flex items-center space-x-3">
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
                      <div className="min-w-0 flex-1 h-12 overflow-hidden flex flex-col justify-center">
                        {isBundle ? (
                          <>
                            <div className="text-sm font-semibold text-foreground tracking-wide truncate">
                              {group.shareCode}
                            </div>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {topLevelNames.slice(0, 3).join(', ')}
                              {topLevelNames.length > 3 && ` +${topLevelNames.length - 3}`}
                            </div>
                          </>
                        ) : (
                          <>
                            <TruncatedFilename name={firstFile.file_name} className="text-sm font-medium text-foreground" />
                            {firstFile.description && (
                              <div className="text-sm text-muted-foreground truncate">
                                {firstFile.description}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-3 whitespace-nowrap text-sm text-muted-foreground text-center">
                    {formatFileSize(group.totalSize)}
                  </TableCell>
                  <TableCell className="px-6 py-3 whitespace-nowrap text-sm text-muted-foreground text-center">
                    {formatDateTime(group.createdAt, language)}
                  </TableCell>
                  <TableCell className="px-6 py-3 whitespace-nowrap text-sm text-muted-foreground text-center">
                    {formatDateTime(group.expiresAt, language)}
                  </TableCell>
                  <TableCell className="px-6 py-3 whitespace-nowrap text-sm text-foreground text-center">
                    {t('common.countUnit', { count: group.downloadCount })}
                  </TableCell>
                  <TableCell className="px-6 py-3 whitespace-nowrap text-center">
                    {expired ? (
                      <span className="inline-flex items-center text-xs px-2 py-[3px] rounded-full font-medium bg-red-600 text-white">
                        {t('history.expired')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs px-2 py-[3px] rounded-full font-medium bg-green-600 text-white">
                        {t('history.active')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-3 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-end gap-0.5">
                      {!expired && (
                        <Tooltip>
                          <TooltipTrigger asChild>
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
                          </TooltipTrigger>
                          <TooltipContent>{t('history.qrCode')}</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
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
                        </TooltipTrigger>
                        <TooltipContent>{t('common.delete')}</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>

                {(expandedRow === group.shareCode || closingRow === group.shareCode) && (
                  <TableRow className="can-hover:hover:bg-transparent border-0">
                    <TableCell colSpan={7} className="p-0 bg-background">
                      <div ref={(el) => {
                        if (el) expandRefs.current.set(group.shareCode, el);
                        else expandRefs.current.delete(group.shareCode);
                      }}>
                        <div className="px-6 py-6 space-y-6">
                          {isBundle && (
                            <Card className="rounded-lg shadow-none">
                              <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
                                <div>
                                  <span className="text-sm font-medium text-muted-foreground">{t('history.shareCodeLabel')}</span>
                                  <p className="text-sm text-foreground">{group.shareCode}</p>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-muted-foreground">{t('history.bundleSize')}</span>
                                  <p className="text-sm text-foreground">{formatFileSize(group.totalSize)}</p>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-muted-foreground">{t('history.passwordLabel')}</span>
                                  <p className="text-sm text-foreground">{group.hasPassword ? t('common.exists') : t('common.none')}</p>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-muted-foreground">{t('history.oneTimeShareLabel')}</span>
                                  <p className="text-sm text-foreground">{group.isOneTime ? t('common.yes') : t('common.no')}</p>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {isBundle && (
                            <h3 className="text-lg font-semibold text-foreground">{t('history.filesInBundle')}</h3>
                          )}

                          {(() => {
                          const renderFileDetail = (upload: UploadHistoryItem) => (
                            <div className="grid grid-cols-3 gap-4">
                              <div className="h-0 min-h-full flex flex-col overflow-hidden">
                                <h3 className="text-lg font-semibold text-foreground mb-4 flex-shrink-0">{t('history.preview')}</h3>
                                <Card
                                  className="rounded-lg shadow-none overflow-hidden w-full flex-1 max-w-md cursor-pointer can-hover:hover:border-primary/50 active:border-primary/50 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); openPreviewModal(upload); }}
                                >
                                  {renderFilePreview(
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

                              <div className="col-span-2 grid grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                  <h3 className="text-lg font-semibold text-foreground mb-4">{t('history.detailInfo')}</h3>
                                  <Card className="rounded-lg shadow-none">
                                    <CardContent className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
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
                                    {!isBundle && (
                                      <>
                                        <div>
                                          <span className="text-sm font-medium text-muted-foreground">{t('history.shareCodeLabel')}</span>
                                          <p className="text-sm text-foreground">{upload.share_code}</p>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-muted-foreground">{t('history.passwordLabel')}</span>
                                          <p className="text-sm text-foreground">{upload.has_password ? t('common.exists') : t('common.none')}</p>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-muted-foreground">{t('history.oneTimeShareLabel')}</span>
                                          <p className="text-sm text-foreground">{upload.is_one_time ? t('common.yes') : t('common.no')}</p>
                                        </div>
                                      </>
                                    )}
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
                                    </CardContent>
                                  </Card>
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
                                  <Card className="rounded-lg shadow-none flex-1 flex flex-col min-h-0 overflow-hidden">
                                    <CardContent className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                                    {loadingLogs[upload.id] ? (
                                      <div className="space-y-4 flex-1">
                                        {[0, 1, 2].map((i) => (
                                          <div key={i} className="border-b border-border pb-4 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-start gap-4">
                                              <div className="min-w-0 flex-1">
                                                <Skeleton className="h-4 w-24" />
                                                <Skeleton className="h-3 w-32 mt-2" />
                                                <Skeleton className="h-3 w-28 mt-1" />
                                              </div>
                                              <Skeleton className="h-3 w-32 flex-shrink-0" />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
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
                                    </CardContent>
                                  </Card>
                                </div>
                              </div>
                            </div>
                          );
                          return hasFoldersInGroup ? (
                            <div className="space-y-3">
                              {Array.from(folders.entries()).map(([folderName, items]) => {
                                const fKey = `${group.shareCode}/${folderName}`;
                                const isOpen = openFolders.has(fKey);
                                const folderSize = items.reduce((s, it) => s + it.file_size, 0);
                                return (
                                  <div key={`folder:${folderName}`} className="bg-muted rounded-lg border border-foreground/[0.09] overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); toggleFolder(fKey); }}
                                      className="w-full flex items-center gap-3 p-4 text-left can-hover:hover:bg-accent active:bg-accent transition-colors"
                                    >
                                      <div className="w-11 h-11 rounded bg-background flex items-center justify-center flex-shrink-0">
                                        <FolderIcon className="w-6 h-6 text-muted-foreground" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground truncate">{folderName}</p>
                                        <p className="text-xs text-muted-foreground">{t('upload.folderItemCount', { count: items.length })} · {formatFileSize(folderSize)}</p>
                                      </div>
                                      <ChevronDownIcon className={cn('w-5 h-5 text-muted-foreground/50 transition-transform flex-shrink-0', isOpen && 'rotate-180')} />
                                    </button>
                                    {isOpen && (
                                      <div className="px-4 pb-4 pt-4 space-y-6 border-t border-foreground/[0.08]">
                                        {items.map((upload) => (
                                          <React.Fragment key={upload.id}>{renderFileDetail(upload)}</React.Fragment>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {looseFiles.map((upload) => (
                                <React.Fragment key={upload.id}>{renderFileDetail(upload)}</React.Fragment>
                              ))}
                            </div>
                          ) : (
                            group.files.map((upload) => (
                              <React.Fragment key={upload.id}>{renderFileDetail(upload)}</React.Fragment>
                            ))
                          );
                          })()}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
              );
            })}
          </TableBody>
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
    </Card>
  );
};

export default HistoryTable;
