import React, { useEffect } from 'react';
import {
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { FileListResponse } from '../../types';
import { formatFileSize } from '../../utils/format';
import FileThumbnail from '../FileThumbnail';
import TruncatedFilename from '../TruncatedFilename';
import ScrollableFileList from './ScrollableFileList';
import StatusIcon from '../StatusIcon';
import { Button } from '../ui/button';
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
  downloading: boolean;
  handleDownload: (asZip: boolean) => void;
  startP2PDownload: (fileId: string) => void;
  startBulkP2PDownload: () => void;
  handleCancelP2PDownload: () => void;
  onReset: () => void;
  onRetry: () => void;
  previews?: Record<string, string>;
  selectedFiles: Set<string>;
  toggleFileSelection: (fileId: string) => void;
  selectAllFiles: () => void;
  deselectAllFiles: () => void;
  openPreview: (fileName: string, fileSize: number, fileId: string, blobSource: string) => void;
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
  handleDownload,
  startP2PDownload,
  startBulkP2PDownload,
  handleCancelP2PDownload,
  onReset,
  onRetry,
  previews,
  selectedFiles,
  toggleFileSelection,
  selectAllFiles,
  deselectAllFiles,
  openPreview,
  t,
}) => {
  const showError = !loading && !!errorTitle;
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

  const wrap = (children: React.ReactNode) => (
    <div
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
      </div>
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

    let circle: React.ReactNode;
    let title: string;
    let desc: string;
    if (allDone) {
      circle = <GreenCircle><Check /></GreenCircle>;
      title = t('download.receiveCompleteTitle');
      desc = t('download.receivedSuccessfully');
    } else if (active) {
      circle = <NeutralCircle><Spinner size="xl" /></NeutralCircle>;
      title = p2pStatus === 'connecting' ? t('download.connectingP2P') : t('download.downloadingP2P');
      desc = p2pPeerDeviceInfo
        ? t('download.connectedToDevice', { device: p2pPeerDeviceInfo })
        : t('download.receivingPleaseWait');
    } else {
      circle = <GreenCircle><Check /></GreenCircle>;
      title = t('download.readyToDownload');
      desc = t('download.checkFileBeforeDownload');
    }

    return wrap(
      <>
        <div className="flex-1 flex flex-col justify-center md:flex-row md:items-stretch gap-6 md:gap-8 min-h-0">
          <div className="flex flex-col items-center justify-center text-center md:flex-1">
            {circle}
            <h2 className="text-2xl font-bold text-foreground mb-1.5">{title}</h2>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
          <div className="md:flex-1 flex flex-col min-w-0">
            {fileListHeader}
            <ScrollableFileList count={files.length}>
              {files.map((file) => {
                const done = p2pCompletedFileIds.has(file.id);
                const isActive = p2pActiveFileId === file.id && active;
                return (
                  <div
                    key={file.id}
                    className="flex items-center px-3 py-2 bg-muted rounded-lg border border-foreground/[0.09]"
                  >
                    {done && (
                      <div className="flex-shrink-0 mr-3">
                        <FileThumbnail source={previews?.[file.id] ?? null} fileName={file.file_name} size="sm" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {/* text slides up as the bar fades in; bar slot is always reserved so row height never changes */}
                      <div className={cn('transition-transform duration-300 ease-out', !isActive && 'translate-y-[7px]')}>
                        <TruncatedFilename name={file.file_name} className="text-sm font-medium text-foreground" />
                        <div className="flex items-center justify-between gap-2 mt-0.5 leading-none">
                          {done ? (
                            <span className="text-xs text-muted-foreground">{t('uploadSuccess.completed')}</span>
                          ) : (
                            <>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{formatFileSize(file.file_size)}</span>
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
                      <button
                        onClick={handleCancelP2PDownload}
                        className="flex-shrink-0 self-center ml-1 -mr-1 p-1 rounded-md transition-colors text-muted-foreground can-hover:hover:bg-accent active:bg-accent"
                        title={t('download.cancelDownload')}
                        aria-label={t('download.cancelDownload')}
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      files.length > 1 && !done && (
                        <Button
                          onClick={() => startP2PDownload(file.id)}
                          disabled={active}
                          size="sm"
                          className="flex-shrink-0 ml-2"
                        >
                          {t('common.download')}
                        </Button>
                      )
                    )}
                  </div>
                );
              })}
            </ScrollableFileList>
          </div>
        </div>
        <div className="mt-6 -mb-4 md:-mb-1 flex flex-col gap-2">
          {allDone ? (
            <Button onClick={onReset} size="lg" className="w-full">
              {t('common.done')}
            </Button>
          ) : !active ? (
            <Button
              onClick={() => (files.length > 1 ? startBulkP2PDownload() : startP2PDownload(files[0].id))}
              size="lg"
              className="w-full"
            >
              <span>{files.length > 1 ? t('download.downloadAll') : t('download.downloadFile')}</span>
            </Button>
          ) : null}
          {!allDone && (
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
      </>
    );
  }

  const multi = files.length > 1;
  return wrap(
    <>
      <div className="flex-1 flex flex-col justify-center md:flex-row md:items-stretch gap-6 md:gap-8 min-h-0">
        <div className="flex flex-col items-center justify-center text-center md:flex-1">
          {downloading ? <NeutralCircle><Spinner size="xl" /></NeutralCircle> : <GreenCircle><Check /></GreenCircle>}
          <h2 className="text-2xl font-bold text-foreground mb-1.5">
            {downloading ? t('download.downloadingP2P') : t('download.readyToDownload')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {downloading ? t('upload.pleaseWait') : t('download.checkFileBeforeDownload')}
          </p>
        </div>
        <div className="md:flex-1 flex flex-col min-w-0">
          {multi ? (
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
          <ScrollableFileList count={files.length}>
            {files.map((file) => {
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
                    <Checkbox checked={selected} className="h-5 w-5 rounded-md border-2 flex-shrink-0 mr-3" />
                  )}
                  {previews?.[file.id] ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPreview(file.file_name, file.file_size, file.id, previews[file.id]);
                      }}
                      className="flex-shrink-0 mr-3 rounded-lg overflow-hidden transition-transform can-hover:hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={file.file_name}
                    >
                      <FileThumbnail source={previews[file.id]} fileName={file.file_name} size="sm" />
                    </button>
                  ) : (
                    <div className="flex-shrink-0 mr-3">
                      <FileThumbnail source={null} fileName={file.file_name} size="sm" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <TruncatedFilename name={file.file_name} className="text-sm font-medium text-foreground" />
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                  </div>
                </div>
              );
            })}
          </ScrollableFileList>
        </div>
      </div>
      <div className="mt-6 -mb-4 md:-mb-1 flex flex-col gap-2">
        {multi ? (() => {
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
            {downloading && <Spinner size="sm" className="text-primary-foreground" />}
            <span>{t('download.downloadFile')}</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="self-center text-muted-foreground can-hover:hover:text-foreground active:text-foreground"
          onClick={onReset}
        >
          {t('common.back')}
        </Button>
      </div>
    </>
  );
};

export default BoxDownloadView;
