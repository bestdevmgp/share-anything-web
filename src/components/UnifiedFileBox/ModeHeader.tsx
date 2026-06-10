import React from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';
import { Mode } from './useUnifiedFileBoxState';
import { cn } from '../../lib/utils';

interface Props {
  mode: Mode;
  disabled: boolean;
  onSwitchMode: (m: Mode) => void;
  onDrillDownToUpload: () => void;
}

const ModeHeader: React.FC<Props> = ({ mode, disabled, onSwitchMode, onDrillDownToUpload }) => {
  const { t } = useTranslation();

  const renderTab = (which: Mode, label: string) => {
    const active = mode === which;
    const handle = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;
      if (active && which === 'upload') {
        onDrillDownToUpload();
      } else if (!active) {
        onSwitchMode(which);
      }
      // active 'download' tab click: no-op
    };
    return (
      <button
        role="tab"
        aria-selected={active}
        disabled={disabled}
        onClick={handle}
        className={cn(
          'relative z-10 flex-1 py-3 text-center font-semibold transition-colors duration-200',
          active ? 'text-foreground' : 'text-muted-foreground can-hover:hover:text-foreground',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className="inline-flex items-center justify-center">
          {label}
          {which === 'upload' && (
            <span
              className={cn(
                'inline-flex items-center overflow-hidden transition-all duration-300 ease-out',
                active
                  ? 'max-w-[20px] opacity-100 ml-1 translate-x-0'
                  : 'max-w-0 opacity-0 ml-0 -translate-x-2'
              )}
              aria-hidden={!active}
            >
              <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />
            </span>
          )}
        </span>
      </button>
    );
  };

  return (
    <div role="tablist" className="relative flex">
      <div
        className="absolute bottom-0 h-0.5 bg-primary transition-all duration-200 ease-out pointer-events-none"
        style={{
          width: '50%',
          left: mode === 'upload' ? '0%' : '50%',
        }}
        aria-hidden
      />
      {renderTab('upload', t('unifiedBox.tabUpload'))}
      {renderTab('download', t('unifiedBox.tabDownload'))}
    </div>
  );
};

export default ModeHeader;
