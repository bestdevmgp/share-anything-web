import React from 'react';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../i18n';
import { Button } from './ui/button';

interface Props {
  onRetry: () => void;
}

const TurnstileBlockedOverlay: React.FC<Props> = ({ onRetry }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-500/15">
          <ShieldExclamationIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-foreground">{t('botCheck.title')}</h2>
        <p className="mb-6 text-sm text-muted-foreground leading-relaxed">{t('botCheck.desc')}</p>
        <Button onClick={onRetry} size="lg" className="w-full">
          {t('common.retry')}
        </Button>
      </div>
    </div>
  );
};

export default TurnstileBlockedOverlay;
