import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import UploadProgressRow from '../UploadProgressRow';
import { useTranslation } from '../../i18n';
import { FileProgress } from '../../hooks/useP2PUploader';

interface Props {
  files: File[];
  fileProgresses: Map<string, FileProgress>;
  peerDeviceInfo: string | null;
  onCancel: () => void;
}

const P2PTransferring: React.FC<Props> = ({ files, fileProgresses, peerDeviceInfo, onCancel }) => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col" onClick={(e) => e.stopPropagation()}>
      <div className="px-4 pt-3 pb-2 flex items-center justify-between flex-shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {t('unifiedBox.p2pTransferringTitle')}
          </p>
          {peerDeviceInfo && (
            <p className="text-xs text-muted-foreground truncate">
              {t('unifiedBox.p2pPeerInfo', { device: peerDeviceInfo })}
            </p>
          )}
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:bg-foreground/10"
          title={t('common.cancel')}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-2">
        {files.map((file) => {
          const progress = fileProgresses.get(file.name);
          const pct = progress?.progress ?? 0;
          const status = progress?.status ?? 'waiting';
          const timeRemaining = progress?.timeRemaining;
          let statusText: string | undefined;
          if (status === 'completed') statusText = t('unifiedBox.p2pCompleted');
          else if (status !== 'transferring') statusText = t('unifiedBox.p2pWaiting');
          return (
            <UploadProgressRow
              key={file.name}
              fileName={file.name}
              fileSize={file.size}
              progress={pct}
              timeRemaining={timeRemaining}
              statusText={statusText}
            />
          );
        })}
      </div>
    </div>
  );
};

export default P2PTransferring;
