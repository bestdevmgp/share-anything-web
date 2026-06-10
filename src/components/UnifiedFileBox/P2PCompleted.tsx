import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
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
      className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center"
      onClick={(e) => e.stopPropagation()}
    >
      <CheckCircleIcon className="w-12 h-12 text-primary mb-3" />
      <p className="text-foreground font-semibold mb-1">
        {t('unifiedBox.p2pCompletedTitle')}
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        {t('unifiedBox.p2pCompletedSummary', { count: fileCount })}
        {peerDeviceInfo && ` · ${peerDeviceInfo}`}
      </p>
      <Button onClick={onNew}>{t('unifiedBox.p2pNewTransferButton')}</Button>
    </div>
  );
};

export default P2PCompleted;
