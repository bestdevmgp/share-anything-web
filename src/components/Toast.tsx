import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useToast, setToastFunctions, Toast as ToastType } from '../context/ToastContext';
import { cn } from 'lib/utils';

const ToastIcon: React.FC<{ type: ToastType['type'] }> = ({ type }) => {
  const iconConfig = {
    success: {
      bgColor: 'bg-emerald-500',
      icon: (
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      bgColor: 'bg-red-500',
      icon: (
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    warning: {
      bgColor: 'bg-amber-500',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0-4h.01" />
        </svg>
      ),
    },
    info: {
      bgColor: 'bg-blue-500',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0-4h.01" />
        </svg>
      ),
    },
  };

  const config = iconConfig[type];

  return (
    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0', config.bgColor)}>
      {config.icon}
    </div>
  );
};

const MIN_TOP_DISPLAY = 1200;

const ToastItem: React.FC<{ toast: ToastType; onRemove: (id: string) => void; isFirst: boolean }> = ({ toast, onRemove, isFirst }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSwipeDismissing, setIsSwipeDismissing] = useState(false);
  const swipeStartOffset = useRef(0);
  const touchStartY = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountTimeRef = useRef(Date.now());
  const undoneRef = useRef(false);
  const committedRef = useRef(false);
  const DURATION = toast.duration ?? 2700;

  const finalizeRemove = useCallback(() => {
    if (!undoneRef.current && !committedRef.current && toast.onAutoClose) {
      committedRef.current = true;
      toast.onAutoClose();
    }
    onRemove(toast.id);
  }, [onRemove, toast]);

  const dismiss = () => {
    if (!isLeaving && !isSwipeDismissing) {
      setIsLeaving(true);
    }
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    undoneRef.current = true;
    toast.onAction?.();
    dismiss();
  };

  useEffect(() => {
    if (toast.forceDismiss && !isLeaving && !isSwipeDismissing) {
      setIsLeaving(true);
    }
  }, [toast.forceDismiss, isLeaving, isSwipeDismissing]);

  const collapseAndRemove = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) { finalizeRemove(); return; }

    el.style.height = el.offsetHeight + 'px';
    el.style.overflow = 'hidden';

    void el.offsetHeight;

    el.style.transition = 'height 300ms cubic-bezier(0.4, 0, 0.2, 1), padding-bottom 300ms cubic-bezier(0.4, 0, 0.2, 1)';
    el.style.height = '0';
    el.style.paddingBottom = '0';

    setTimeout(() => finalizeRemove(), 300);
  }, [finalizeRemove]);

  useEffect(() => {
    const enterTimer = setTimeout(() => setIsVisible(true), 10);

    exitTimerRef.current = setTimeout(() => {
      if (!isSwipeDismissing) {
        setIsLeaving(true);
      }
    }, DURATION);

    return () => {
      clearTimeout(enterTimer);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [isSwipeDismissing, DURATION]);

  useEffect(() => {
    if (isFirst && !isLeaving && !isSwipeDismissing) {
      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = DURATION - elapsed;

      if (remaining < MIN_TOP_DISPLAY) {
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        exitTimerRef.current = setTimeout(() => {
          setIsLeaving(true);
        }, MIN_TOP_DISPLAY);
      }
    }
  }, [isFirst, isLeaving, isSwipeDismissing, DURATION]);

  useEffect(() => {
    if (isLeaving) {
      const timer = setTimeout(collapseAndRemove, 400);
      return () => clearTimeout(timer);
    }
  }, [isLeaving, collapseAndRemove]);

  useEffect(() => {
    if (isSwipeDismissing) {
      const timer = setTimeout(collapseAndRemove, 250);
      return () => clearTimeout(timer);
    }
  }, [isSwipeDismissing, collapseAndRemove]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff < 0) {
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartY.current === null) return;

    if (dragOffset < -30) {
      swipeStartOffset.current = dragOffset;
      setIsDragging(false);
      setIsSwipeDismissing(true);
    } else {
      setDragOffset(0);
      setIsDragging(false);
    }

    touchStartY.current = null;
  };

  const dragOpacity = isDragging && dragOffset < 0
    ? Math.max(0.3, 1 + dragOffset / 100)
    : 1;

  const getTransform = () => {
    if (isDragging && dragOffset < 0) {
      return `translateY(${dragOffset}px) scale(${0.95 + 0.05 * dragOpacity})`;
    }
    if (isSwipeDismissing) {
      return `translateY(${swipeStartOffset.current - 40}px) scale(0.9)`;
    }
    if (isLeaving) {
      return 'translateY(calc(-100% - 40px)) scale(0.95)';
    }
    if (!isVisible) {
      return 'translateY(calc(-100% - 40px)) scale(0.95)';
    }
    return 'translateY(0) scale(1)';
  };

  const getOpacity = () => {
    if (isSwipeDismissing) return 0;
    if (isDragging) return dragOpacity;
    return 1;
  };

  const getTransition = () => {
    if (isDragging) return 'none';
    if (isSwipeDismissing) return 'all 200ms cubic-bezier(0.4, 0, 1, 1)';
    if (isVisible && !isLeaving) return 'all 500ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    return 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)';
  };

  return (
    <div ref={wrapperRef} style={{ paddingBottom: 10 }}>
      <div
        className="pointer-events-auto cursor-pointer select-none max-w-full"
        style={{
          transform: getTransform(),
          opacity: getOpacity(),
          transition: getTransition(),
          touchAction: 'none',
        }}
        onClick={dismiss}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={cn(
            'rounded-3xl pl-2.5 py-2 flex items-center gap-2.5 w-fit max-w-full sm:max-w-[520px]',
            toast.actionLabel ? 'pr-1' : 'pr-4'
          )}
          style={{
            background: 'var(--share-bubble-bg)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid var(--share-bubble-border)',
            boxShadow: 'var(--share-bubble-shadow)',
          }}
        >
          <ToastIcon type={toast.type} />
          <span className="text-foreground text-sm font-medium">
            {toast.message}
          </span>
          {toast.actionLabel && (
            <button
              type="button"
              onClick={handleAction}
              className="self-stretch -my-1 flex-shrink-0 flex items-center rounded-full bg-foreground text-background text-sm font-semibold px-3 can-hover:hover:opacity-90 active:opacity-90"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    setToastFunctions(addToast);
  }, [addToast]);

  return (
    <div className="fixed top-5 left-4 right-4 z-[60] flex flex-col items-center pointer-events-none">
      {toasts.map((toast, index) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} isFirst={index === 0} />
      ))}
    </div>
  );
};

export default ToastContainer;
