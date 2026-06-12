import React from 'react';
import { useTranslation } from '../../i18n';
import { Button } from '../ui/button';

interface Props {
  fileCount: number;
  peerDeviceInfo: string | null;
  onNew: () => void;
}

const P2PCompleted: React.FC<Props> = ({ fileCount, peerDeviceInfo, onNew }) => {
  const { t } = useTranslation();
  return (
    <div
      className="flex-1 flex flex-col px-6 md:px-8 py-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <style>{`
        .p2p-checkmark-path {
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
          animation: drawP2PCheck 0.6s ease-out forwards;
        }
        @keyframes drawP2PCheck {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-500/15 mb-4">
          <svg
            className="w-9 h-9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#16a34a"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4L19 7" className="p2p-checkmark-path" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1.5">
          {t('uploadSuccess.transferComplete')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('uploadSuccess.allFilesTransferred')}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1.5">
          {t('unifiedBox.p2pCompletedSummary', { count: fileCount })}
          {peerDeviceInfo && ` · ${peerDeviceInfo}`}
        </p>
      </div>

      <Button onClick={onNew} size="lg" className="w-full mt-6">
        {t('unifiedBox.p2pNewTransferButton')}
      </Button>
    </div>
  );
};

export default P2PCompleted;
