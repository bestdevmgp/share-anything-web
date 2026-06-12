import React from 'react';
import { useTranslation } from '../../i18n';
import { Button } from '../ui/button';

interface Props {
  fileCount: number;
  peerDeviceInfo: string | null;
  onCancel: () => void;
}

const P2PConnected: React.FC<Props> = ({ fileCount, peerDeviceInfo, onCancel }) => {
  const { t } = useTranslation();
  return (
    <div
      className="flex-1 flex flex-col px-6 md:px-8 py-8 animate-in fade-in-0 duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-500/15 mb-4">
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
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1.5">
          {t('uploadSuccess.receiverConnected')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {peerDeviceInfo
            ? t('uploadSuccess.connectedReadyToDownload', { device: peerDeviceInfo })
            : t('uploadSuccess.transferringPleaseWait')}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1.5">
          {t('unifiedBox.p2pFileCount', { count: fileCount })}
        </p>
      </div>

      <Button variant="outline" onClick={onCancel} size="lg" className="w-full mt-6">
        {t('unifiedBox.p2pCancelButton')}
      </Button>
    </div>
  );
};

export default P2PConnected;
