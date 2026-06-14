import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';
import CodeInput, { CodeInputHandle } from '../CodeInput';

interface Props {
  shortcutEnabled: boolean;
  prefill?: string | null;
  onPrefillConsumed?: () => void;
  onSubmit?: (code: string) => void;
}

const IdleDownload: React.FC<Props> = ({ shortcutEnabled, prefill, onPrefillConsumed, onSubmit }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const codeRef = useRef<CodeInputHandle>(null);

  const handleComplete = useCallback(
    (code: string) => {
      if (onSubmit) onSubmit(code);
      else navigate(`/download/${code}`);
    },
    [onSubmit, navigate]
  );

  useEffect(() => {
    if (!shortcutEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        codeRef.current?.focusFirst();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcutEnabled]);

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6 pt-6 pb-24"
      onClick={(e) => e.stopPropagation()}
    >
      <ArrowDownTrayIcon
        className="w-16 h-16 md:w-20 md:h-20 text-foreground mb-5"
        strokeWidth={2.5}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <p className="text-foreground font-medium mb-6">{t('unifiedBox.downloadHint')}</p>
      <CodeInput
        ref={codeRef}
        onComplete={handleComplete}
        prefill={prefill}
        onPrefillConsumed={onPrefillConsumed}
        ariaLabel={t('unifiedBox.downloadHint')}
      />
    </div>
  );
};

export default IdleDownload;
