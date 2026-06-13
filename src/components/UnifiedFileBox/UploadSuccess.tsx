import React from 'react';
import { useTranslation } from '../../i18n';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import CopyButton from '../CopyButton';
import StyledQRCode from '../StyledQRCode';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { formatDateTime } from '../../utils/format';
import { RecentSession } from '../../utils/recentSessions';

interface Props {
  result: RecentSession;
  failedNames: string[];
  onConfirm: () => void;
  onRetry: () => void;
}

const UploadSuccess: React.FC<Props> = ({ result, failedNames, onConfirm, onRetry }) => {
  const { t, language } = useTranslation();
  const url = `${window.location.origin}/download/${result.code}`;
  const displayCode =
    result.code.length === 6
      ? `${result.code.slice(0, 3)} ${result.code.slice(3)}`
      : result.code;

  return (
    <div className="flex-1 flex flex-col px-6 md:px-8 py-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <style>{`
        .upload-checkmark-path {
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
          animation: drawUploadCheck 0.6s ease-out forwards;
        }
        @keyframes drawUploadCheck {
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      <div className="flex-1 flex flex-col md:flex-row items-center md:items-stretch justify-center gap-6 md:gap-10">
        <div className="flex flex-col items-center justify-center text-center md:flex-1">
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
              <path d="M5 13l4 4L19 7" className="upload-checkmark-path" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-5">
            {t('uploadSuccess.uploadComplete')}
          </h2>

          <label className="block text-sm font-medium text-muted-foreground mb-2">
            {t('uploadSuccess.shareCode')}
          </label>
          <div className="flex items-center gap-1 bg-muted rounded-xl pl-3 pr-2 py-5 border border-foreground/[0.09] w-full md:max-w-[340px]">
            <span className="w-9 flex-shrink-0" aria-hidden="true" />
            <p
              className="flex-1 text-[2.125rem] font-bold text-center text-foreground leading-none whitespace-nowrap"
              style={{ letterSpacing: '0.1em' }}
            >
              {displayCode}
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <CopyButton
                  value={result.code}
                  aria-label={t('uploadSuccess.copyCode')}
                  className="flex-shrink-0 h-9 w-9"
                  iconClassName="w-5 h-5"
                  iconCopiedClass="text-green-600 dark:text-green-600"
                />
              </TooltipTrigger>
              <TooltipContent>{t('uploadSuccess.copyCode')}</TooltipContent>
            </Tooltip>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {t('uploadSuccess.expires', {
              dateTime: formatDateTime(result.expiresAt, language),
            })}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-5 md:flex-1">
          <div className="w-full md:max-w-[420px]">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('uploadSuccess.shareLink')}
            </label>
            <div className="relative">
              <Input
                type="text"
                value={url}
                readOnly
                className="w-full pr-12 bg-muted border-foreground/[0.09] rounded-lg text-sm text-foreground"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <CopyButton
                    value={url}
                    aria-label={t('uploadSuccess.copyLink')}
                    className="absolute right-[1.5px] top-1/2 -translate-y-1/2 h-9 w-9"
                    iconCopiedClass="text-green-600 dark:text-green-600"
                  />
                </TooltipTrigger>
                <TooltipContent>{t('uploadSuccess.copyLink')}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('uploadSuccess.qrDownload')}
            </label>
            <div className="p-3 border-2 border-border rounded-2xl">
              <StyledQRCode value={url} size={120} />
            </div>
          </div>
        </div>
      </div>

      {failedNames.length > 0 && (
        <div className="mt-4 text-xs text-red-600 dark:text-red-400 text-center">
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

      <Button onClick={onConfirm} size="lg" className="w-full mt-6">
        {t('common.done')}
      </Button>
    </div>
  );
};

export default UploadSuccess;
