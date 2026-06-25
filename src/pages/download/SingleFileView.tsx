import React from 'react';
import { NavigateFunction } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { FileListResponse, FileListItem } from '../../types';
import { formatFileSize, formatDateTime } from '../../utils/format';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

import { Spinner } from '../../components/ui/spinner';
import FileThumbnail from '../../components/FileThumbnail';
import TruncatedFilename from '../../components/TruncatedFilename';
import { Hint } from '../../components/ui/Hint';
import { cn } from 'lib/utils';
import { Language } from '../../context/LanguageContext';

export interface SingleFileViewProps {
  file: FileListItem;
  fileList: FileListResponse;
  isP2PDownload: boolean;
  p2pStatus: string;
  p2pProgress: number;
  p2pTimeRemaining: string;
  p2pPeerDeviceInfo: string | null;
  downloading: boolean;
  downloadProgress: number;
  downloadTimeRemaining: string;
  loadingPreview: boolean;
  singleFilePreviewUrl: string | null;
  singleFileThumbnail: { url: string | null; loading: boolean };
  handleDownload: (asZip: boolean) => void;
  handleCancelDownload: () => void;
  handleCancelP2PDownload: () => void;
  closeP2PSession?: () => void;
  setP2pEnabled: (value: boolean) => void;
  openPreview: (fileName: string, fileSize: number, fileId: string, opts?: { previewUrl?: string; preloadedSource?: string }) => void;
  navigate: NavigateFunction;
  t: (key: string, params?: Record<string, string | number>) => string;
  language: Language;
}

const SingleFileView: React.FC<SingleFileViewProps> = ({
  file,
  fileList,
  isP2PDownload,
  p2pStatus,
  p2pProgress,
  p2pTimeRemaining,
  p2pPeerDeviceInfo,
  downloading,
  singleFilePreviewUrl,
  handleDownload,
  handleCancelP2PDownload,
  closeP2PSession,
  setP2pEnabled,
  openPreview,
  navigate,
  t,
  language,
}) => {
  return (
    <div className="flex items-center justify-center px-4 pt-12 pb-20">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              isP2PDownload && (p2pStatus === 'downloading' || p2pStatus === 'processing') ? 'bg-card border border-foreground/[0.09]' : 'bg-green-100 dark:bg-green-500/15'
            )}>
              {isP2PDownload && (p2pStatus === 'downloading' || p2pStatus === 'processing') ? (
                <Spinner size="xl" />
              ) : isP2PDownload && p2pStatus !== 'completed' ? (
                <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              ) : (
                <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" className="download-checkmark-path" />
                </svg>
              )}
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">
            {isP2PDownload ? (
              p2pStatus === 'waiting' || p2pStatus === 'connecting' ? t('download.readyToReceive') :
              p2pStatus === 'downloading' || p2pStatus === 'processing' ? t('download.downloading') :
              p2pStatus === 'completed' ? t('download.receiveCompleteTitle') :
              t('download.readyToDownload')
            ) : t('download.readyToDownload')}
          </h1>
          <p className="text-muted-foreground">
            {isP2PDownload ? (
              p2pStatus === 'downloading' || p2pStatus === 'processing' ? (p2pPeerDeviceInfo ? t('download.receivingFrom', { device: p2pPeerDeviceInfo }) : t('download.receivingPleaseWait')) :
              p2pStatus === 'completed' ? t('download.receivedSuccessfully') :
              p2pPeerDeviceInfo ? t('download.connectedToDevice', { device: p2pPeerDeviceInfo }) : t('download.connectionSuccess')
            ) : t('download.checkFileBeforeDownload')}
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

        <Card className="rounded-3xl border-2 p-6 md:p-8">
          <div className="flex items-center gap-4 p-3 bg-muted rounded-2xl border border-foreground/[0.09]">
            {singleFilePreviewUrl ? (
              <button
                type="button"
                onClick={() => openPreview(file.file_name, file.file_size, file.id, { preloadedSource: singleFilePreviewUrl })}
                className="flex-shrink-0 rounded-xl overflow-hidden transition-transform can-hover:hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={file.file_name}
              >
                <FileThumbnail source={singleFilePreviewUrl} fileName={file.file_name} size="md" />
              </button>
            ) : (
              <div className="flex-shrink-0">
                <FileThumbnail source={null} fileName={file.file_name} size="md" />
              </div>
            )}
            <div className={cn('flex-1 min-w-0', isP2PDownload && p2pStatus !== 'downloading' && p2pStatus !== 'processing' && 'py-[7px]')}>
              <TruncatedFilename name={file.file_name} className="text-base font-semibold text-foreground leading-tight" />
              <div className="flex items-center justify-between gap-2 mt-0.5 leading-none">
                <span className="text-sm text-muted-foreground whitespace-nowrap">{formatFileSize(file.file_size)}</span>
                {isP2PDownload && (p2pStatus === 'downloading' || p2pStatus === 'processing') ? (
                  <div className="flex items-center gap-2">
                    {p2pStatus === 'processing' ? (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{t('upload.pleaseWait')}</span>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{p2pTimeRemaining || t('format.calculating')}</span>
                        <span className="text-xs font-semibold text-primary whitespace-nowrap">{p2pProgress}%</span>
                      </>
                    )}
                  </div>
                ) : isP2PDownload && p2pStatus === 'connecting' ? (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{t('download.connectingP2P')}</span>
                ) : null}
              </div>
              {isP2PDownload && (p2pStatus === 'downloading' || p2pStatus === 'processing') && (
                <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden mt-2">
                  <div className="bg-primary h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${p2pProgress}%` }} />
                </div>
              )}
            </div>
            {isP2PDownload && (p2pStatus === 'downloading' || p2pStatus === 'connecting' || p2pStatus === 'processing') && (
              <Hint label={t('download.cancelDownload')}>
                <button
                  onClick={handleCancelP2PDownload}
                  disabled={p2pStatus === 'processing'}
                  className={cn(
                    'flex-shrink-0 self-center -mr-1 p-1 rounded-md transition-colors',
                    p2pStatus === 'processing' ? 'cursor-not-allowed' : 'can-hover:hover:bg-accent active:bg-accent'
                  )}
                  aria-label={t('download.cancelDownload')}
                >
                  <XMarkIcon className={cn('w-4 h-4', p2pStatus === 'processing' ? 'text-muted-foreground/30' : 'text-muted-foreground')} />
                </button>
              </Hint>
            )}
          </div>

          {!isP2PDownload && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              {t('uploadSuccess.expires', { dateTime: formatDateTime(fileList.expires_at, language) })}
            </p>
          )}

          {fileList.description && (
            <div className="mt-4 p-3 bg-muted/60 rounded-xl border border-foreground/[0.09]">
              <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">
                {fileList.description}
              </p>
            </div>
          )}

          <div className="mt-6">
            {isP2PDownload ? (
              p2pStatus === 'downloading' || p2pStatus === 'connecting' || p2pStatus === 'processing' ? null : p2pStatus === 'completed' ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="text-center text-green-600 font-semibold">
                    ✓ {t('download.receiveCompleteMark')}
                  </div>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => { closeP2PSession?.(); navigate('/'); }}
                  >
                    {t('common.done')}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setP2pEnabled(true)}
                  size="lg"
                  className="w-full"
                >
                  <span>{t('download.startDownload')}</span>
                </Button>
              )
            ) : downloading ? (
              <Button size="lg" className="w-full" disabled>
                <Spinner size="sm" className="text-primary-foreground" />
                <span>{t('download.downloadingP2P')}</span>
              </Button>
            ) : (
              <Button
                onClick={() => handleDownload(false)}
                size="lg"
                className="w-full"
              >
                <span>{t('download.downloadFile')}</span>
              </Button>
            )}
          </div>

          <div className="mt-3 -mb-2 md:-mb-4 text-center">
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

export default SingleFileView;
