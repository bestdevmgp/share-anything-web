import React from 'react';
import { useTranslation } from '../../i18n';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';
import CopyButton from '../CopyButton';
import StyledQRCode from '../StyledQRCode';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';

interface Props {
  shareCode?: string;
  fileCount: number;
  onCancel: () => void;
  loading?: boolean;
}

const P2PWaiting: React.FC<Props> = ({ shareCode, fileCount, onCancel, loading }) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div
        className="flex-1 flex flex-col px-6 md:px-8 py-8 animate-in fade-in-0 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-card border border-foreground/[0.09] mb-4">
            <Spinner size="xl" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1.5">
            {t('unifiedBox.p2pCreatingTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('unifiedBox.p2pCreatingDesc')}
          </p>
        </div>
        <Button variant="outline" onClick={onCancel} size="lg" className="w-full mt-6 -mb-2">
          {t('unifiedBox.p2pCancelButton')}
        </Button>
      </div>
    );
  }

  const url = shareCode ? `${window.location.origin}/download/${shareCode}` : '';
  const displayCode =
    shareCode && shareCode.length === 6 ? `${shareCode.slice(0, 3)} ${shareCode.slice(3)}` : (shareCode ?? '');

  return (
    <div
      className="flex-1 flex flex-col px-6 md:px-8 py-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex-1 flex flex-col md:flex-row items-stretch justify-center gap-6 md:gap-10">
        <div className="flex flex-col items-center justify-center text-center md:flex-1">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-card border border-foreground/[0.09] mb-4">
            <Spinner size="xl" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1.5">
            {t('uploadSuccess.waitingForReceiver')}
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            {t('uploadSuccess.keepPageOpen')}
          </p>

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
                  value={shareCode ?? ''}
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
            {t('unifiedBox.p2pFileCount', { count: fileCount })}
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

      <Button variant="outline" onClick={onCancel} size="lg" className="w-full mt-6 -mb-2">
        {t('unifiedBox.p2pCancelButton')}
      </Button>
    </div>
  );
};

export default P2PWaiting;
