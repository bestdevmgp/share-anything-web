import React, { useMemo, useState } from 'react';
import { NavigateFunction } from 'react-router-dom';
import { XMarkIcon, FolderIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { FileListResponse } from '../../types';
import { formatFileSize } from '../../utils/format';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

import { Checkbox } from '../../components/ui/checkbox';
import FileThumbnail from '../../components/FileThumbnail';
import TruncatedFilename from '../../components/TruncatedFilename';
import FolderTreeRows, { treeIndent } from '../../components/UnifiedFileBox/FolderTreeRows';
import Collapsible from '../../components/UnifiedFileBox/Collapsible';
import { buildFileTree, collectFileIds, nodeFileCount, nodeSize } from '../../utils/fileTree';
import { cn } from 'lib/utils';

export interface MultiFileListProps {
  fileList: FileListResponse;
  selectedFiles: Set<string>;
  toggleFileSelection: (fileId: string) => void;
  setFilesSelected: (fileIds: string[], selected: boolean) => void;
  selectAllFiles: () => void;
  deselectAllFiles: () => void;
  downloading: boolean;
  downloadProgress: number;
  downloadTimeRemaining: string;
  downloadAsZip: boolean;
  handleDownload: (asZip: boolean) => void;
  handleCancelDownload: () => void;
  navigate: NavigateFunction;
  previews?: Record<string, string>;
  openPreview?: (fileName: string, fileSize: number, fileId: string, source: string) => void;
  zipping: boolean;
  zipDone: number;
  zipTotal: number;
  zipError: boolean;
  canStreamZip: boolean;
  handleStructuredZip: (forceFallback?: boolean) => void;
  handleCancelZip: () => void;
  handleZipFallbackToIndividual: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const MultiFileList: React.FC<MultiFileListProps> = ({
  fileList,
  selectedFiles,
  toggleFileSelection,
  setFilesSelected,
  selectAllFiles,
  deselectAllFiles,
  downloading,
  downloadProgress,
  downloadTimeRemaining,
  downloadAsZip,
  handleDownload,
  handleCancelDownload,
  navigate,
  previews,
  openPreview,
  zipping,
  zipDone,
  zipTotal,
  zipError,
  canStreamZip,
  handleStructuredZip,
  handleCancelZip,
  handleZipFallbackToIndividual,
  t,
}) => {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const toggleFolder = (name: string) =>
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const tree = useMemo(
    () =>
      buildFileTree(
        fileList.files.map((f) => ({
          id: f.id,
          file_name: f.file_name,
          file_size: f.file_size,
          relative_path: f.relative_path,
        })),
        fileList.empty_folders ?? []
      ),
    [fileList.files, fileList.empty_folders]
  );

  const isFolderShare = tree.some((n) => n.kind === 'folder');

  const selectedTotalSize = fileList.files
    .filter((f) => selectedFiles.has(f.id))
    .reduce((sum, f) => sum + f.file_size, 0);

  const FALLBACK_WARN_LIMIT = 1024 * 1024 * 1024;
  const showFallbackWarning = !canStreamZip && selectedTotalSize >= FALLBACK_WARN_LIMIT;

  const canZip = selectedFiles.size > 1;
  const hasSelection = selectedFiles.size > 0;

  return (
    <div className="pt-8 pb-20 px-4 sm:pt-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-500/15">
              <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" className="download-checkmark-path" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">{t('download.readyToDownload')}</h1>
          <p className="text-muted-foreground">
            {t('download.totalFilesAvailable', { count: fileList.total_count })}
          </p>
        </div>
        <style>{`
          .download-checkmark-path {
            stroke-dasharray: 20;
            stroke-dashoffset: 20;
            animation: drawDownloadCheck 0.6s ease-out forwards;
          }
          @keyframes drawDownloadCheck {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}</style>

        <Card className="rounded-2xl sm:rounded-3xl border-2 p-4 pt-[22px] sm:p-10 sm:pt-[26px]">
          {fileList.description && (
            <div className="mb-8 p-4 bg-muted rounded-lg border border-foreground/[0.09]">
              <p className="text-foreground break-words whitespace-pre-wrap">{fileList.description}</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              {t('download.fileListSelected', { selected: selectedFiles.size, total: fileList.total_count })}
            </h3>
            <Button
              variant="ghost"
              onClick={selectedFiles.size === fileList.files.length ? deselectAllFiles : selectAllFiles}
              size="sm"
              className="text-primary can-hover:hover:bg-primary/10 active:bg-primary/10"
            >
              {selectedFiles.size === fileList.files.length ? t('download.deselectAll') : t('download.selectAll')}
            </Button>
          </div>

          <div className="mb-6 sm:mb-8 space-y-2 sm:space-y-2.5">
            {tree.map((node) => {
              // Loose file (no folder) — individually selectable.
              if (node.kind === 'file') {
                const selected = selectedFiles.has(node.id);
                return (
                  <div
                    key={node.id}
                    onClick={() => toggleFileSelection(node.id)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all',
                      selected
                        ? 'bg-accent border border-primary'
                        : 'bg-muted border border-foreground/[0.09] can-hover:hover:bg-accent active:bg-accent'
                    )}
                  >
                    <div className="flex-shrink-0">
                      <Checkbox checked={selected} className="h-6 w-6 rounded-md border-2" />
                    </div>
                    {previews?.[node.id] ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openPreview?.(node.name, node.size, node.id, previews[node.id]); }}
                        className="flex-shrink-0 rounded overflow-hidden transition-transform can-hover:hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={node.name}
                      >
                        <FileThumbnail source={previews[node.id]} fileName={node.name} size="md" />
                      </button>
                    ) : (
                      <div className="flex-shrink-0">
                        <FileThumbnail source={null} fileName={node.name} size="md" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <TruncatedFilename name={node.name} className="text-sm font-semibold text-foreground" />
                      <p className="text-xs text-muted-foreground">{formatFileSize(node.size)}</p>
                    </div>
                  </div>
                );
              }
              // Empty folder — shown but not selectable (no files inside).
              if (node.children.length === 0) {
                return (
                  <div
                    key={`folder:${node.path}`}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg bg-muted border border-foreground/[0.09]"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded bg-background flex items-center justify-center">
                        <FolderIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{node.name}</p>
                      <p className="text-xs text-muted-foreground">{t('upload.folderEmpty')}</p>
                    </div>
                  </div>
                );
              }
              // Folder — one selection unit (its whole subtree); nested tree shown via FolderTreeRows.
              const ids = collectFileIds(node);
              const allSelected = ids.length > 0 && ids.every((id) => selectedFiles.has(id));
              const isOpen = openFolders.has(node.path);
              return (
                <div
                  key={`folder:${node.path}`}
                  className={cn(
                    'rounded-lg border overflow-hidden transition-all',
                    allSelected ? 'bg-accent border-primary' : 'bg-muted border-foreground/[0.09]'
                  )}
                >
                  <div
                    onClick={() => toggleFolder(node.path)}
                    className="flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors can-hover:hover:bg-accent active:bg-accent"
                  >
                    <span
                      onClick={(e) => { e.stopPropagation(); setFilesSelected(ids, !allSelected); }}
                      className="flex-shrink-0 -m-1.5 p-1.5 rounded-md cursor-pointer can-hover:hover:bg-foreground/10 active:bg-foreground/10"
                      aria-label={node.name}
                    >
                      <Checkbox checked={allSelected} className="h-6 w-6 rounded-md border-2 pointer-events-none" />
                    </span>
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded bg-background flex items-center justify-center">
                        <FolderIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{node.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('upload.folderItemCount', { count: nodeFileCount(node) })} · {formatFileSize(nodeSize(node))}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleFolder(node.path); }}
                      className="p-1 rounded-md flex-shrink-0 can-hover:hover:bg-foreground/10 active:bg-foreground/10 transition-colors"
                      aria-label={node.name}
                    >
                      <ChevronDownIcon className={cn('w-5 h-5 text-muted-foreground/60 transition-transform', isOpen && 'rotate-180')} />
                    </button>
                  </div>
                  <Collapsible open={isOpen}>
                    <div className="px-3 pb-3">
                      <div className="border-t border-foreground/[0.08] pt-2.5">
                        <div className="space-y-1 pl-3">
                          <FolderTreeRows
                            nodes={node.children}
                            depth={1}
                            openFolders={openFolders}
                            toggleFolder={toggleFolder}
                            t={t}
                            renderFile={(file, depth) => {
                              const src = previews?.[file.id];
                              return (
                                <div
                                  data-row
                                  onClick={src ? (e) => { e.stopPropagation(); openPreview?.(file.name, file.size, file.id, src); } : undefined}
                                  className={cn(
                                    'flex items-center gap-3 min-w-0 -mx-2.5 px-2.5 py-2 rounded-lg transition-colors',
                                    src && 'cursor-pointer can-hover:hover:bg-accent active:bg-accent'
                                  )}
                                  style={{ marginLeft: `calc(-0.625rem + ${treeIndent(depth)})` }}
                                >
                                  <FileThumbnail source={src ?? null} fileName={file.name} size="sm" />
                                  <div className="flex-1 min-w-0">
                                    <TruncatedFilename name={file.name} className="text-sm text-foreground/80" />
                                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                  </div>
                                </div>
                              );
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </Collapsible>
                </div>
              );
            })}
          </div>

          <div className="">
            {downloading ? (
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {downloadAsZip ? t('download.creatingZip') : t('download.downloadingP2P')}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {downloadProgress === 100 ? (
                          <span className="text-xs text-muted-foreground">{t('upload.pleaseWait')}</span>
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground">{downloadTimeRemaining || t('format.calculating')}</span>
                            <span className="text-xs font-semibold text-primary">{downloadProgress}%</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center h-4 mt-0.5">
                      <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-1000 ease-out rounded-full"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleCancelDownload}
                    disabled={downloadProgress === 100}
                    className={cn(
                      'p-1 rounded transition-colors flex-shrink-0',
                      downloadProgress === 100 ? 'cursor-not-allowed' : 'can-hover:hover:bg-accent active:bg-accent'
                    )}
                    title={t('download.cancelDownload')}
                  >
                    <XMarkIcon className={cn('w-6 h-6', downloadProgress === 100 ? 'text-muted-foreground/30' : 'text-muted-foreground')} />
                  </button>
                </div>
              </div>
            ) : zipping ? (
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{t('download.creatingZip')}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {t('download.bulkProgress', { done: zipDone, total: zipTotal })}
                      </span>
                    </div>
                    <div className="flex items-center h-4 mt-0.5">
                      <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-300 ease-out rounded-full"
                          style={{ width: `${zipTotal > 0 ? Math.round((zipDone / zipTotal) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleCancelZip}
                    className="p-1 rounded transition-colors flex-shrink-0 can-hover:hover:bg-accent active:bg-accent"
                    title={t('download.cancelDownload')}
                  >
                    <XMarkIcon className="w-6 h-6 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ) : zipError ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive text-center">{t('download.zipDownloadFailed')}</p>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => handleStructuredZip(false)}
                    size="lg"
                    className="flex-1"
                  >
                    {t('common.retry')}
                  </Button>
                  <Button
                    onClick={handleZipFallbackToIndividual}
                    size="lg"
                    className="flex-1"
                  >
                    {t('download.individualDownload')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {showFallbackWarning && (
                  <p className="text-xs text-muted-foreground mb-3 text-center">
                    {t('download.zipFallbackWarning')}
                  </p>
                )}
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => handleStructuredZip(false)}
                    disabled={!canZip}
                    size="lg"
                    className="flex-1"
                  >
                    {isFolderShare ? t('download.zipDownloadFolder') : t('download.zipDownload')}
                  </Button>
                  <Button
                    onClick={() => handleDownload(false)}
                    disabled={!hasSelection}
                    size="lg"
                    className="flex-1"
                  >
                    {t('download.individualDownload')}
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="mt-3 md:-mb-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-muted-foreground can-hover:hover:text-foreground active:text-foreground"
            >
              {t('common.back')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MultiFileList;
