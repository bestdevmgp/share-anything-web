import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import UploadProgressRow from '../UploadProgressRow';
import { useTranslation } from '../../i18n';
import { useUploadProgress, ProgressInput } from './useUploadProgress';

export type UploadingItem = ProgressInput;

interface Props {
  items: UploadingItem[];
  onCancel: (id: string) => void;
}

const Uploading: React.FC<Props> = ({ items, onCancel }) => {
  const { t } = useTranslation();
  const { rows, overall } = useUploadProgress(items);
  const multi = rows.length > 1;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
      {multi && (
        <div className="flex items-center gap-2 pb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-end gap-2 mb-1">
              {overall.timeRemaining && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {overall.timeRemaining}
                </span>
              )}
              <span className="text-xs font-semibold text-primary whitespace-nowrap">
                {overall.progress}%
              </span>
            </div>
            <div className="pl-2">
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-1000 ease-out rounded-full"
                  style={{ width: `${overall.progress}%` }}
                />
              </div>
            </div>
          </div>
          <button
            onClick={() => rows[0] && onCancel(rows[0].id)}
            className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:bg-foreground/10 active:text-muted-foreground active:bg-foreground/10"
            title={t('common.cancel')}
          >
            <XMarkIcon className="w-5 h-5" />
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
          onCancel={!multi && !uf.completed ? () => onCancel(uf.id) : undefined}
        />
      ))}
    </div>
  );
};

export default Uploading;
