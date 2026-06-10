import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { Button } from '../ui/button';
import CopyButton from '../CopyButton';
import { toast } from '../../context/ToastContext';
import { RecentSession } from '../../utils/recentSessions';

interface Props {
  result: RecentSession;
  failedNames: string[];
  onConfirm: () => void;
  onRetry: () => void;
}

const UploadSuccess: React.FC<Props> = ({ result, failedNames, onConfirm, onRetry }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const url = `${window.location.origin}/download/${result.code}`;
  const minutesLeft = Math.max(
    1,
    Math.round((new Date(result.expiresAt).getTime() - Date.now()) / 60000)
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
      <CheckCircleIcon className="w-12 h-12 text-primary mb-3" />
      <p className="text-foreground font-semibold mb-4">{t('unifiedBox.uploadComplete')}</p>
      <div
        className="inline-flex items-center rounded-[10px] pl-3 pr-1.5 py-[7px]"
        style={{
          background: 'var(--share-bubble-bg)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: 'var(--share-bubble-shadow)',
          border: '1px solid var(--share-bubble-border)',
        }}
      >
        <span className="font-mono text-[1.125rem] font-bold text-foreground tracking-[0.06em] leading-none">
          {result.code.slice(0, 3)}
          <span className="inline-block w-1" />
          {result.code.slice(3)}
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
      <p className="text-xs text-muted-foreground mt-3">
        {t('unifiedBox.fileCountSummary', {
          count: result.fileNames.length,
          duration: t('unifiedBox.remainingMinutes', { minutes: minutesLeft }),
        })}
      </p>
      {failedNames.length > 0 && (
        <div className="mt-3 text-xs text-red-600 dark:text-red-400 text-center">
          {t('unifiedBox.partialFailure', { count: failedNames.length })}
          <ul className="my-1">
            {failedNames.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <Button size="sm" variant="outline" onClick={onRetry}>
            {t('unifiedBox.retry')}
          </Button>
        </div>
      )}
      <div className="flex gap-2 mt-5">
        <Button onClick={onConfirm}>{t('unifiedBox.confirmButton')}</Button>
        <Button
          variant="outline"
          onClick={() =>
            navigate('/upload/success', {
              state: { uploadResult: { share_code: result.code, expires_at: result.expiresAt } },
            })
          }
        >
          {t('unifiedBox.qrAndDetails')}
        </Button>
      </div>
    </div>
  );
};

export default UploadSuccess;
