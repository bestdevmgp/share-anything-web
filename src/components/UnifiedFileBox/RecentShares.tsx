import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDownIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { useShareList } from '../../hooks/useShareList';
import { useSharePreviews, useBundlePreviews } from './useSharePreviews';
import { fetchShareFileList, getCachedFileList } from './shareFileList';
import { fileAPI } from '../../services/api';
import { FileListItem } from '../../types';
import { MergedShare } from '../../utils/shareMerge';
import { formatFileSize, isPptxFile, formatCompactDateTime, copyToClipboard } from '../../utils/format';
import FileThumbnail from '../FileThumbnail';
import FilePreviewModal from '../FilePreviewModal';
import CopyButton from '../CopyButton';
import { Hint } from '../ui/Hint';
import TruncatedFilename from '../TruncatedFilename';
import FolderTreeRows, { treeIndent } from './FolderTreeRows';
import Collapsible from './Collapsible';
import { buildFileTree, toggleFolderOpen } from '../../utils/fileTree';
import { cn } from '../../lib/utils';

interface Props {
  refreshKey: number;
}

const RecentShares: React.FC<Props> = ({ refreshKey }) => {
  const { t, language } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { items, requestDelete } = useShareList(refreshKey);
  const previews = useSharePreviews(items);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bundleFiles, setBundleFiles] = useState<Record<string, FileListItem[]>>({});
  const [bundleEmptyFolders, setBundleEmptyFolders] = useState<Record<string, string[]>>({});
  const [previewFile, setPreviewFile] = useState<
    { fileName: string; fileSize: number; source?: string; code?: string; fileId?: string; presignedUrl?: string } | null
  >(null);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const toggleFolder = (path: string) =>
    setOpenFolders((prev) => toggleFolderOpen(prev, path));

  useEffect(() => {
    setOpenFolders(new Set());
  }, [expanded]);

  useEffect(() => {
    if (!expanded || bundleFiles[expanded]) return;
    const cached = getCachedFileList(expanded);
    if (cached) {
      setBundleFiles((p) => ({ ...p, [expanded]: cached.files }));
      setBundleEmptyFolders((p) => ({ ...p, [expanded]: cached.empty_folders ?? [] }));
      return;
    }
    let cancelled = false;
    fetchShareFileList(expanded)
      .then((res) => {
        if (!cancelled) {
          setBundleFiles((p) => ({ ...p, [expanded]: res.files }));
          setBundleEmptyFolders((p) => ({ ...p, [expanded]: res.empty_folders ?? [] }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [expanded, bundleFiles]);

  const expandedShare = expanded ? items.find((i) => i.code === expanded) : undefined;
  const expandedFileList = expanded ? (bundleFiles[expanded] ?? expandedShare?.files) : undefined;
  const expandedFiles = expandedFileList
    ? expandedFileList.map((f) => ({ id: f.id, name: f.file_name }))
    : undefined;
  const bundlePreviews = useBundlePreviews(expanded, expandedFiles, expandedShare?.hasPassword);

  const openPreviewFor = async (
    code: string,
    fileId: string,
    fileName: string,
    fileSize: number,
    hasPassword?: boolean,
    previewUrl?: string
  ) => {
    if (hasPassword) {
      navigate(`/download/${code}`);
      return;
    }
    if (isPptxFile(fileName)) {
      try {
        const url = previewUrl || (await fileAPI.getDownloadUrl(code, fileId, undefined, true)).download_url;
        setPreviewFile({ fileName, fileSize, source: url, presignedUrl: url });
      } catch {
        navigate(`/download/${code}`);
      }
      return;
    }
    setPreviewFile({ fileName, fileSize, code, fileId, source: previewUrl || undefined });
  };

  const openSharePreview = async (s: MergedShare) => {
    if (s.hasPassword) {
      navigate(`/download/${s.code}`);
      return;
    }
    let fileId = s.firstFileId;
    let fileName = s.fileNames[0] || 'file';
    let fileSize = s.totalSize;
    let previewUrl: string | undefined;
    if (!fileId) {
      try {
        const list = await fetchShareFileList(s.code);
        const f = list.files[0];
        if (!f) {
          navigate(`/download/${s.code}`);
          return;
        }
        fileId = f.id;
        fileName = f.file_name;
        fileSize = f.file_size;
        previewUrl = f.preview_url;
      } catch {
        navigate(`/download/${s.code}`);
        return;
      }
    }
    openPreviewFor(s.code, fileId, fileName, fileSize, s.hasPassword, previewUrl);
  };

  const visibleItems = items.filter((i) => new Date(i.expiresAt).getTime() > Date.now());

  const hasItems = visibleItems.length > 0;

  const remainingLabel = (expiresAt: string): { text: string; expired: boolean } => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return { text: t('unifiedBox.expired'), expired: true };
    const hours = Math.floor(diff / 3_600_000);
    if (hours >= 1) return { text: t('unifiedBox.remainingHours', { hours }), expired: false };
    const minutes = Math.max(1, Math.floor(diff / 60_000));
    return { text: t('unifiedBox.remainingMinutes', { minutes }), expired: false };
  };

  const copyCode = async (code: string) => {
    if (await copyToClipboard(code)) {
      toast.success(t('unifiedBox.codeCopied'));
    }
  };

  return (
    <>
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
          {t('unifiedBox.recentTitle')}
          <span className="text-muted-foreground/50 font-normal ml-1">
            ({t('unifiedBox.sessionCount', { count: visibleItems.length })})
          </span>
        </h4>
        {isAuthenticated && (
          <Link
            to="/history"
            className="text-[11px] text-muted-foreground can-hover:hover:text-foreground underline"
          >
            {t('unifiedBox.viewAll')}
          </Link>
        )}
      </div>
      <div className="px-4 pb-2 mb-2 space-y-2 max-h-[420px] overflow-y-auto">
        {visibleItems.map((s) => {
          const { text: remainText, expired } = remainingLabel(s.expiresAt);
          const isBundle = s.fileNames.length > 1;
          const isOpen = expanded === s.code;
          const treeFiles = bundleFiles[s.code] ?? s.files;
          const url = `${window.location.origin}/download/${s.code}`;

          return (
            <div
              key={s.code}
              className={cn(
                'bg-muted rounded-lg border border-foreground/[0.09] overflow-hidden transition-colors',
                expired && 'opacity-60'
              )}
            >
              <div
                role="button"
                onClick={() => {
                  if (isBundle) setExpanded(isOpen ? null : s.code);
                  else if (expired) navigate(`/download/${s.code}`);
                  else openSharePreview(s);
                }}
                className="w-full flex items-center px-3 py-2.5 text-left cursor-pointer can-hover:hover:bg-accent active:bg-accent transition-colors"
              >
                <div className="flex-shrink-0 mr-3">
                  {isBundle ? (
                    <div className="relative w-11 h-11">
                      <div className="absolute -bottom-1.5 -right-1.5 w-11 h-11 rounded-md bg-muted border border-foreground/[0.15]" />
                      <div className="absolute -bottom-[3px] -right-[3px] w-11 h-11 rounded-md bg-card border border-foreground/[0.15]" />
                      <div className="relative">
                        <FileThumbnail source={previews[s.code] ?? null} fileName={s.fileNames[0] || 'file'} size="sm" />
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 z-10 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-card">
                        {s.fileNames.length}
                      </span>
                    </div>
                  ) : (
                    <FileThumbnail source={previews[s.code] ?? null} fileName={s.fileNames[0] || 'file'} size="sm" />
                  )}
                </div>
                <div className="flex-1 min-w-0 mr-3">
                  <TruncatedFilename
                    name={s.fileNames[0]}
                    className="text-sm font-medium text-foreground"
                    suffix={isBundle ? t('unifiedBox.bundleExtraCount', { count: s.fileNames.length - 1 }) : undefined}
                    suffixClassName="ml-1 text-sm text-muted-foreground font-normal"
                  />
                  <p className="text-xs text-muted-foreground truncate">
                    {formatFileSize(s.totalSize)} · {remainText}
                  </p>
                  <p className="text-xs text-muted-foreground/50 truncate mt-0.5">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); copyCode(s.code); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); copyCode(s.code); } }}
                      className="cursor-pointer underline-offset-2 transition-colors can-hover:hover:text-foreground can-hover:hover:underline"
                    >
                      {s.code}
                    </span> · {formatCompactDateTime(s.createdAt, language)}
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
                      aria-label={t('common.copy')}
                      className="p-1.5 rounded-lg transition-colors text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:bg-foreground/10 active:text-muted-foreground active:bg-foreground/10"
                      iconClassName="w-5 h-5"
                      iconIdleClass="text-muted-foreground/50"
                      iconCopiedClass="text-green-600 dark:text-green-400"
                    />
                  </Hint>
                  <Hint label={t('common.delete')}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); requestDelete(s.code); }}
                      aria-label={t('common.delete')}
                      className="p-1.5 rounded-lg transition-colors text-muted-foreground/50 can-hover:hover:text-red-600 dark:can-hover:hover:text-red-400 can-hover:hover:bg-red-100/50 dark:can-hover:hover:bg-red-500/15 active:text-red-600 dark:active:text-red-400 active:bg-red-100/50 dark:active:bg-red-500/15"
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

              {isBundle && (
                <Collapsible open={isOpen}>
                    <div className="px-3 pb-3">
                      <div className="border-t border-foreground/[0.08] pt-2.5 space-y-2">
                        {treeFiles ? (
                          <FolderTreeRows
                            nodes={buildFileTree(
                              treeFiles.map((f) => ({
                                id: f.id,
                                file_name: f.file_name,
                                file_size: f.file_size,
                                relative_path: f.relative_path,
                                preview_url: f.preview_url,
                              })),
                              bundleEmptyFolders[s.code] ?? []
                            )}
                            depth={1}
                            openFolders={openFolders}
                            toggleFolder={toggleFolder}
                            t={t}
                            renderFile={(file, depth) => {
                              const clickable = !s.hasPassword;
                              return (
                                <div
                                  data-row
                                  onClick={clickable ? (e) => { e.stopPropagation(); openPreviewFor(s.code, file.id, file.name, file.size, s.hasPassword, file.previewUrl); } : undefined}
                                  className={cn(
                                    'flex items-center gap-3 min-w-0 -mx-2.5 px-2.5 py-2 rounded-lg transition-colors',
                                    clickable && 'cursor-pointer can-hover:hover:bg-accent active:bg-accent'
                                  )}
                                  style={{ marginLeft: `calc(-0.625rem + ${treeIndent(depth)})` }}
                                >
                                  <FileThumbnail source={bundlePreviews[file.id] ?? null} fileName={file.name} size="sm" />
                                  <div className="flex-1 min-w-0">
                                    <TruncatedFilename name={file.name} className="text-sm font-medium text-foreground" />
                                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                  </div>
                                </div>
                              );
                            }}
                          />
                        ) : (
                          <div className="space-y-1">
                            {[0, 1].map((i) => (
                              <div key={i} className="flex items-center gap-3 -mx-2.5 px-2.5 py-2">
                                <div className="w-10 h-10 rounded bg-foreground/[0.06] animate-pulse flex-shrink-0" />
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="h-3 w-2/5 rounded bg-foreground/[0.06] animate-pulse" />
                                  <div className="h-2.5 w-1/5 rounded bg-foreground/[0.06] animate-pulse" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                </Collapsible>
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

export default RecentShares;
