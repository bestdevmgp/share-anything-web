import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const WIDGET_WIDTH = 300;
const WIDGET_HEIGHT = 65;
const OPTICAL_INSET = 6;

const TurnstileBlockedOverlay: React.FC<Props> = ({ onRetry, children, closing = false, loading = false }) => {
  const { t } = useTranslation();
  const [showFallback, setShowFallback] = useState(false);
  const [slotWidth, setSlotWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);

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

  const measureSlot = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setSlotWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    observerRef.current = ro;
  }, []);

  const targetWidth = slotWidth > 0 ? Math.max(WIDGET_WIDTH * 0.5, slotWidth - OPTICAL_INSET) : 0;
  const scale = targetWidth > 0 && targetWidth < WIDGET_WIDTH ? targetWidth / WIDGET_WIDTH : 1;
  const scaled = scale < 1;

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
        <p className="mb-5 text-sm text-muted-foreground leading-relaxed">{t('botCheck.desc')}</p>
        {children && (
          <div className="relative mb-4 flex min-h-[65px] items-center justify-center">
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center px-3">
              <p
                className={cn(
                  'max-w-[18rem] text-center text-xs font-medium leading-snug text-destructive transition-opacity duration-300',
                  showFallback ? 'opacity-100' : 'opacity-0'
                )}
              >
                {t('botCheck.unsupported')}
              </p>
            </div>
            <div
              ref={measureSlot}
              className="relative z-10 w-full"
              style={scaled ? { height: WIDGET_HEIGHT * scale } : undefined}
            >
              <div
                className={scaled ? 'absolute top-0' : 'mx-auto'}
                style={
                  scaled
                    ? {
                        left: '50%',
                        width: WIDGET_WIDTH,
                        marginLeft: -WIDGET_WIDTH / 2,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top center',
                      }
                    : targetWidth > 0
                    ? { width: targetWidth }
                    : undefined
                }
              >
                {children}
              </div>
            </div>
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
