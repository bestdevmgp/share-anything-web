import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';
import { Button } from './ui/button';
import { Spinner } from './ui/spinner';
import StatusIcon from './StatusIcon';
import { cn } from 'lib/utils';

interface Props {
  onRetry: () => void;
  children?: React.ReactNode;
  closing?: boolean;
  loading?: boolean;
}

const TurnstileBlockedOverlay: React.FC<Props> = ({ onRetry, children, closing = false, loading = false }) => {
  const { t } = useTranslation();
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowFallback(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 duration-200',
        closing ? 'animate-out fade-out-0' : 'animate-in fade-in-0'
      )}
    >
      <div
        className={cn(
          'w-full max-w-md rounded-2xl border-2 border-border bg-card p-8 text-center shadow-lg duration-200',
          closing ? 'animate-out fade-out-0 zoom-out-95' : 'animate-in fade-in-0 zoom-in-95'
        )}
      >
        <StatusIcon variant="security" />
        <h2 className="mb-2 text-xl font-bold text-foreground">{t('botCheck.title')}</h2>
        <p className="mb-6 text-sm text-muted-foreground leading-relaxed">{t('botCheck.desc')}</p>
        {children && (
          <div className="relative mb-6 flex min-h-[65px] items-center justify-center">
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center px-3">
              <p
                className={cn(
                  'max-w-[18rem] text-center text-sm font-medium leading-snug text-destructive transition-opacity duration-300',
                  showFallback ? 'opacity-100' : 'opacity-0'
                )}
              >
                {t('botCheck.unsupported')}
              </p>
            </div>
            <div className="relative z-10 flex w-full justify-center">{children}</div>
          </div>
        )}
        <Button onClick={onRetry} size="lg" className="relative w-full" disabled={loading}>
          <span className={loading ? 'invisible' : ''}>{t('common.retry')}</span>
          {loading && <Spinner size="sm" className="text-primary-foreground absolute" />}
        </Button>
      </div>
    </div>
  );
};

export default TurnstileBlockedOverlay;
