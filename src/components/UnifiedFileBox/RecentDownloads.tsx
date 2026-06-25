import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';
import { toast } from '../../context/ToastContext';
import { useSharePreviews, useBundlePreviews } from './useSharePreviews';
import { fetchShareFileList, getCachedFileList } from './shareFileList';
import { fileAPI } from '../../services/api';
import { FileListItem } from '../../types';
import { listDownloads, removeDownload, RecentDownload } from '../../utils/recentDownloads';
import { MergedShare } from '../../utils/shareMerge';
import { formatFileSize, isPptxFile } from '../../utils/format';
import FileThumbnail from '../FileThumbnail';
import FilePreviewModal from '../FilePreviewModal';
import TruncatedFilename from '../TruncatedFilename';
import CopyButton from '../CopyButton';
import { Hint } from '../ui/Hint';
import { cn } from '../../lib/utils';

const formatCompactDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  return `${month}.${day} ${hours}:${mins}`;
};

const RecentDownloads: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [downloads, setDownloads] = useState<RecentDownload[]>(() => listDownloads());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bundleFiles, setBundleFiles] = useState<Record<string, FileListItem[]>>({});
  const [previewFile, setPreviewFile] = useState<
    { fileName: string; fileSize: number; source?: string; code?: string; fileId?: string; presignedUrl?: string } | null
  >(null);

  const mergedItems: MergedShare[] = downloads.map((d) => ({
    code: d.code,
    fileNames: d.fileNames,
    totalSize: d.totalSize,
    createdAt: d.downloadedAt,
    expiresAt: d.expiresAt,
    source: 'server' as const,
    firstFileId: d.firstFileId,
  }));
  const previews = useSharePreviews(mergedItems);

  useEffect(() => {
    if (!expanded || bundleFiles[expanded]) return;
    const cached = getCachedFileList(expanded);
    if (cached) {
      setBundleFiles((p) => ({ ...p, [expanded]: cached.files }));
      return;
    }
    let cancelled = false;
    fetchShareFileList(expanded)
      .then((res) => {
        if (!cancelled) setBundleFiles((p) => ({ ...p, [expanded]: res.files }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [expanded, bundleFiles]);

  const expandedFiles = expanded && bundleFiles[expanded]
    ? bundleFiles[expanded].map((f) => ({ id: f.id, name: f.file_name }))
    : undefined;
  const bundlePreviews = useBundlePreviews(expanded, expandedFiles, false);

  const handleRemove = (code: string) => {
    removeDownload(code);
    setDownloads((prev) => prev.filter((d) => d.code !== code));
    if (expanded === code) setExpanded(null);
  };

  const openPreviewFor = async (code: string, fileId: string, fileName: string, fileSize: number) => {
    // PPTX uses the Office web viewer (needs a public URL), so fetch that first.
    if (isPptxFile(fileName)) {
      try {
        const { download_url } = await fileAPI.getDownloadUrl(code, fileId, undefined, true);
        setPreviewFile({ fileName, fileSize, source: download_url, presignedUrl: download_url });
      } catch {
        navigate(`/download/${code}`);
      }
      return;
    }
    // Everything else: open the modal immediately; it fetches the file through the proxy
    // itself and shows a spinner while loading (no blank delay before it appears).
    setPreviewFile({ fileName, fileSize, code, fileId });
  };

  const openDownloadPreview = async (d: RecentDownload) => {
    let fileId = d.firstFileId;
    let fileName = d.fileNames[0] || 'file';
    let fileSize = d.totalSize;
    if (!fileId) {
      try {
        const list = await fetchShareFileList(d.code);
        const f = list.files[0];
        if (!f) {
          navigate(`/download/${d.code}`);
          return;
        }
        fileId = f.id;
        fileName = f.file_name;
        fileSize = f.file_size;
      } catch {
        navigate(`/download/${d.code}`);
        return;
      }
    }
    openPreviewFor(d.code, fileId, fileName, fileSize);
  };

  const hasItems = downloads.length > 0;

  const remainingLabel = (expiresAt: string): { text: string; expired: boolean } => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return { text: t('unifiedBox.expired'), expired: true };
    const hours = Math.floor(diff / 3_600_000);
    if (hours >= 1) return { text: t('unifiedBox.remainingHours', { hours }), expired: false };
    const minutes = Math.max(1, Math.floor(diff / 60_000));
    return { text: t('unifiedBox.remainingMinutes', { minutes }), expired: false };
  };

  return (
    <>
    {/* Animate the recent-downloads list open (instead of popping in) once the data
        loads: an empty 0-height grid row that expands to the content height. */}
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
        hasItems ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      )}
    >
    <div className="min-h-0 overflow-hidden">
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h4 className="text-xs font-semibold text-foreground/70">
          {t('unifiedBox.recentDownloadsTitle')}
          <span className="text-muted-foreground/50 font-normal ml-1">
            ({t('unifiedBox.sessionCount', { count: downloads.length })})
          </span>
        </h4>
      </div>
      <div className="px-4 pb-2 mb-2 space-y-2 max-h-[420px] overflow-y-auto">
        {downloads.map((d) => {
          const { text: remainText, expired } = remainingLabel(d.expiresAt);
          const isBundle = d.fileNames.length > 1;
          const isOpen = expanded === d.code;
          const url = `${window.location.origin}/download/${d.code}`;

          return (
            <div
              key={d.code}
              className={cn(
                'bg-muted rounded-lg border border-foreground/[0.09] overflow-hidden transition-colors',
                expired && 'opacity-60'
              )}
            >
              <div
                role="button"
                onClick={() => {
                  if (isBundle) setExpanded(isOpen ? null : d.code);
                  else if (expired) navigate(`/download/${d.code}`);
                  else openDownloadPreview(d);
                }}
                className="w-full flex items-center px-3 py-2.5 text-left cursor-pointer can-hover:hover:bg-accent active:bg-accent transition-colors"
              >
                <div className="flex-shrink-0 mr-3">
                  {isBundle ? (
                    <div className="relative w-11 h-11">
                      <div className="absolute -bottom-1.5 -right-1.5 w-11 h-11 rounded-md bg-muted border border-foreground/[0.15]" />
                      <div className="absolute -bottom-[3px] -right-[3px] w-11 h-11 rounded-md bg-card border border-foreground/[0.15]" />
                      <div className="relative">
                        <FileThumbnail source={previews[d.code] ?? null} fileName={d.fileNames[0] || 'file'} size="sm" />
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 z-10 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-card">
                        {d.fileNames.length}
                      </span>
                    </div>
                  ) : (
                    <FileThumbnail source={previews[d.code] ?? null} fileName={d.fileNames[0] || 'file'} size="sm" />
                  )}
                </div>
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-baseline min-w-0">
                    <span className="truncate min-w-0 text-sm font-medium text-foreground" title={d.fileNames[0]}>{d.fileNames[0]}</span>
                    {isBundle && (
                      <span className="text-sm text-muted-foreground font-normal flex-shrink-0 ml-1">
                        {t('unifiedBox.bundleExtraCount', { count: d.fileNames.length - 1 })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatFileSize(d.totalSize)} · {remainText}
                  </p>
                  <p className="text-xs text-muted-foreground/50 truncate mt-0.5">
                    <span>{d.code}</span> · {formatCompactDate(d.downloadedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Hint label={t('common.copy')}>
                    <CopyButton
                      value={url}
                      stopPropagation
                      onCopied={() => {
                        if (expired) {
                          toast.error(t('unifiedBox.expiredCodeToast'));
                        } else {
                          toast.success(t('quickAccess.shareSuccess'));
                        }
                      }}
                      className="p-1.5 rounded-lg transition-colors text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:bg-foreground/10 active:text-muted-foreground active:bg-foreground/10"
                      iconClassName="w-5 h-5"
                      iconIdleClass="text-muted-foreground/50"
                      iconCopiedClass="text-green-600 dark:text-green-400"
                      aria-label={t('common.copy')}
                    />
                  </Hint>
                  <Hint label={t('common.delete')}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemove(d.code); }}
                      className="p-1.5 rounded-lg transition-colors text-muted-foreground/50 can-hover:hover:text-red-600 dark:can-hover:hover:text-red-400 can-hover:hover:bg-red-100/50 dark:can-hover:hover:bg-red-500/15 active:text-red-600 dark:active:text-red-400 active:bg-red-100/50 dark:active:bg-red-500/15"
                      aria-label={t('common.delete')}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </Hint>
                  {isBundle && (
                    <ChevronDownIcon
                      className={cn(
                        'w-5 h-5 text-muted-foreground/50 transition-transform',
                        isOpen && 'rotate-180'
                      )}
                    />
                  )}
                </div>
              </div>

              {isBundle && isOpen && (
                <div className="px-3 pb-3">
                  <div className="border-t border-foreground/[0.08] pt-2.5 space-y-2">
                    {(bundleFiles[d.code]
                      ? bundleFiles[d.code].map((f) => ({
                          name: f.file_name,
                          size: f.file_size as number | undefined,
                          id: f.id as string | undefined,
                        }))
                      : d.fileNames.map((name) => ({
                          name,
                          size: undefined as number | undefined,
                          id: undefined as string | undefined,
                        }))
                    ).map((f, i) => {
                      const clickable = !!f.id;
                      const rowInner = (
                        <>
                          <FileThumbnail source={f.id ? bundlePreviews[f.id] ?? null : null} fileName={f.name} size="sm" />
                          <TruncatedFilename name={f.name} className="flex-1 text-sm font-medium text-foreground text-left" />
                          {f.size != null && (
                            <span className="flex-shrink-0 text-sm text-muted-foreground">
                              {formatFileSize(f.size)}
                            </span>
                          )}
                        </>
                      );
                      return clickable ? (
                        <button
                          key={`${f.name}-${i}`}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openPreviewFor(d.code, f.id!, f.name, f.size ?? 0); }}
                          className="w-full flex items-center gap-3 min-w-0 -mx-2.5 px-2.5 py-2 rounded-lg can-hover:hover:bg-accent active:bg-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={f.name}
                        >
                          {rowInner}
                        </button>
                      ) : (
                        <div key={`${f.name}-${i}`} className="flex items-center gap-3 min-w-0 -mx-2.5 px-2.5 py-2">
                          {rowInner}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    </div>
    </div>
    {previewFile && (
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    )}
    </>
  );
};

export default RecentDownloads;
