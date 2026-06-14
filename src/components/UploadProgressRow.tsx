import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import FileThumbnail from './FileThumbnail';
import TruncatedFilename from './TruncatedFilename';
import { formatFileSize } from '../utils/format';
import { useTranslation } from '../i18n';

interface Props {
  fileName: string;
  fileSize: number;
  progress: number;
  timeRemaining?: string;
  statusText?: string;
  onCancel?: () => void;
  hideThumbnail?: boolean;
}

const UploadProgressRow: React.FC<Props> = ({
  fileName,
  fileSize,
  progress,
  timeRemaining,
  statusText,
  onCancel,
  hideThumbnail,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center px-3 py-[11px] bg-muted rounded-lg border border-foreground/[0.09]"
      onClick={(e) => e.stopPropagation()}
    >
      {!hideThumbnail && (
        <div className="flex-shrink-0 mr-3">
          <FileThumbnail source={null} fileName={fileName} size="sm" />
        </div>
      )}
      <div className="flex-1 min-w-0 mr-2">
        <TruncatedFilename name={fileName} className="text-sm font-medium text-foreground" />
        <div className="flex items-center justify-between gap-2 mt-0.5 leading-none">
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
        <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden mt-2">
          <div
            className="bg-primary h-full transition-all duration-1000 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {onCancel && (
        <div className="flex-shrink-0">
          <button
            onClick={onCancel}
            className="-mr-1 p-1 rounded-md transition-colors text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:bg-foreground/10 active:text-muted-foreground active:bg-foreground/10"
            title={t('common.cancel')}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadProgressRow;
