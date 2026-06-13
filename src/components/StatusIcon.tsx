import React from 'react';

export type StatusIconVariant = 'success' | 'info' | 'expired' | 'invalid' | 'error' | 'security';

interface StatusIconProps {
  variant: StatusIconVariant;
  className?: string;
}

const wrapperBase = 'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4';

const StatusIcon: React.FC<StatusIconProps> = ({ variant, className }) => {
  switch (variant) {
    case 'success':
      return (
        <div className={`${wrapperBase} bg-green-100 dark:bg-green-500/15 ${className ?? ''}`}>
          <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" className="status-check-path" />
          </svg>
        </div>
      );
    case 'info':
      return (
        <div className={`${wrapperBase} bg-blue-100 dark:bg-blue-500/15 ${className ?? ''}`}>
          <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
      );
    case 'expired':
      return (
        <div className={`${wrapperBase} bg-yellow-100 dark:bg-yellow-500/15 ${className ?? ''}`}>
          <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      );
    case 'invalid':
      return (
        <div className={`${wrapperBase} bg-yellow-100 dark:bg-yellow-500/15 ${className ?? ''}`}>
          <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
      );
    case 'error':
      return (
        <div className={`${wrapperBase} bg-red-100 dark:bg-red-500/15 ${className ?? ''}`}>
          <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 18L18 6" className="status-error-x-1" />
            <path d="M6 6l12 12" className="status-error-x-2" />
          </svg>
        </div>
      );
    case 'security':
      return (
        <div className={`${wrapperBase} bg-blue-100 dark:bg-blue-500/15 ${className ?? ''}`}>
          <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
      );
  }
};

export default StatusIcon;
