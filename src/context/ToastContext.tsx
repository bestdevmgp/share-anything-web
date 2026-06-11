import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  onAutoClose?: () => void;
  duration?: number;
}

export interface Toast extends ToastOptions {
  id: string;
  type: ToastType;
  message: string;
  forceDismiss?: boolean;
}

const MAX_TOASTS = 3;

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, options?: ToastOptions) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, options?: ToastOptions) => {
    const id = `toast-${++toastIdRef.current}`;
    const newToast: Toast = { id, type, message, ...options };

    setToasts((prev) => {
      const visible = prev.filter((t) => !t.forceDismiss);
      if (visible.length >= MAX_TOASTS) {
        const oldestId = visible[0].id;
        return [
          ...prev.map((t) => (t.id === oldestId ? { ...t, forceDismiss: true } : t)),
          newToast,
        ];
      }
      return [...prev, newToast];
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

let toastFunctions: {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  action: (message: string, options: ToastOptions & { type?: ToastType }) => void;
} | null = null;

export const setToastFunctions = (
  addToast: (type: ToastType, message: string, options?: ToastOptions) => void
) => {
  toastFunctions = {
    success: (message) => addToast('success', message),
    error: (message) => addToast('error', message),
    warning: (message) => addToast('warning', message),
    info: (message) => addToast('info', message),
    action: (message, { type = 'success', ...options }) => addToast(type, message, options),
  };
};

export const toast = {
  success: (message: string) => toastFunctions?.success(message),
  error: (message: string) => toastFunctions?.error(message),
  warning: (message: string) => toastFunctions?.warning(message),
  info: (message: string) => toastFunctions?.info(message),
  action: (message: string, options: ToastOptions & { type?: ToastType }) =>
    toastFunctions?.action(message, options),
};
