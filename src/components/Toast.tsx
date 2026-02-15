import React, { useEffect, useState, useRef } from 'react';
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
        <svg className="w-5.5 h-5.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0-4h.01" />
        </svg>
      ),
    },
    info: {
      bgColor: 'bg-blue-500',
      icon: (
        <svg className="w-5.5 h-5.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

const ToastItem: React.FC<{ toast: ToastType; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSwipeDismissing, setIsSwipeDismissing] = useState(false);
  const swipeStartOffset = useRef(0);
  const touchStartY = useRef<number | null>(null);

  const dismiss = () => {
    if (!isLeaving && !isSwipeDismissing) {
      setIsLeaving(true);
    }
  };

  useEffect(() => {
    const enterTimer = setTimeout(() => setIsVisible(true), 10);

    const exitTimer = setTimeout(() => {
      if (!isSwipeDismissing) {
        setIsLeaving(true);
      }
    }, 2700);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [isSwipeDismissing]);

  useEffect(() => {
    if (isLeaving) {
      const removeTimer = setTimeout(() => {
        onRemove(toast.id);
      }, 400);
      return () => clearTimeout(removeTimer);
    }
  }, [isLeaving, onRemove, toast.id]);

  useEffect(() => {
    if (isSwipeDismissing) {
      const removeTimer = setTimeout(() => {
        onRemove(toast.id);
      }, 250);
      return () => clearTimeout(removeTimer);
    }
  }, [isSwipeDismissing, onRemove, toast.id]);

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
      return 'translateY(-16px) scale(0.95)';
    }
    if (!isVisible) {
      return 'translateY(-32px) scale(0.95)';
    }
    return 'translateY(0) scale(1)';
  };

  const getOpacity = () => {
    if (isSwipeDismissing) return 0;
    if (isLeaving) return 0;
    if (!isVisible) return 0;
    return dragOpacity;
  };

  const getTransition = () => {
    if (isDragging) return 'none';
    if (isSwipeDismissing) return 'all 200ms cubic-bezier(0.4, 0, 1, 1)';
    if (isVisible && !isLeaving) return 'all 500ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    return 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)';
  };

  return (
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
        className="bg-card dark:border dark:border-border rounded-3xl pl-2.5 pr-4 py-2 flex items-center gap-2.5 max-w-full sm:max-w-[520px]"
        style={{
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.12), 0 2px 8px -2px rgba(0, 0, 0, 0.08)',
        }}
      >
        <ToastIcon type={toast.type} />
        <span className="text-foreground text-sm font-medium">
          {toast.message}
        </span>
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
    <div className="fixed top-5 left-4 right-4 z-50 flex flex-col items-center gap-2.5 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

export default ToastContainer;
