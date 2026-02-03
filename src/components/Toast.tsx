import React, { useEffect, useState } from 'react';
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
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 16v-4m0-4h.01" />
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

  return (
    <div
      className={`
        transform transition-all ease-out
        ${isVisible && !isLeaving
          ? 'translate-y-0 opacity-100 scale-100 duration-500'
          : isLeaving
            ? '-translate-y-4 opacity-0 scale-95 duration-300'
            : '-translate-y-8 opacity-0 scale-95 duration-300'
        }
      `}
      style={{
        transitionTimingFunction: isVisible && !isLeaving
          ? 'cubic-bezier(0.34, 1.56, 0.64, 1)'
          : 'cubic-bezier(0.4, 0, 0.2, 1)'
      }}
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
