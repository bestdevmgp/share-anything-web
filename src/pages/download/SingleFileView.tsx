import React from 'react';
import { NavigateFunction } from 'react-router-dom';
import { DocumentIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { FileListResponse, FileListItem } from '../../types';
import { formatFileSize, formatDateTime, isImageFile } from '../../utils/format';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Spinner } from '../../components/ui/spinner';
import FileThumbnail from '../../components/FileThumbnail';
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
  downloadAsZip: boolean;
  loadingPreview: boolean;
  singleFilePreviewUrl: string | null;
  singleFileThumbnail: { url: string | null; loading: boolean };
  handleDownload: (asZip: boolean) => void;
  handleCancelDownload: () => void;
  handleCancelP2PDownload: () => void;
  setP2pEnabled: (value: boolean) => void;
  openPreview: (fileName: string, fileSize: number, fileId: string, blobSource: string) => void;
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
  downloadProgress,
  downloadTimeRemaining,
  downloadAsZip,
  loadingPreview,
  singleFilePreviewUrl,
  singleFileThumbnail,
  handleDownload,
  handleCancelDownload,
  handleCancelP2PDownload,
  setP2pEnabled,
  openPreview,
  navigate,
  t,
  language,
}) => {
  return (
    <div className="flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              isP2PDownload && p2pStatus === 'downloading' ? 'bg-muted border border-border' : 'bg-green-100 dark:bg-green-500/15'
            )}>
              {isP2PDownload && p2pStatus === 'downloading' ? (
                <Spinner size="xl" />
              ) : (
                <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke={isP2PDownload && p2pStatus === 'completed' ? '#16a34a' : '#16a34a'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" className="download-checkmark-path" />
                </svg>
              )}
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">
            {isP2PDownload ? (
              p2pStatus === 'waiting' || p2pStatus === 'connecting' ? t('download.readyToReceive') :
              p2pStatus === 'downloading' ? t('download.downloading') :
              p2pStatus === 'completed' ? t('download.receiveCompleteTitle') :
              t('download.readyToDownload')
            ) : t('download.readyToDownload')}
          </h1>
          <p className="text-muted-foreground">
            {isP2PDownload ? (
              p2pStatus === 'downloading' ? (p2pPeerDeviceInfo ? t('download.receivingFrom', { device: p2pPeerDeviceInfo }) : t('download.receivingPleaseWait')) :
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
          <div className="flex justify-center mb-5">
            {loadingPreview ? (
              <div className="w-24 h-24 bg-muted rounded-full border border-border flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : singleFilePreviewUrl && isImageFile(file.file_name) ? (
              <div
                className="max-w-full max-h-96 overflow-hidden rounded-2xl cursor-pointer"
                onClick={() => openPreview(file.file_name, file.file_size, file.id, singleFilePreviewUrl!)}
              >
                <img
                  src={singleFilePreviewUrl}
                  alt={file.file_name}
                  className="max-w-full max-h-96 object-contain"
                />
              </div>
            ) : singleFilePreviewUrl && singleFileThumbnail.url ? (
              <div
                className="max-w-full max-h-[28rem] overflow-hidden rounded-2xl cursor-pointer"
                onClick={() => openPreview(file.file_name, file.file_size, file.id, singleFilePreviewUrl!)}
              >
                <img
                  src={singleFileThumbnail.url}
                  alt={file.file_name}
                  className="max-w-full max-h-[28rem] object-contain rounded-2xl"
                />
              </div>
            ) : singleFilePreviewUrl ? (
              <div
                className="cursor-pointer"
                onClick={() => openPreview(file.file_name, file.file_size, file.id, singleFilePreviewUrl!)}
              >
                <FileThumbnail source={singleFilePreviewUrl} fileName={file.file_name} size="md" />
              </div>
            ) : (
              <div className="w-24 h-24 bg-muted rounded-full border border-border flex items-center justify-center">
                <DocumentIcon className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-3 text-center break-all">
              {file.file_name}
            </h2>
            {fileList.description && (
              <p className="text-muted-foreground text-center mb-6 break-words whitespace-pre-wrap">
                {fileList.description}
              </p>
            )}
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">{t('download.fileSize')}</span>
              <span className="font-semibold text-foreground">{formatFileSize(file.file_size)}</span>
            </div>
            {fileList.description && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">{t('download.uploader')}</span>
                <span className="font-semibold text-foreground">{t('common.anonymousUser')}</span>
              </div>
            )}
            {!isP2PDownload && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('download.expiresAt')}</span>
                <span className="font-semibold text-foreground">{formatDateTime(fileList.expires_at, language)}</span>
              </div>
            )}
          </div>

          <div className="">
            {isP2PDownload ? (
              p2pStatus === 'downloading' || p2pStatus === 'connecting' ? (
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">
                          {p2pStatus === 'connecting' ? t('download.connectingP2P') : t('download.downloadingP2P')}
                        </span>
                        {p2pStatus === 'downloading' && (
                          <div className="flex items-center gap-2">
                            {p2pTimeRemaining && (
                              <span className="text-xs text-muted-foreground">{p2pTimeRemaining}</span>
                            )}
                            <span className="text-xs font-semibold text-primary">{p2pProgress}%</span>
                          </div>
                        )}
                      </div>
                      {p2pStatus === 'downloading' && (
                        <Progress value={p2pProgress} className="h-1.5 bg-secondary" />
                      )}
                    </div>
                    <button
                      onClick={handleCancelP2PDownload}
                      className="p-1 hover:bg-accent rounded transition-colors flex-shrink-0"
                      title={t('download.cancelDownload')}
                    >
                      <XMarkIcon className="w-6 h-6 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ) : p2pStatus === 'completed' ? (
                <div className="text-center py-4 text-green-600 font-semibold">
                  ✓ {t('download.receiveCompleteMark')}
                </div>
              ) : (
                <Button
                  onClick={() => setP2pEnabled(true)}
                  size="lg"
                  className="w-full"
                >
                  <ArrowDownTrayIcon />
                  <span>{t('download.startDownload')}</span>
                </Button>
              )
            ) : downloading ? (
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">
                        {downloadProgress === 100 ? t('download.pleaseWait') : t('download.downloadingP2P')}
                      </span>
                      {downloadProgress < 100 && (
                        <div className="flex items-center gap-2">
                          {downloadTimeRemaining && (
                            <span className="text-xs text-muted-foreground">{downloadTimeRemaining}</span>
                          )}
                          <span className="text-xs font-semibold text-primary">{downloadProgress}%</span>
                        </div>
                      )}
                    </div>
                    <Progress value={downloadProgress} className="h-1.5 bg-secondary" />
                  </div>
                  <button
                    onClick={handleCancelDownload}
                    className="p-1 hover:bg-accent rounded transition-colors flex-shrink-0"
                    title={t('download.cancelDownload')}
                  >
                    <XMarkIcon className="w-6 h-6 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => handleDownload(false)}
                size="lg"
                className="w-full"
              >
                <ArrowDownTrayIcon />
                <span>{t('download.downloadFile')}</span>
              </Button>
            )}
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-sm text-muted-foreground hover:text-foreground"
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
