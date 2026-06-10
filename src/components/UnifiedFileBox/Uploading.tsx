import React from 'react';
import UploadProgressRow from '../UploadProgressRow';
import { useTranslation } from '../../i18n';

export interface UploadingItem {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  timeRemaining: string;
  completed: boolean;
}

interface Props {
  items: UploadingItem[];
  onCancel: (id: string) => void;
}

const Uploading: React.FC<Props> = ({ items, onCancel }) => {
  const { t } = useTranslation();
  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
      {items.map((uf) => (
        <UploadProgressRow
          key={uf.id}
          fileName={uf.fileName}
          fileSize={uf.fileSize}
          progress={uf.progress}
          timeRemaining={uf.timeRemaining}
          statusText={uf.completed ? t('upload.pleaseWait') : undefined}
          onCancel={uf.completed ? undefined : () => onCancel(uf.id)}
        />
      ))}
    </div>
  );
};

export default Uploading;
