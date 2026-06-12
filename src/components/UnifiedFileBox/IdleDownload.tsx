import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';
import { cn } from '../../lib/utils';

const LENGTH = 6;

interface Props {
  shortcutEnabled: boolean;
  prefill?: string | null;
  onPrefillConsumed?: () => void;
  onSubmit?: (code: string) => void;
}

const IdleDownload: React.FC<Props> = ({ shortcutEnabled, prefill, onPrefillConsumed, onSubmit }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusAt = useCallback((i: number) => {
    if (i < 0 || i >= LENGTH) return;
    const el = inputRefs.current[i];
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  useEffect(() => {
    focusAt(0);
  }, [focusAt]);

  // Pre-fill the first cell when the user typed a digit on the home page
  useEffect(() => {
    if (!prefill || !/^[0-9]$/.test(prefill)) return;
    setDigits((prev) => {
      const next = [...prev];
      next[0] = prefill;
      return next;
    });
    if (LENGTH > 1) focusAt(1);
    onPrefillConsumed?.();
  }, [prefill, focusAt, onPrefillConsumed]);

  useEffect(() => {
    if (!shortcutEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        focusAt(0);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcutEnabled, focusAt]);

  const tryNavigate = useCallback(
    (arr: string[]) => {
      if (arr.every((d) => d !== '')) {
        const code = arr.join('');
        if (onSubmitRef.current) {
          onSubmitRef.current(code);
        } else {
          navigate(`/download/${code}`);
        }
      }
    },
    [navigate]
  );

  const handleChange = (i: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length === 0) return;
    const next = [...digits];
    if (raw.length === 1) {
      next[i] = raw;
      setDigits(next);
      if (i < LENGTH - 1) focusAt(i + 1);
      else tryNavigate(next);
    } else {
      for (let k = 0; k < raw.length && i + k < LENGTH; k++) {
        next[i + k] = raw[k];
      }
      setDigits(next);
      const lastFilled = Math.min(i + raw.length - 1, LENGTH - 1);
      if (lastFilled < LENGTH - 1) focusAt(lastFilled + 1);
      else tryNavigate(next);
    }
  };

  const handleKeyDown = (i: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[i] === '') {
        e.preventDefault();
        if (i > 0) {
          const next = [...digits];
          next[i - 1] = '';
          setDigits(next);
          focusAt(i - 1);
        }
      } else {
        const next = [...digits];
        next[i] = '';
        setDigits(next);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (i > 0) focusAt(i - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (i < LENGTH - 1) focusAt(i + 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      tryNavigate(digits);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!pasted) return;
    const next = Array(LENGTH).fill('');
    for (let k = 0; k < pasted.length; k++) next[k] = pasted[k];
    setDigits(next);
    const lastFilled = Math.min(pasted.length - 1, LENGTH - 1);
    if (lastFilled < LENGTH - 1) focusAt(lastFilled + 1);
    else tryNavigate(next);
  };

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
      <div className="flex items-center gap-2 md:gap-3">
        {Array.from({ length: LENGTH }).map((_, i) => (
          <React.Fragment key={i}>
            <input
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]"
              maxLength={1}
              value={digits[i]}
              onChange={handleChange(i)}
              onKeyDown={handleKeyDown(i)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'w-10 h-12 md:w-12 md:h-14 rounded-lg border bg-card',
                'text-center text-xl md:text-2xl font-semibold text-foreground',
                'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30',
                'transition-colors',
                digits[i] ? 'border-foreground/30' : 'border-foreground/[0.09]'
              )}
              style={{ fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
              aria-label={`${t('unifiedBox.downloadHint')} (${i + 1}/${LENGTH})`}
            />
            {i === 2 && <span className="w-3 md:w-4" aria-hidden />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default IdleDownload;
