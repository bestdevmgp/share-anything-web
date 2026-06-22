import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import PauseBarsIcon from '../PauseBarsIcon';
import { useTranslation } from '../../i18n';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import FileThumbnail from '../FileThumbnail';
import TruncatedFilename from '../TruncatedFilename';
import ScrollableFileList from './ScrollableFileList';
import { FileProgress } from '../../hooks/useP2PUploader';
import { fileKey } from '../../utils/fileWithPath';
import { formatFileSize } from '../../utils/format';
import { cn } from '../../lib/utils';

type P2PStatus = 'waiting' | 'connected' | 'transferring' | 'waiting_for_next' | 'completed';

interface Props {
  status: P2PStatus;
  files: File[];
  fileProgresses: Map<string, FileProgress>;
  peerDeviceInfo: string | null;
  completed: boolean;
  onCancel: () => void;
  onCancelFile: (fileName: string) => void;
  onNew: () => void;
}

const P2PActiveStage: React.FC<Props> = ({
  status,
  files,
  fileProgresses,
  peerDeviceInfo,
  completed,
  onCancel,
  onCancelFile,
  onNew,
}) => {
  const { t } = useTranslation();

  const allFilesCompleted =
    files.length > 0 && files.every((f) => fileProgresses.get(fileKey(f))?.status === 'completed');
  const anyFileTransferring = files.some(
    (f) => fileProgresses.get(fileKey(f))?.status === 'transferring'
  );

  const overall =
    completed || status === 'completed' || allFilesCompleted
      ? 'completed'
      : anyFileTransferring
        ? 'transferring'
        : status === 'connected'
          ? 'connected'
          : status === 'waiting_for_next'
            ? 'waiting_for_next'
            : 'connected';

  const isDone = overall === 'completed';
  const greenCircle =
    overall === 'connected' || overall === 'waiting_for_next' || overall === 'completed';

  const title =
    overall === 'connected'
      ? t('uploadSuccess.receiverConnected')
      : overall === 'waiting_for_next'
        ? t('uploadSuccess.waitingForNextRequest')
        : overall === 'completed'
          ? t('uploadSuccess.transferComplete')
          : t('uploadSuccess.transferring');

  const description =
    overall === 'connected'
      ? t('uploadSuccess.connectedReadyToDownload', { device: peerDeviceInfo || '' })
      : overall === 'waiting_for_next'
        ? t('uploadSuccess.waitingForNextRequestDesc')
        : overall === 'completed'
          ? t('uploadSuccess.allFilesTransferred')
          : peerDeviceInfo
            ? t('uploadSuccess.connectedTo', { device: peerDeviceInfo })
            : t('uploadSuccess.transferringPleaseWait');

  return (
    <div
      className="flex-1 flex flex-col px-6 md:px-8 py-8 md:py-5 animate-in fade-in-0 duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <style>{`
        .p2p-stage-check {
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
          animation: drawP2PStageCheck 0.6s ease-out forwards;
        }
        @keyframes drawP2PStageCheck { to { stroke-dashoffset: 0; } }
      `}</style>

      <div className="flex-1 flex flex-col md:flex-row md:items-stretch gap-6 md:gap-8 min-h-0">
        <div className="flex flex-col items-center justify-center text-center md:flex-1">
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center mb-4',
              greenCircle
                ? 'bg-green-100 dark:bg-green-500/15'
                : 'bg-card border border-foreground/[0.09]'
            )}
          >
            {overall === 'completed' ? (
              <svg
                className="w-9 h-9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 13l4 4L19 7" className="p2p-stage-check" />
              </svg>
            ) : overall === 'connected' ? (
              <svg
                className="w-9 h-9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            ) : overall === 'waiting_for_next' ? (
              <PauseBarsIcon className="w-9 h-9 text-green-600" />
            ) : (
              <Spinner size="xl" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1.5">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="md:flex-1 flex flex-col min-w-0">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {t('uploadSuccess.fileList', { count: files.length })}
          </p>
          <ScrollableFileList count={files.length}>
            {files.map((file) => {
              const progress = fileProgresses.get(fileKey(file));
              const pct = progress?.progress ?? 0;
              const st = progress?.status ?? 'waiting';
              const isTransferring = st === 'transferring';
              return (
                <div
                  key={fileKey(file)}
                  className="flex items-center px-3 py-2 bg-muted rounded-lg border border-foreground/[0.09]"
                >
                  <div className="flex-shrink-0 mr-3">
                    <FileThumbnail source={file} fileName={file.name} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* text slides up as the bar fades in; bar slot is always reserved so row height never changes */}
                    <div className={cn('transition-transform duration-300 ease-out', !isTransferring && 'translate-y-[7px]')}>
                      <TruncatedFilename name={file.name} className="text-sm font-medium text-foreground" />
                      <div className="flex items-center justify-between gap-2 mt-0.5 leading-none">
                        {st === 'completed' ? (
                          <span className="text-xs font-medium text-green-600">✓ {t('uploadSuccess.completed')}</span>
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatFileSize(file.size)}</span>
                            {isTransferring && (
                              <div className="flex items-center gap-2">
                                {progress?.timeRemaining && (
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">{progress.timeRemaining}</span>
                                )}
                                <span className="text-xs font-semibold text-primary whitespace-nowrap">{pct}%</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 h-1.5">
                      <div className={cn('w-full h-full bg-secondary rounded-full overflow-hidden transition-opacity duration-300', isTransferring ? 'opacity-100' : 'opacity-0')}>
                        <div className="bg-primary h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                  {!isDone && (isTransferring || st === 'waiting') ? (
                    <button
                      onClick={() => onCancelFile(fileKey(file))}
                      className="flex-shrink-0 self-center ml-1 -mr-1 p-1 rounded-md transition-colors text-muted-foreground can-hover:hover:bg-accent active:bg-accent"
                      title={t('common.cancel')}
                      aria-label={t('common.cancel')}
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </ScrollableFileList>
        </div>
      </div>

      <Button
        onClick={isDone ? onNew : onCancel}
        variant={isDone ? 'default' : 'outline'}
        size="lg"
        className="w-full mt-6 -mb-2 md:mb-1"
      >
        {isDone ? t('common.done') : t('unifiedBox.p2pCancelButton')}
      </Button>
    </div>
  );
};

export default P2PActiveStage;
