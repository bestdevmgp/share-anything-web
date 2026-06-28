import React, { useState, useEffect, forwardRef } from 'react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { copyToClipboard } from '../utils/format';
import { cn } from 'lib/utils';

export interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  iconClassName?: string;
  iconIdleClass?: string;
  iconCopiedClass?: string;
  onCopied?: () => void;
  stopPropagation?: boolean;
  defaultCopied?: boolean;
}

const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    { value, className, iconClassName, iconIdleClass, iconCopiedClass, onCopied, stopPropagation, defaultCopied = false, onClick, ...rest },
    ref,
  ) => {
    const [copied, setCopied] = useState(defaultCopied);

    useEffect(() => {
      if (!defaultCopied) return;
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }, [defaultCopied]);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (stopPropagation) e.stopPropagation();
      const ok = await copyToClipboard(value);
      if (!ok) return;
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <button
        ref={ref}
        type="button"
        {...rest}
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-colors',
          'can-hover:hover:bg-accent/50 active:bg-accent/50',
          className,
        )}
      >
        <span className={cn('relative inline-block w-5 h-5', iconClassName)} aria-hidden>
          <ClipboardDocumentIcon
            className={cn(
              'absolute inset-0 w-full h-full transition-opacity duration-200 ease-out motion-reduce:transition-none',
              'text-muted-foreground',
              iconIdleClass,
              copied ? 'opacity-0' : 'opacity-100',
            )}
          />
          <CheckIcon
            className={cn(
              'absolute inset-0 w-full h-full transition-opacity duration-200 ease-out motion-reduce:transition-none',
              'text-emerald-600 dark:text-emerald-400',
              iconCopiedClass,
              copied ? 'opacity-100' : 'opacity-0',
            )}
          />
        </span>
      </button>
    );
  },
);

CopyButton.displayName = 'CopyButton';

export default CopyButton;
