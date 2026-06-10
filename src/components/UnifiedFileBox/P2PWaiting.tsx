import React from 'react';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';
import { Spinner } from '../ui/spinner';
import { Button } from '../ui/button';
import CopyButton from '../CopyButton';
import { toast } from '../../context/ToastContext';

interface Props {
  shareCode: string;
  fileCount: number;
  onCancel: () => void;
}

const P2PWaiting: React.FC<Props> = ({ shareCode, fileCount, onCancel }) => {
  const { t } = useTranslation();
  const url = `${window.location.origin}/download/${shareCode}`;

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6 py-6 text-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative mb-3">
        <LockClosedIcon className="w-12 h-12 md:w-14 md:h-14 text-primary" strokeWidth={2.5} />
        <span className="absolute -bottom-1 -right-1">
          <Spinner size="sm" className="text-primary" />
        </span>
      </div>
      <p className="text-foreground font-semibold mb-1">{t('unifiedBox.p2pWaitingTitle')}</p>
      <p className="text-xs text-muted-foreground mb-4">
        {t('unifiedBox.p2pWaitingSubtitle')}
      </p>
      <div
        className="inline-flex items-center rounded-[10px] pl-3 pr-1.5 py-[7px] mb-3"
        style={{
          background: 'var(--share-bubble-bg)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: 'var(--share-bubble-shadow)',
          border: '1px solid var(--share-bubble-border)',
        }}
      >
        <span
          className="text-[1.125rem] font-bold text-foreground tracking-[0.06em] leading-none"
          style={{
            fontFamily:
              "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
        >
          {shareCode.slice(0, 3)}
          <span className="inline-block w-1" />
          {shareCode.slice(3)}
        </span>
        <CopyButton
          value={url}
          defaultCopied={false}
          stopPropagation
          onCopied={() => toast.success(t('quickAccess.shareSuccess'))}
          className="ml-2 p-1.5 can-hover:hover:bg-foreground/10"
          iconClassName="w-4 h-4"
          iconCopiedClass="text-green-600 dark:text-green-400"
        />
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {t('unifiedBox.p2pFileCount', { count: fileCount })}
      </p>
      <Button variant="outline" size="sm" onClick={onCancel}>
        {t('unifiedBox.p2pCancelButton')}
      </Button>
    </div>
  );
};

export default P2PWaiting;
