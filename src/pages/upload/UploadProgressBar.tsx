import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/button';
import { Hint } from '../../components/ui/Hint';
import { Spinner } from '../../components/ui/spinner';
import { useTranslation } from '../../i18n';
import { cn } from '../../lib/utils';

export interface UploadProgressBarProps {
  isUploading: boolean;
  transferType: 'server' | 'p2p';
  uploadProgress: number;
  isCompleting: boolean;
  uploadTimeRemaining: string;
  files: File[];
  onUpload: () => void;
  onCancelUpload: () => void;
}

const UploadProgressBar: React.FC<UploadProgressBarProps> = ({
  isUploading,
  transferType,
  uploadProgress,
  isCompleting,
  uploadTimeRemaining,
  files,
  onUpload,
  onCancelUpload,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-7">
      <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-[22px] md:gap-4">
        {isUploading && transferType !== 'p2p' ? (
          <div key="progress" className="flex-1 min-h-10 md:min-h-[65px] md:flex md:items-center animate-in fade-in-0 duration-300">
            <div className="flex items-center gap-2 w-full pl-1.5">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {t('upload.uploading')}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isCompleting ? (
                      <span className="text-xs text-muted-foreground">{t('upload.pleaseWait')}</span>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground">{uploadTimeRemaining || t('format.calculating')}</span>
                        <span className="text-xs font-semibold text-primary">{uploadProgress}%</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center h-4 mt-0.5">
                  <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-1000 ease-out rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
              <Hint label={t('upload.cancelUpload')}>
                <button
                  onClick={onCancelUpload}
                  disabled={isCompleting}
                  className={cn(
                    'p-1 rounded transition-colors flex-shrink-0',
                    isCompleting ? 'cursor-not-allowed' : 'can-hover:hover:bg-accent active:bg-accent'
                  )}
                  aria-label={t('upload.cancelUpload')}
                >
                  <XMarkIcon className={cn('w-6 h-6', isCompleting ? 'text-muted-foreground/30' : 'text-muted-foreground')} />
                </button>
              </Hint>
            </div>
          </div>
        ) : (
          <div key="idle" className="flex justify-center md:justify-end">
            <Button
              onClick={onUpload}
              disabled={files.length === 0 || (isUploading && transferType === 'p2p')}
              size="lg"
              className="w-full md:w-auto min-w-[120px]"
            >
              {isUploading && transferType === 'p2p' ? <Spinner size="sm" className="text-primary-foreground" /> : (transferType === 'p2p' ? t('upload.transfer') : t('common.upload'))}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadProgressBar;
