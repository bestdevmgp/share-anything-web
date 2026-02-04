import React, { useEffect, useState, useRef } from 'react';
import { useToast, setToastFunctions, Toast as ToastType } from '../context/ToastContext';

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
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01" />
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
    <div className={`w-6 h-6 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
      {config.icon}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastType; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const dismiss = () => {
    if (!isLeaving) {
      setIsLeaving(true);
    }
  };

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10);

    // Start exit animation before removal
    const exitTimer = setTimeout(() => {
      setIsLeaving(true);
    }, 2700);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, []);

  useEffect(() => {
    if (isLeaving) {
      const removeTimer = setTimeout(() => {
        onRemove(toast.id);
      }, 400);
      return () => clearTimeout(removeTimer);
    }
  }, [isLeaving, onRemove, toast.id]);

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
      dismiss();
    } else {
      setDragOffset(0);
    }

    touchStartY.current = null;
    setIsDragging(false);
  };

  const dragOpacity = isDragging && dragOffset < 0
    ? Math.max(0.3, 1 + dragOffset / 100)
    : 1;

  const getTransform = () => {
    if (isDragging && dragOffset < 0) {
      return `translateY(${dragOffset}px) scale(${0.95 + 0.05 * dragOpacity})`;
    }
    if (isLeaving) {
      return 'translateY(-16px) scale(0.95)';
    }
    if (!isVisible) {
      return 'translateY(-32px) scale(0.95)';
    }
    return 'translateY(0) scale(1)';
  };

  return (
    <div
      className="pointer-events-auto cursor-pointer select-none"
      style={{
        transform: getTransform(),
        opacity: isLeaving ? 0 : !isVisible ? 0 : dragOpacity,
        transition: isDragging
          ? 'none'
          : isVisible && !isLeaving
            ? 'all 500ms cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        touchAction: 'none',
      }}
      onClick={dismiss}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="bg-white rounded-full pl-2.5 pr-4 py-2 flex items-center gap-2.5"
        style={{
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.12), 0 2px 8px -2px rgba(0, 0, 0, 0.08)',
        }}
      >
        <ToastIcon type={toast.type} />
        <span className="text-gray-800 text-sm font-medium">
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
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2.5 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

export default ToastContainer;
