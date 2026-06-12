import React, { useEffect } from 'react';
import { useTranslation } from '../i18n';
import { Button } from './ui/button';
import StatusIcon from './StatusIcon';

interface Props {
  onRetry: () => void;
}

const TurnstileBlockedOverlay: React.FC<Props> = ({ onRetry }) => {
  const { t } = useTranslation();

  // Lock background scroll while the blocking modal is shown.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200">
      <div className="w-full max-w-md rounded-2xl border-2 border-border bg-card p-8 text-center shadow-lg animate-in fade-in-0 zoom-in-95 duration-200">
        <StatusIcon variant="invalid" />
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
