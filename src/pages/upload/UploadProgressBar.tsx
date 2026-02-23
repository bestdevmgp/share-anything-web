import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/button';
import { Spinner } from '../../components/ui/spinner';
import { useTranslation } from '../../i18n';
import TurnstileWidget from '../../components/TurnstileWidget';

export interface UploadProgressBarProps {
  isUploading: boolean;
  transferType: 'server' | 'p2p';
  uploadProgress: number;
  isCompleting: boolean;
  uploadTimeRemaining: string;
  files: File[];
  turnstileToken: string;
  onTurnstileVerify: (token: string) => void;
  onTurnstileError: () => void;
  onTurnstileExpire: () => void;
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
  turnstileToken,
  onTurnstileVerify,
  onTurnstileError,
  onTurnstileExpire,
  onUpload,
  onCancelUpload,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-7">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[22px] md:gap-4">
        {}
        <div className={isUploading && transferType !== 'p2p' ? 'md:hidden' : ''}>
          <TurnstileWidget
            onVerify={onTurnstileVerify}
            onError={onTurnstileError}
            onExpire={onTurnstileExpire}
          />
        </div>

        {isUploading && transferType !== 'p2p' ? (
          <div className="flex-1 md:min-h-[65px] md:flex md:items-center">
            <div className="flex items-center gap-2 w-full pl-1.5">
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {isCompleting ? t('upload.pleaseWait') : t('upload.uploading')}
                  </span>
                  {!isCompleting && (
                    <div className="flex items-center gap-2">
                      {uploadTimeRemaining && (
                        <span className="text-xs text-muted-foreground">{uploadTimeRemaining}</span>
                      )}
                      <span className="text-xs font-semibold text-primary">{uploadProgress}%</span>
                    </div>
                  )}
                </div>
                <div className="bg-secondary rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
              <button
                onClick={onCancelUpload}
                className="p-1 can-hover:hover:bg-accent active:bg-accent rounded transition-colors flex-shrink-0"
                title={t('upload.cancelUpload')}
              >
                <XMarkIcon className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center md:justify-end">
            <Button
              onClick={onUpload}
              disabled={files.length === 0 || !turnstileToken || (isUploading && transferType === 'p2p')}
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
