import React from 'react';
import {
  ArrowDownTrayIcon,
  ArchiveBoxIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { FileListResponse } from '../../types';
import { formatFileSize } from '../../utils/format';
import UploadProgressRow from '../UploadProgressRow';
import FileThumbnail from '../FileThumbnail';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';

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
    <path d="M5 13l4 4L19 7" />
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
  t,
}) => {
  const wrap = (children: React.ReactNode) => (
    <div
      className="flex-1 flex flex-col px-6 md:px-8 py-8 animate-in fade-in-0 duration-300"
      onClick={(e) => e.stopPropagation()}
    >
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
        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-500/15 mb-4">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1.5">{errorTitle}</h2>
        <p className="text-sm text-muted-foreground">{errorDesc}</p>
        <Button variant="outline" size="lg" className="w-full max-w-[280px] mt-6" onClick={onReset}>
          {t('common.back')}
        </Button>
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
        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-6 md:gap-8 min-h-0">
          <div className="flex flex-col items-center justify-center text-center md:flex-1">
            {circle}
            <h2 className="text-2xl font-bold text-foreground mb-1.5">{title}</h2>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
          <div className="md:flex-1 flex flex-col min-w-0">
            {fileListHeader}
            <div className="space-y-2 overflow-y-auto max-h-[200px] md:max-h-[284px] pr-0.5">
              {files.map((file) => {
                const done = p2pCompletedFileIds.has(file.id);
                const isActive = p2pActiveFileId === file.id && active;
                const pct = done ? 100 : isActive ? p2pProgress : 0;
                let statusText: string | undefined;
                if (done) statusText = t('uploadSuccess.completed');
                else if (!isActive) statusText = t('uploadSuccess.waiting');
                return (
                  <UploadProgressRow
                    key={file.id}
                    fileName={file.file_name}
                    fileSize={file.file_size}
                    progress={pct}
                    timeRemaining={isActive ? p2pTimeRemaining : undefined}
                    statusText={statusText}
                  />
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-6">
          {allDone ? (
            <Button onClick={onReset} size="lg" className="w-full">
              {t('common.done')}
            </Button>
          ) : active ? (
            <Button variant="outline" onClick={handleCancelP2PDownload} size="lg" className="w-full">
              <XMarkIcon className="w-5 h-5" />
              <span>{t('download.cancelDownload')}</span>
            </Button>
          ) : (
            <Button
              onClick={() => (files.length > 1 ? startBulkP2PDownload() : startP2PDownload(files[0].id))}
              size="lg"
              className="w-full"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span>{files.length > 1 ? t('download.downloadAll') : t('download.downloadFile')}</span>
            </Button>
          )}
        </div>
      </>
    );
  }

  // Server transfer
  const multi = files.length > 1;
  return wrap(
    <>
      <div className="flex-1 flex flex-col md:flex-row md:items-center gap-6 md:gap-8 min-h-0">
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
          {fileListHeader}
          <div className="space-y-2 overflow-y-auto max-h-[200px] md:max-h-[284px] pr-0.5">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center px-3 py-2.5 bg-muted rounded-lg border border-foreground/[0.09]"
              >
                <div className="flex-shrink-0 mr-3">
                  <FileThumbnail source={null} fileName={file.file_name} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        {multi ? (
          <div className="flex gap-2">
            <Button onClick={() => handleDownload(true)} disabled={downloading} size="lg" className="flex-1">
              <ArchiveBoxIcon className="w-5 h-5" />
              <span>{t('download.zipDownload')}</span>
            </Button>
            <Button
              onClick={() => handleDownload(false)}
              disabled={downloading}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span>{t('download.individualDownload')}</span>
            </Button>
          </div>
        ) : (
          <Button onClick={() => handleDownload(false)} disabled={downloading} size="lg" className="w-full">
            {downloading ? (
              <Spinner size="sm" className="text-primary-foreground" />
            ) : (
              <ArrowDownTrayIcon className="w-5 h-5" />
            )}
            <span>{t('download.downloadFile')}</span>
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onReset}>
          {t('common.back')}
        </Button>
      </div>
    </>
  );
};

export default BoxDownloadView;
