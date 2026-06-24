import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import UploadProgressRow from '../UploadProgressRow';
import { useTranslation } from '../../i18n';
import { formatFileSize } from '../../utils/format';
import { useUploadProgress, ProgressInput } from './useUploadProgress';

export type UploadingItem = ProgressInput;

interface Props {
  items: UploadingItem[];
  onCancel: (id: string) => void;
  onCancelAll: () => void;
}

const Uploading: React.FC<Props> = ({ items, onCancel, onCancelAll }) => {
  const { t } = useTranslation();
  const { rows, overall } = useUploadProgress(items);
  const multi = rows.length > 1;
  const totalSize = items.reduce((sum, it) => sum + (it.fileSize || 0), 0);
  // When every file has finished sending its bytes (overall 100%) but the server is
  // still finalizing, mirror the per-file rows: show "please wait" instead of 100%.
  const allCompleted = rows.length > 0 && rows.every((r) => r.completed);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
      {multi && (
        <div className="flex items-center gap-2 pb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 pl-1.5">
              <span className="text-sm whitespace-nowrap min-w-0 truncate">
                <span className="font-medium text-foreground">
                  {t('upload.fileCountLabel', { count: rows.length })}
                </span>
                <span className="text-muted-foreground ml-1.5">{formatFileSize(totalSize)}</span>
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {allCompleted ? (
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {t('upload.pleaseWait')}
                  </span>
                ) : (
                  <>
                    {overall.timeRemaining && (
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {overall.timeRemaining}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-primary whitespace-nowrap">
                      {overall.progress}%
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="pl-1.5">
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-1000 ease-out rounded-full"
                  style={{ width: `${overall.progress}%` }}
                />
              </div>
            </div>
          </div>
          <button
            onClick={onCancelAll}
            disabled={allCompleted}
            className={`flex-shrink-0 -mr-1 p-1 rounded-md transition-colors ${
              allCompleted
                ? 'text-muted-foreground/30 cursor-not-allowed'
                : 'text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:bg-foreground/10 active:text-muted-foreground active:bg-foreground/10'
            }`}
            title={t('common.cancel')}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}
      {rows.map((uf) => (
        <UploadProgressRow
          key={uf.id}
          fileName={uf.fileName}
          fileSize={uf.fileSize}
          progress={uf.progress}
          timeRemaining={uf.timeRemaining}
          statusText={uf.completed ? t('upload.pleaseWait') : undefined}
          onCancel={() => onCancel(uf.id)}
          cancelDisabled={uf.completed}
        />
      ))}
    </div>
  );
};

export default Uploading;
