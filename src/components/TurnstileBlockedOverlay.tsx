import React, { useEffect } from 'react';
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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
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
          <div className="mb-6 flex justify-center">{children}</div>
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
