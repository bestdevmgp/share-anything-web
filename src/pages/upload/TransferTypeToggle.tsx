import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/button';
import { cn } from 'lib/utils';
import { useTranslation } from '../../i18n';

export interface TransferTypeToggleProps {
  transferType: 'server' | 'p2p';
  onTransferTypeChange: (type: 'server' | 'p2p') => void;
  p2pTooltipMounted: boolean;
  p2pTooltipVisible: boolean;
  tooltipPosition: 'right' | 'bottom';
  p2pButtonRef: React.RefObject<HTMLButtonElement | null>;
  tooltipRef: React.RefObject<HTMLDivElement | null>;
  onDismissP2PTooltip: (dontShowAgain: boolean) => void;
  onCloseP2PTooltip: () => void;
}

const TransferTypeToggle: React.FC<TransferTypeToggleProps> = ({
  transferType,
  onTransferTypeChange,
  p2pTooltipMounted,
  p2pTooltipVisible,
  tooltipPosition,
  p2pButtonRef,
  tooltipRef,
  onDismissP2PTooltip,
  onCloseP2PTooltip,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-10">
      <div className="relative flex w-full max-w-md bg-muted border border-border rounded-md">
        <div
          className="absolute top-0 h-full bg-card ring-1 ring-inset ring-black/15 dark:ring-white/40 rounded-md transition-all duration-200 ease-out"
          style={{
            width: '50%',
            left: transferType === 'server' ? '0' : '50%',
          }}
        />

        <button
          type="button"
          onClick={() => onTransferTypeChange('server')}
          className={cn(
            'relative z-10 flex-1 px-6 py-3 rounded-md text-sm font-semibold transition-all duration-200',
            transferType === 'server'
              ? 'text-foreground'
              : 'text-muted-foreground can-hover:hover:text-foreground'
          )}
        >
          {t('upload.serverTransfer')}
        </button>
        <button
          ref={p2pButtonRef}
          type="button"
          onClick={() => onTransferTypeChange('p2p')}
          className={cn(
            'relative z-10 flex-1 px-6 py-3 rounded-md text-sm font-semibold transition-all duration-200',
            transferType === 'p2p'
              ? 'text-foreground'
              : 'text-muted-foreground can-hover:hover:text-foreground'
          )}
        >
          {t('upload.p2pTransfer')}
        </button>

        {p2pTooltipMounted && (
          <div
            ref={tooltipRef}
            className={cn(
              'absolute bg-popover border border-border rounded-xl shadow-lg p-4 text-sm text-muted-foreground z-50 transition-all duration-300 break-keep',
              tooltipPosition === 'bottom'
                ? 'top-full left-0 right-0 mt-3'
                : 'top-1/2 left-full w-[32rem] ml-3 -translate-y-1/2',
              p2pTooltipVisible ? 'opacity-100' : 'opacity-0'
            )}
          >
            {tooltipPosition === 'bottom' && (
              <div className="absolute -top-[7px] right-[25%] w-3.5 h-3.5 bg-popover border-l border-t border-border transform rotate-45" />
            )}
            {tooltipPosition === 'right' && (
              <div className="absolute top-1/2 -left-[7px] -translate-y-1/2 w-3.5 h-3.5 bg-popover border-l border-b border-border transform rotate-45" />
            )}
            <p className="font-semibold text-primary mb-2 flex items-center gap-1">
              <InformationCircleIcon className="w-5 h-5 text-primary" />
              {t('upload.p2pNotice')}
            </p>
            <p className="mb-1 flex"><span className="flex-shrink-0 mr-1.5">•</span><span>{t('upload.p2pBullet1')}</span></p>
            <p className="mb-1 flex"><span className="flex-shrink-0 mr-1.5">•</span><span>{t('upload.p2pBullet2')}</span></p>
            <p className="mb-3 flex"><span className="flex-shrink-0 mr-1.5">•</span><span>{t('upload.p2pBullet3')}</span></p>
            <div className="border-t border-border pt-3 px-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onDismissP2PTooltip(true)}
                className="text-xs text-muted-foreground/60 can-hover:hover:text-muted-foreground underline underline-offset-2 transition-colors"
              >
                {t('upload.dontShowAgain')}
              </button>
              <Button
                size="sm"
                onClick={() => onCloseP2PTooltip()}
              >
                {t('common.confirm')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransferTypeToggle;
