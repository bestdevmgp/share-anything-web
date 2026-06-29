import React, { useEffect, useMemo, useState } from 'react';
import {
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon,
  FolderIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { FileListResponse } from '../../types';
import { formatFileSize } from '../../utils/format';
import {
  buildFileTree,
  collectFileIds,
  toggleFolderOpen,
  nodeSize,
  nodeFileCount,
  countVisibleRows,
  ancestorPaths,
  hasFolders as treeHasFolders,
} from '../../utils/fileTree';
import FileThumbnail from '../FileThumbnail';
import TruncatedFilename from '../TruncatedFilename';
import ScrollableFileList from './ScrollableFileList';
import Collapsible from './Collapsible';
import FolderTreeRows, { treeIndent } from './FolderTreeRows';
import StatusIcon from '../StatusIcon';
import PauseBarsIcon from '../PauseBarsIcon';
import { Button } from '../ui/button';
import { Hint } from '../ui/Hint';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';
import { Checkbox } from '../ui/checkbox';
import { cn } from '../../lib/utils';

interface Props {
  fileList: FileListResponse | null;
  loading: boolean;
  errorTitle: string;
  errorDesc: string;
  passwordVerified: boolean;
  password: string;
  showPassword: boolean;
  setPassword: (v: string) => void;
  setShowPassword: (v: boolean) => void;
  handlePasswordSubmit: (e: React.FormEvent) => void;
  isP2PDownload: boolean;
  p2pStatus: string;
  p2pProgress: number;
  p2pTimeRemaining: string;
  p2pPeerDeviceInfo: string | null;
  p2pActiveFileId: string | null;
  p2pCompletedFileIds: Set<string>;
  senderEnded: boolean;
  downloading: boolean;
  downloaded: boolean;
  downloadProgress?: number;
  downloadAsZip?: boolean;
  handleDownload: (asZip: boolean) => void;
  startP2PDownload: (fileId: string) => void;
  startBulkP2PDownload: () => void;
  downloadFolderAsZip: (folderPath: string) => void;
  handleCancelP2PDownload: () => void;
  closeP2PSession: () => void;
  onReset: () => void;
  onComplete?: () => void;
  onRetry: () => void;
  previews?: Record<string, string>;
  selectedFiles: Set<string>;
  toggleFileSelection: (fileId: string) => void;
  setFilesSelected: (fileIds: string[], selected: boolean) => void;
  selectAllFiles: () => void;
  deselectAllFiles: () => void;
  openPreview: (fileName: string, fileSize: number, fileId: string, opts?: { previewUrl?: string; preloadedSource?: string }) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const GreenCircle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-500/15 mb-4">
    {children}
  </div>
);

const NeutralCircle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-card border border-foreground/[0.09] mb-4">
    {children}
  </div>
);

const Check: React.FC = () => (
  <svg
    className="w-9 h-9"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#16a34a"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 13l4 4L19 7" className="box-check-path" />
  </svg>
);

const EmptyFolderCard: React.FC<{
  name: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}> = ({ name, t }) => (
  <div className="bg-muted rounded-lg border border-foreground/[0.09] overflow-hidden">
    <div className="flex items-center px-3 py-3">
      <div className="flex-shrink-0 mr-3">
        <div className="w-11 h-11 rounded bg-background flex items-center justify-center">
          <FolderIcon className="w-7 h-7 text-muted-foreground" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{t('upload.folderEmpty')}</p>
      </div>
    </div>
  </div>
);

const BoxDownloadView: React.FC<Props> = ({
  fileList,
  loading,
  errorTitle,
  errorDesc,
  passwordVerified,
  password,
  showPassword,
  setPassword,
  setShowPassword,
  handlePasswordSubmit,
  isP2PDownload,
  p2pStatus,
  p2pProgress,
  p2pTimeRemaining,
  p2pPeerDeviceInfo,
  p2pActiveFileId,
  p2pCompletedFileIds,
  downloading,
  downloaded,
  downloadProgress = 0,
  downloadAsZip = false,
  handleDownload,
  startP2PDownload,
  startBulkP2PDownload,
  downloadFolderAsZip,
  handleCancelP2PDownload,
  closeP2PSession,
  senderEnded,
  onReset,
  onComplete,
  onRetry,
  previews,
  selectedFiles,
  toggleFileSelection,
  setFilesSelected,
  selectAllFiles,
  deselectAllFiles,
  openPreview,
  t,
}) => {
  const showError = !loading && !!errorTitle;

  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const toggleFolder = (name: string) =>
    setOpenFolders((prev) => toggleFolderOpen(prev, name));

  const tree = useMemo(
    () => buildFileTree(fileList?.files ?? [], fileList?.empty_folders ?? []),
    [fileList?.files, fileList?.empty_folders]
  );
  const hasFolders = treeHasFolders(tree);

  const visibleRowCount = countVisibleRows(tree, (path) => openFolders.has(path));

  useEffect(() => {
    if (!p2pActiveFileId) return;
    const paths = ancestorPaths(tree, p2pActiveFileId);
    if (!paths || paths.length === 0) return;
    setOpenFolders((prev) => {
      if (paths.every((p) => prev.has(p))) return prev;
      const next = new Set(prev);
      paths.forEach((p) => next.add(p));
      return next;
    });
  }, [p2pActiveFileId, tree]);

  useEffect(() => {
    if (!showError) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onRetry();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showError, onRetry]);

  const wrap = (children: React.ReactNode, animKey?: string) => (
    <div
      key={animKey}
      className="flex-1 flex flex-col px-6 md:px-8 py-8 md:py-5 animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <style>{`
        .box-check-path {
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
          animation: drawBoxCheck 0.6s ease-out forwards;
        }
        @keyframes drawBoxCheck { to { stroke-dashoffset: 0; } }
      `}</style>
      {children}
    </div>
  );

  if (loading) {
    return wrap(
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <Spinner size="xl" className="text-primary mb-4" />
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>,
      'loading'
    );
  }

  if (errorTitle) {
    return wrap(
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <StatusIcon variant="error" />
        <h2 className="text-2xl font-bold text-foreground mb-2">{errorTitle}</h2>
        <p className="text-muted-foreground mb-6">{errorDesc}</p>
        <Button onClick={onRetry}>{t('common.retry')}</Button>
      </div>
    );
  }

  if (!fileList) return null;

  if (fileList.has_password && !passwordVerified) {
    return wrap(
      <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-muted border border-foreground/[0.09] mb-4">
          <LockClosedIcon className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1.5">{t('download.passwordTitle')}</h2>
        <p className="text-sm text-muted-foreground mb-5">{t('download.passwordProtected')}</p>
        <form onSubmit={handlePasswordSubmit} className="w-full">
          <div className="relative mb-3">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('download.passwordPlaceholder')}
              className="h-12 pr-12 rounded-lg"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground can-hover:hover:text-foreground active:text-foreground"
            >
              {showPassword ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
            </button>
          </div>
          <Button type="submit" size="lg" className="w-full">
            {t('common.confirm')}
          </Button>
        </form>
        <Button variant="ghost" size="sm" className="mt-2 text-muted-foreground" onClick={onReset}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  const files = fileList.files;
  const fileListHeader = (
    <p className="text-sm font-medium text-muted-foreground mb-2">
      {t('uploadSuccess.fileList', { count: files.length })}
    </p>
  );

  if (isP2PDownload) {
    const allDone = files.length > 0 && files.every((f) => p2pCompletedFileIds.has(f.id));
    const active = p2pStatus === 'connecting' || p2pStatus === 'downloading' || p2pStatus === 'processing';

    const receivedCount = p2pCompletedFileIds.size;
    if (!allDone && senderEnded && receivedCount > 0) {
      return wrap(
        <>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-green-100 dark:bg-green-500/15">
              <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" className="box-check-path" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1.5">{t('download.receiveCompleteTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('download.filesReceived', { count: receivedCount })}</p>
          </div>
          <Button onClick={() => { closeP2PSession(); (onComplete ?? onReset)(); }} size="lg" className="w-full mt-6 -mb-2 md:mb-1">
            {t('common.done')}
          </Button>
        </>
      );
    }

    let circle: React.ReactNode;
    let title: string;
    let desc: string;
    if (allDone) {
      circle = <GreenCircle><Check /></GreenCircle>;
      title = t('download.receiveCompleteTitle');
      desc = t('download.receivedSuccessfully');
    } else if (active) {
      const connecting = p2pStatus === 'connecting';
      circle = <NeutralCircle><Spinner size="xl" /></NeutralCircle>;
      title = connecting ? t('download.connectingP2P') : t('download.receivingP2P');
      desc = connecting
        ? t('download.connectingToSender')
        : p2pPeerDeviceInfo
          ? t('download.connectedReceiving', { device: p2pPeerDeviceInfo })
          : t('download.receivingPleaseWait');
    } else if (p2pCompletedFileIds.size > 0) {
      circle = <GreenCircle><PauseBarsIcon className="w-9 h-9 text-green-600" /></GreenCircle>;
      title = t('download.awaitingNextSelection');
      desc = t('download.awaitingNextSelectionDesc');
    } else {
      circle = <GreenCircle><Check /></GreenCircle>;
      title = t('download.readyToDownload');
      desc = t('download.checkFileBeforeDownload');
    }

    const p2pRowContent = (fileId: string, fileName: string, fileSize: number, showDownload: boolean) => {
      const done = p2pCompletedFileIds.has(fileId);
      const isActive = p2pActiveFileId === fileId && active;
      return (
        <>
          {done && (
            <div className="flex-shrink-0 mr-3">
              <FileThumbnail source={previews?.[fileId] ?? null} fileName={fileName} size="sm" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className={cn('transition-transform duration-300 ease-out', !isActive && 'translate-y-[7px]')}>
              <TruncatedFilename name={fileName} className="text-sm font-medium text-foreground" />
              <div className="flex items-center justify-between gap-2 mt-0.5 leading-none">
                {done ? (
                  <span className="text-xs font-medium text-green-600">✓ {t('uploadSuccess.completed')}</span>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatFileSize(fileSize)}</span>
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <>
                          {p2pTimeRemaining && <span className="text-xs text-muted-foreground whitespace-nowrap">{p2pTimeRemaining}</span>}
                          <span className="text-xs font-semibold text-primary whitespace-nowrap">{p2pProgress}%</span>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="mt-2 h-1.5">
              <div className={cn('w-full h-full bg-secondary rounded-full overflow-hidden transition-opacity duration-300', isActive ? 'opacity-100' : 'opacity-0')}>
                <div className="bg-primary h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${p2pProgress}%` }} />
              </div>
            </div>
          </div>
          {isActive ? (
            <Hint label={t('download.cancelDownload')}>
              <button
                onClick={handleCancelP2PDownload}
                disabled={p2pStatus === 'processing'}
                className={cn(
                  'flex-shrink-0 self-center ml-1 -mr-1 p-1 rounded-md transition-colors',
                  p2pStatus === 'processing'
                    ? 'text-muted-foreground/30 cursor-not-allowed'
                    : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
                )}
                aria-label={t('download.cancelDownload')}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </Hint>
          ) : (
            showDownload && !done && (
              <Hint label={t('common.download')}>
                <Button onClick={() => startP2PDownload(fileId)} disabled={active} size="icon" aria-label={t('common.download')} className="flex-shrink-0 ml-2 md:h-8 md:w-8">
                  <ArrowDownTrayIcon strokeWidth={2.5} />
                </Button>
              </Hint>
            )
          )}
        </>
      );
    };

    return wrap(
      <>
        <div className="flex-1 flex flex-col justify-center md:flex-row md:items-stretch gap-6 md:gap-8 min-h-0">
          <div className="flex flex-col items-center justify-center text-center md:flex-1">
            {circle}
            <h2 className="text-2xl font-bold text-foreground mb-1.5">{title}</h2>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
          <div className="md:flex-1 flex flex-col min-w-0" style={{ containerType: 'inline-size' }}>
            {fileListHeader}
            <ScrollableFileList
              count={hasFolders ? visibleRowCount : files.length}
              recomputeKey={hasFolders ? Array.from(openFolders).sort().join('|') : undefined}
            >
              {hasFolders ? (
                tree.map((node) => {
                  if (node.kind === 'file') {
                    return (
                      <div key={node.id} data-row className="flex items-center px-3 py-2 bg-muted rounded-lg border border-foreground/[0.09]">
                        {p2pRowContent(node.id, node.name, node.size, true)}
                      </div>
                    );
                  }
                  if (node.children.length === 0) {
                    return <div key={`folder:${node.path}`} data-row><EmptyFolderCard name={node.name} t={t} /></div>;
                  }
                  const isOpen = openFolders.has(node.path);
                  return (
                    <div key={`folder:${node.path}`} className="bg-muted rounded-lg border border-foreground/[0.09] overflow-hidden">
                      <div
                        data-row
                        onClick={() => toggleFolder(node.path)}
                        className="flex items-center px-3 py-3 cursor-pointer can-hover:hover:bg-accent active:bg-accent transition-colors"
                      >
                        <div className="flex-shrink-0 mr-3">
                          <div className="w-11 h-11 rounded bg-background flex items-center justify-center">
                            <FolderIcon className="w-7 h-7 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{node.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('upload.folderItemCount', { count: nodeFileCount(node) })} · {formatFileSize(nodeSize(node))}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                          <ChevronDownIcon className={cn('w-5 h-5 text-muted-foreground/60 transition-transform', isOpen && 'rotate-180')} />
                          <Hint label={t('common.download')}>
                            <Button
                              onClick={(e) => { e.stopPropagation(); downloadFolderAsZip(node.path); }}
                              disabled={active}
                              size="icon"
                              aria-label={t('common.download')}
                              className="md:h-8 md:w-8"
                            >
                              <ArrowDownTrayIcon strokeWidth={2.5} />
                            </Button>
                          </Hint>
                        </div>
                      </div>
                      <Collapsible open={isOpen}>
                        <div className="px-3 pb-3">
                            <div className="border-t border-foreground/[0.08] pt-2.5 space-y-1">
                              <FolderTreeRows
                                nodes={node.children}
                                depth={1}
                                openFolders={openFolders}
                                toggleFolder={toggleFolder}
                                t={t}
                                renderFile={(file, depth) => (
                                  <div data-row className="flex items-center -mx-2.5 px-2.5 py-2 rounded-lg" style={{ marginLeft: `calc(-0.625rem + ${treeIndent(depth)})` }}>
                                    {p2pRowContent(file.id, file.name, file.size, false)}
                                  </div>
                                )}
                              />
                            </div>
                          </div>
                      </Collapsible>
                    </div>
                  );
                })
              ) : (
                files.map((file) => (
                  <div key={file.id} data-row className="flex items-center px-3 py-2 bg-muted rounded-lg border border-foreground/[0.09]">
                    {p2pRowContent(file.id, file.file_name, file.file_size, files.length > 1)}
                  </div>
                ))
              )}
            </ScrollableFileList>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 -mb-2 md:mb-1">
          {allDone ? (
            <Button onClick={() => { closeP2PSession(); (onComplete ?? onReset)(); }} size="lg" className="w-full">
              {t('common.done')}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={() => (files.length > 1 ? startBulkP2PDownload() : startP2PDownload(files[0].id))}
                disabled={active}
                size="lg"
                className="flex-1"
              >
                <span>{files.length > 1 ? t('download.downloadAll') : t('download.downloadFile')}</span>
              </Button>
              {active || p2pCompletedFileIds.size > 0 ? (
                <Button
                  variant="outline"
                  onClick={() => { closeP2PSession(); (onComplete ?? onReset)(); }}
                  disabled={active}
                  size="lg"
                  className="flex-1"
                >
                  {t('common.done')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={onReset}
                  size="lg"
                  className="flex-1"
                >
                  {t('common.back')}
                </Button>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  const multi = files.length > 1;
  const showSelection = multi || hasFolders;
  return wrap(
    <>
      <div className="flex-1 flex flex-col justify-center md:flex-row md:items-stretch gap-6 md:gap-8 min-h-0">
        <div className="flex flex-col items-center justify-center text-center md:flex-1">
          {downloading ? <NeutralCircle><Spinner size="xl" /></NeutralCircle> : <GreenCircle><Check /></GreenCircle>}
          <h2 className="text-2xl font-bold text-foreground mb-1.5">
            {downloaded ? t('download.downloadCompleteTitle') : downloading ? t('download.downloadingP2P') : t('download.readyToDownload')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {downloaded
              ? t('download.downloadComplete')
              : downloading
              ? (downloadAsZip
                  ? (downloadProgress > 0
                      ? t('download.zipReceiving', { percent: downloadProgress })
                      : t('download.zipPreparing'))
                  : (downloadProgress < 50
                      ? t('download.preparing')
                      : t('download.starting')))
              : t('download.checkFileBeforeDownload')}
          </p>
        </div>
        <div className="md:flex-1 flex flex-col min-w-0">
          {showSelection ? (
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-sm font-medium text-muted-foreground truncate">
                {t('download.fileListSelected', { selected: selectedFiles.size, total: files.length })}
              </p>
              <button
                type="button"
                onClick={() => (selectedFiles.size === files.length ? deselectAllFiles() : selectAllFiles())}
                className="flex-shrink-0 text-[11px] text-muted-foreground can-hover:hover:text-foreground active:text-foreground underline"
              >
                {selectedFiles.size === files.length ? t('download.deselectAll') : t('download.selectAll')}
              </button>
            </div>
          ) : (
            fileListHeader
          )}
          <ScrollableFileList
            count={hasFolders ? visibleRowCount : files.length}
            recomputeKey={hasFolders ? Array.from(openFolders).sort().join('|') : undefined}
          >
            {hasFolders ? (
              <>
                {tree.map((node) => {
                  if (node.kind === 'file') {
                    const selected = selectedFiles.has(node.id);
                    return (
                      <div
                        key={node.id}
                        data-row
                        onClick={() => toggleFileSelection(node.id)}
                        className={cn(
                          'flex items-center px-3 py-3 bg-muted rounded-lg border border-foreground/[0.09] cursor-pointer transition-opacity',
                          !selected && 'opacity-50'
                        )}
                      >
                        <Checkbox checked={selected} className="h-5 w-5 rounded-[5px] border-2 flex-shrink-0 mr-3" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openPreview(node.name, node.size, node.id, { previewUrl: node.previewUrl }); }}
                          className="flex-shrink-0 mr-3 rounded overflow-hidden transition-transform can-hover:hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={node.name}
                        >
                          <FileThumbnail source={previews?.[node.id] ?? null} fileName={node.name} size="sm" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <TruncatedFilename name={node.name} className="text-sm font-medium text-foreground" />
                          <p className="text-xs text-muted-foreground">{formatFileSize(node.size)}</p>
                        </div>
                      </div>
                    );
                  }
                  if (node.children.length === 0) {
                    return <div key={`folder:${node.path}`} data-row><EmptyFolderCard name={node.name} t={t} /></div>;
                  }
                  const ids = collectFileIds(node);
                  const allSelected = ids.length > 0 && ids.every((id) => selectedFiles.has(id));
                  const isOpen = openFolders.has(node.path);
                  return (
                    <div
                      key={`folder:${node.path}`}
                      className={cn(
                        'bg-muted rounded-lg border border-foreground/[0.09] overflow-hidden transition-opacity',
                        !allSelected && 'opacity-50'
                      )}
                    >
                      <div
                        data-row
                        onClick={() => toggleFolder(node.path)}
                        className="flex items-center px-3 py-3 cursor-pointer can-hover:hover:bg-accent active:bg-accent transition-colors"
                      >
                        <span
                          onClick={(e) => { e.stopPropagation(); setFilesSelected(ids, !allSelected); }}
                          className="flex-shrink-0 -my-1.5 -ml-1 mr-2 p-1.5 rounded-md cursor-pointer"
                          aria-label={node.name}
                        >
                          <Checkbox checked={allSelected} className="h-5 w-5 rounded-[5px] border-2 pointer-events-none" />
                        </span>
                        <div className="flex-shrink-0 mr-3">
                          <div className="w-11 h-11 rounded bg-background flex items-center justify-center">
                            <FolderIcon className="w-7 h-7 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{node.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('upload.folderItemCount', { count: nodeFileCount(node) })} · {formatFileSize(nodeSize(node))}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleFolder(node.path); }}
                          className="flex-shrink-0 self-center ml-1 -mr-1 p-1 rounded-md can-hover:hover:bg-accent active:bg-accent transition-colors"
                          aria-label={node.name}
                        >
                          <ChevronDownIcon className={cn('w-5 h-5 text-muted-foreground/60 transition-transform', isOpen && 'rotate-180')} />
                        </button>
                      </div>
                      <Collapsible open={isOpen}>
                        <div className="px-3 pb-3">
                            <div className="border-t border-foreground/[0.08] pt-2.5 space-y-2">
                              <FolderTreeRows
                                nodes={node.children}
                                depth={1}
                                openFolders={openFolders}
                                toggleFolder={toggleFolder}
                                t={t}
                                renderFile={(file, depth) => {
                                  return (
                                    <div
                                      data-row
                                      onClick={() => openPreview(file.name, file.size, file.id, { previewUrl: file.previewUrl })}
                                      className="flex items-center gap-3 min-w-0 -mx-2.5 px-2.5 py-2 rounded-lg transition-colors cursor-pointer can-hover:hover:bg-accent active:bg-accent"
                                      style={{ marginLeft: `calc(-0.625rem + ${treeIndent(depth)})` }}
                                    >
                                      <div className="flex-shrink-0">
                                        <FileThumbnail source={previews?.[file.id] ?? null} fileName={file.name} size="sm" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <TruncatedFilename name={file.name} className="text-sm font-medium text-foreground" />
                                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                      </div>
                                    </div>
                                  );
                                }}
                              />
                            </div>
                          </div>
                      </Collapsible>
                    </div>
                  );
                })}
              </>
            ) : (
              files.map((file) => {
                const selected = selectedFiles.has(file.id);
                return (
                  <div
                    key={file.id}
                    onClick={multi ? () => toggleFileSelection(file.id) : undefined}
                    className={cn(
                      'flex items-center px-3 py-3 bg-muted rounded-lg border border-foreground/[0.09]',
                      multi && 'cursor-pointer transition-opacity',
                      multi && !selected && 'opacity-50'
                    )}
                  >
                    {multi && (
                      <Checkbox checked={selected} className="h-5 w-5 rounded-[5px] border-2 flex-shrink-0 mr-3" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openPreview(file.file_name, file.file_size, file.id, { previewUrl: file.preview_url }); }}
                      className="flex-shrink-0 mr-3 rounded overflow-hidden transition-transform can-hover:hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={file.file_name}
                    >
                      <FileThumbnail source={previews?.[file.id] ?? null} fileName={file.file_name} size="sm" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <TruncatedFilename name={file.file_name} className="text-sm font-medium text-foreground" />
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </ScrollableFileList>
        </div>
      </div>
      <div className={cn('mt-6 flex flex-col gap-2', downloaded ? '-mb-2 md:mb-1' : '-mb-5 md:-mb-2')}>
        {downloaded ? (
          <Button onClick={() => (onComplete ?? onReset)()} size="lg" className="w-full">
            {t('common.done')}
          </Button>
        ) : showSelection ? (() => {
          const selectedTotalSize = files
            .filter((f) => selectedFiles.has(f.id))
            .reduce((sum, f) => sum + f.file_size, 0);
          const canZip = selectedFiles.size > 1 && selectedTotalSize < 500 * 1024 * 1024;
          const hasSelection = selectedFiles.size > 0;
          return (
            <div className="flex gap-2">
              <Button onClick={() => handleDownload(true)} disabled={downloading || !canZip} size="lg" className="flex-1">
                <span>{t('download.zipDownload')}</span>
              </Button>
              <Button
                onClick={() => handleDownload(false)}
                disabled={downloading || !hasSelection}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                <span>{t('download.individualDownload')}</span>
              </Button>
            </div>
          );
        })() : (
          <Button onClick={() => handleDownload(false)} disabled={downloading} size="lg" className="w-full">
            {downloading ? (
              <Spinner size="sm" className="text-primary-foreground" />
            ) : (
              <span>{t('download.downloadFile')}</span>
            )}
          </Button>
        )}
        {!downloaded && (
          <Button
            variant="ghost"
            size="sm"
            className="self-center text-muted-foreground can-hover:hover:text-foreground active:text-foreground"
            onClick={onReset}
          >
            {t('common.back')}
          </Button>
        )}
      </div>
    </>,
    'ready'
  );
};

export default BoxDownloadView;
