import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import FileThumbnail from './FileThumbnail';
import { formatFileSize } from '../utils/format';
import { useTranslation } from '../i18n';

interface Props {
  fileName: string;
  fileSize: number;
  progress: number;
  timeRemaining?: string;
  /** Override the right-side label (replaces "%" + time). Use for "completed", "waiting", etc. */
  statusText?: string;
  /** Show cancel button. Omit to hide. */
  onCancel?: () => void;
}

const UploadProgressRow: React.FC<Props> = ({
  fileName,
  fileSize,
  progress,
  timeRemaining,
  statusText,
  onCancel,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center px-3 py-2.5 bg-muted rounded-lg border border-foreground/[0.09]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex-shrink-0 mr-3">
        <FileThumbnail source={null} fileName={fileName} size="sm" />
      </div>
      <div className="flex-1 min-w-0 mr-3">
        <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</span>
          <div className="flex items-center gap-2">
            {statusText ? (
              <span className="text-xs text-muted-foreground">{statusText}</span>
            ) : (
              <>
                {timeRemaining && (
                  <span className="text-xs text-muted-foreground">{timeRemaining}</span>
                )}
                <span className="text-xs font-semibold text-primary">{progress}%</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center h-4 mt-0.5">
          <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      {onCancel && (
        <div className="flex-shrink-0">
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg transition-colors text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:bg-foreground/10 active:text-muted-foreground active:bg-foreground/10"
            title={t('common.cancel')}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadProgressRow;
