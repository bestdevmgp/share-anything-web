import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from 'lib/utils';

const LENGTH = 6;

export interface CodeInputHandle {
  focusFirst: () => void;
}

interface Props {
  onComplete: (code: string) => void;
  onChange?: (code: string) => void;
  prefill?: string | null;
  onPrefillConsumed?: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

const CodeInput = forwardRef<CodeInputHandle, Props>(
  ({ onComplete, onChange, prefill, onPrefillConsumed, autoFocus = true, disabled, ariaLabel }, ref) => {
    const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const focusAt = useCallback((i: number) => {
      if (i < 0 || i >= LENGTH) return;
      const el = inputRefs.current[i];
      if (!el) return;
      el.focus();
      el.select();
    }, []);

    useImperativeHandle(ref, () => ({ focusFirst: () => focusAt(0) }), [focusAt]);

    useEffect(() => {
      if (autoFocus) focusAt(0);
    }, [autoFocus, focusAt]);

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

    const commit = (next: string[]) => {
      setDigits(next);
      onChangeRef.current?.(next.join(''));
    };

    const tryComplete = (arr: string[]) => {
      if (arr.every((d) => d !== '')) onCompleteRef.current(arr.join(''));
    };

    const handleChange = (i: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '');
      if (raw.length === 0) return;
      const next = [...digits];
      if (raw.length === 1) {
        next[i] = raw;
        commit(next);
        if (i < LENGTH - 1) focusAt(i + 1);
        else tryComplete(next);
      } else {
        for (let k = 0; k < raw.length && i + k < LENGTH; k++) {
          next[i + k] = raw[k];
        }
        commit(next);
        const lastFilled = Math.min(i + raw.length - 1, LENGTH - 1);
        if (lastFilled < LENGTH - 1) focusAt(lastFilled + 1);
        else tryComplete(next);
      }
    };

    const handleKeyDown = (i: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        if (digits[i] === '') {
          e.preventDefault();
          if (i > 0) {
            const next = [...digits];
            next[i - 1] = '';
            commit(next);
            focusAt(i - 1);
          }
        } else {
          const next = [...digits];
          next[i] = '';
          commit(next);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (i > 0) focusAt(i - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (i < LENGTH - 1) focusAt(i + 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        tryComplete(digits);
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
      if (!pasted) return;
      const next = Array(LENGTH).fill('');
      for (let k = 0; k < pasted.length; k++) next[k] = pasted[k];
      commit(next);
      const lastFilled = Math.min(pasted.length - 1, LENGTH - 1);
      if (lastFilled < LENGTH - 1) focusAt(lastFilled + 1);
      else tryComplete(next);
    };

    return (
      <div className="flex items-center justify-center gap-2 md:gap-3">
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
              disabled={disabled}
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
                'transition-colors disabled:opacity-60',
                digits[i] ? 'border-foreground/30' : 'border-foreground/[0.09]'
              )}
              aria-label={ariaLabel ? `${ariaLabel} (${i + 1}/${LENGTH})` : undefined}
            />
            {i === 2 && <span className="w-3 md:w-4" aria-hidden />}
          </React.Fragment>
        ))}
      </div>
    );
  }
);

CodeInput.displayName = 'CodeInput';

export default CodeInput;
