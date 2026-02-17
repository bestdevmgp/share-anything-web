import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { FileUploadResponse } from '../types';
import { copyToClipboard, formatDateTime, formatFileSize } from '../utils/format';
import { CheckIcon, ClipboardDocumentIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useP2PUploader } from '../hooks/useP2PUploader';
import FileThumbnail from '../components/FileThumbnail';
import FilePreviewModal from '../components/FilePreviewModal';
import { useTranslation } from '../i18n';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { Spinner } from '../components/ui/spinner';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import { cn } from 'lib/utils';

const UploadSuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useTranslation();

  useEffect(() => {
    document.title = t('uploadSuccess.pageTitle');
  }, [t]);

  const uploadResult = location.state?.uploadResult as FileUploadResponse | undefined;
  const uploadedFiles = location.state?.uploadedFiles as File[] | undefined;
  const uploadedFile = location.state?.uploadedFile as File | undefined;

  const files = useMemo(() => {
    return uploadedFiles || (uploadedFile ? [uploadedFile] : []);
  }, [uploadedFiles, uploadedFile]);

  const [copiedField, setCopiedField] = useState<'code' | 'link' | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const isP2PTransfer = uploadResult?.files?.[0]?.transfer_type === 'p2p';
  const groupShareCode = uploadResult?.share_code || uploadResult?.files?.[0]?.share_code || '';

  const [showFailedModal, setShowFailedModal] = useState(false);

  const { status: p2pStatus, fileProgresses, peerDeviceInfo, connectionFailed, retry, cancelTransfer } = useP2PUploader({
    shareCode: groupShareCode,
    files: files,
    enabled: isP2PTransfer && files.length > 0 && !!uploadResult
  });

  useEffect(() => {
    if (connectionFailed) {
      setShowFailedModal(true);
    }
  }, [connectionFailed]);

  const handleSwitchToServerUpload = () => {
    navigate('/upload', {
      state: {
        fallbackFiles: files,
        fromP2PFallback: true
      }
    });
  };

  const handleRetryP2P = () => {
    setShowFailedModal(false);
    retry();
  };

  useEffect(() => {
    if (!uploadResult) {
      navigate('/upload', { replace: true });
    }
  }, [uploadResult, navigate]);

  if (!uploadResult) {
    return null;
  }

  const downloadUrl = `${window.location.origin}/download/${groupShareCode}`;

  const displayCode = groupShareCode.length === 6
    ? `${groupShareCode.slice(0, 3)} ${groupShareCode.slice(3)}`
    : groupShareCode;

  const handleCopy = async (text: string, field: 'code' | 'link') => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const allFilesCompleted = isP2PTransfer && files.every(file => {
    const progress = fileProgresses.get(file.name);
    return progress?.status === 'completed';
  });

  const anyFileTransferring = isP2PTransfer && files.some(file => {
    const progress = fileProgresses.get(file.name);
    return progress?.status === 'transferring';
  });

  const getOverallStatus = () => {
    if (allFilesCompleted) return 'completed';
    if (anyFileTransferring) return 'transferring';
    if (p2pStatus === 'connected') return 'connected';
    return 'waiting';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="flex items-center justify-center px-4 pt-12 pb-20">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-5">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              !isP2PTransfer || allFilesCompleted || overallStatus === 'connected'
                ? 'bg-green-100 dark:bg-green-500/15'
                : 'bg-muted border border-foreground/[0.09]'
            )}>
              {isP2PTransfer && !allFilesCompleted ? (
                overallStatus === 'connected' ? (
                  <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                ) : (
                  <Spinner size="xl" />
                )
              ) : (
                <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" className="upload-checkmark-path" />
                </svg>
              )}
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">
            {isP2PTransfer ? (
              overallStatus === 'waiting' ? t('uploadSuccess.waitingForReceiver') :
              overallStatus === 'connected' ? t('uploadSuccess.receiverConnected') :
              overallStatus === 'transferring' ? t('uploadSuccess.transferring') :
              t('uploadSuccess.transferComplete')
            ) : t('uploadSuccess.uploadComplete')}
          </h1>
          <p className="text-lg text-muted-foreground">
            {isP2PTransfer ? (
              overallStatus === 'waiting' ? t('uploadSuccess.keepPageOpen') :
              overallStatus === 'connected' ? t('uploadSuccess.connectedReadyToDownload', { device: peerDeviceInfo || '' }) :
              allFilesCompleted ? t('uploadSuccess.allFilesTransferred') :
              peerDeviceInfo ? t('uploadSuccess.connectedTo', { device: peerDeviceInfo }) :
              t('uploadSuccess.transferringPleaseWait')
            ) : t('uploadSuccess.shareCodeOrLink')}
          </p>
        </div>
        <style>{`
          .upload-checkmark-path {
            stroke-dasharray: 20;
            stroke-dashoffset: 20;
            animation: drawUploadCheck 0.6s ease-out forwards;
          }
          @keyframes drawUploadCheck {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}</style>

        <Card className="rounded-3xl border-2 p-8 md:p-12">
          <div className="mb-8">
            <label className="block text-sm font-medium text-muted-foreground mb-3 text-center">
              {t('uploadSuccess.transferCode')}
            </label>
            <div className="relative bg-muted rounded-xl px-4 md:px-8 py-4 md:py-6 mb-4 border border-foreground/[0.09]">
              <p className="text-4xl md:text-5xl font-bold text-center text-foreground break-all" style={{ letterSpacing: '0.1em' }}>
                {displayCode}
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(groupShareCode, 'code')}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2"
                  >
                    {copiedField === 'code' ? (
                      <CheckIcon className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                    ) : (
                      <ClipboardDocumentIcon className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('uploadSuccess.copyCode')}</TooltipContent>
              </Tooltip>
            </div>
            {!isP2PTransfer && uploadResult.files[0]?.expires_at && (
              <p className="text-sm text-muted-foreground text-center">
                {t('uploadSuccess.expires', { dateTime: formatDateTime(uploadResult.files[0].expires_at, language) })}
              </p>
            )}
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              {t('uploadSuccess.shareLink')}
            </label>
            <div className="relative">
              <Input
                type="text"
                value={downloadUrl}
                readOnly
                className="w-full pr-12 bg-muted border-foreground/[0.09] rounded-lg text-sm text-foreground"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(downloadUrl, 'link')}
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                  >
                    {copiedField === 'link' ? (
                      <CheckIcon className="w-5 h-5 text-green-600" />
                    ) : (
                      <ClipboardDocumentIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('uploadSuccess.copyLink')}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex flex-col items-center mb-8">
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              {t('uploadSuccess.qrDownload')}
            </label>
            <div className="p-4 bg-white border-2 border-border rounded-2xl">
              <QRCodeSVG
                value={downloadUrl}
                size={140}
                level="M"
              />
            </div>
          </div>

          {isP2PTransfer && (
            <div className="mb-8">
              {files.length === 1 ? (
                (() => {
                  const file = files[0];
                  const progress = fileProgresses.get(file.name);
                  const isTransferring = progress?.status === 'transferring';
                  const isCompleted = progress?.status === 'completed';

                  if (isCompleted) {
                    return (
                      <>
                        <label className="block text-sm font-medium text-muted-foreground mb-3">
                          {t('common.file')}
                        </label>
                        <div className="p-4 rounded-xl border-2 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-500/15">
                                <CheckIcon className="w-5 h-5 text-green-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate">
                                {file.name}
                              </h4>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                            <div className="flex-shrink-0 text-right mr-4">
                              <span className="text-sm text-green-600 font-medium">{t('uploadSuccess.completed')}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  }

                  if (isTransferring || p2pStatus === 'connected') {
                    return (
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                {isTransferring ? t('uploadSuccess.sending') : t('uploadSuccess.connecting')}
                              </span>
                              {isTransferring && (
                                <div className="flex items-center gap-2">
                                  {progress?.timeRemaining && (
                                    <span className="text-xs text-muted-foreground">{progress.timeRemaining}</span>
                                  )}
                                  <span className="text-xs font-semibold text-primary">{progress?.progress || 0}%</span>
                                </div>
                              )}
                            </div>
                            {isTransferring && (
                              <Progress
                                value={progress?.progress || 0}
                                className="h-1.5 bg-secondary"
                              />
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => cancelTransfer(file.name)}
                            className="flex-shrink-0 can-hover:hover:bg-accent active:bg-accent"
                            title={t('uploadSuccess.cancelTransfer')}
                          >
                            <XMarkIcon className="w-6 h-6 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <>
                      <label className="block text-sm font-medium text-muted-foreground mb-3">
                        {t('common.file')}
                      </label>
                      <div
                        className="p-4 rounded-xl border-2 bg-muted border-foreground/[0.09] cursor-pointer can-hover:hover:bg-accent active:bg-accent transition-colors"
                        onClick={() => setPreviewFile(file)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <FileThumbnail source={file} fileName={file.name} size="sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-foreground truncate">
                              {file.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                          <div className="flex-shrink-0 text-right mr-4">
                            <span className="text-sm text-muted-foreground/60">{t('uploadSuccess.waiting')}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()
              ) : (
                <>
                  <label className="block text-sm font-medium text-muted-foreground mb-3">
                    {t('uploadSuccess.fileList', { count: files.length })}
                  </label>
                  <div className="space-y-3">
                    {files.map((file) => {
                      const progress = fileProgresses.get(file.name);
                      const isTransferring = progress?.status === 'transferring';
                      const isCompleted = progress?.status === 'completed';

                      return (
                        <div
                          key={file.name}
                          className={cn(
                            'p-4 rounded-xl border-2 transition-all',
                            isTransferring ? 'bg-muted border-primary' :
                            isCompleted ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30' :
                            'bg-muted border-foreground/[0.09] cursor-pointer can-hover:hover:bg-accent active:bg-accent'
                          )}
                          onClick={() => {
                            if (!isTransferring && !isCompleted) setPreviewFile(file);
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {isCompleted ? (
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-500/15">
                                  <CheckIcon className="w-5 h-5 text-green-600" />
                                </div>
                              ) : (
                                <FileThumbnail source={file} fileName={file.name} size="sm" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate">
                                {file.name}
                              </h4>
                              {isTransferring ? (
                                <div className="mt-1.5">
                                  <Progress
                                    value={progress?.progress || 0}
                                    className="h-1.5 bg-muted"
                                  />
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                              )}
                            </div>

                            <div className="flex-shrink-0 text-right">
                              {isCompleted ? (
                                <span className="text-sm text-green-600 font-medium mr-4">{t('uploadSuccess.completed')}</span>
                              ) : isTransferring ? (
                                <div className="flex items-center gap-2 mr-1">
                                  {progress?.timeRemaining && (
                                    <span className="text-xs text-muted-foreground">{progress.timeRemaining}</span>
                                  )}
                                  <span className="text-xs font-semibold text-primary">{progress?.progress || 0}%</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => cancelTransfer(file.name)}
                                    className="h-8 w-8 can-hover:hover:bg-accent active:bg-accent"
                                    title={t('uploadSuccess.cancelTransfer')}
                                  >
                                    <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground/60 mr-4">{t('uploadSuccess.waiting')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

        </Card>

        <div className="mt-10">
          <Button
            onClick={() => navigate('/')}
            size="lg"
            className="w-full"
          >
            {t('common.done')}
          </Button>
        </div>
      </div>

      <Dialog open={showFailedModal} onOpenChange={setShowFailedModal}>
        <DialogContent className="max-w-[30rem] rounded-2xl p-6 md:p-8">
          <DialogHeader className="text-center sm:text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-500/15 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <DialogTitle className="text-xl font-bold text-foreground text-center">
              {t('uploadSuccess.p2pConnectionFailed')}
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed">
              {t('uploadSuccess.p2pConnectionFailedDesc')}
              <br />
              {t('uploadSuccess.switchToServer')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              onClick={handleRetryP2P}
              className="flex-1"
            >
              {t('common.retry')}
            </Button>
            <Button
              onClick={handleSwitchToServerUpload}
              className="flex-1"
            >
              {t('common.switchBtn')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {previewFile && (
        <FilePreviewModal
          file={{
            fileName: previewFile.name,
            fileSize: previewFile.size,
            source: previewFile,
          }}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default UploadSuccessPage;
