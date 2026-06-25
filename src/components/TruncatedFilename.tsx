import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from 'lib/utils';

let measureCanvas: HTMLCanvasElement | null = null;
const textWidth = (text: string, font: string): number => {
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(text).width;
};

interface Props {
  name: string;
  className?: string;
  /**
   * Optional trailing content kept attached right after the (possibly truncated)
   * name — e.g. "외 1개" for a multi-file bundle. Its rendered width is reserved
   * so the NAME truncates to leave room for it, instead of the suffix being
   * clipped or pushed away.
   */
  suffix?: React.ReactNode;
  suffixClassName?: string;
}

/**
 * Renders a filename, truncating the base to fit the available width while
 * ALWAYS keeping the extension visible: "verylongname...png" (literal "...",
 * no space, extension's own dot absorbed). Measures the real rendered width so
 * it adapts to the container on every device.
 *
 * Must live in a block/flex-column context where the parent sets its width — in
 * a flex ROW its width would track its own (shrinking) content and collapse.
 */
const TruncatedFilename: React.FC<Props> = ({ name, className, suffix, suffixClassName }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const suffixRef = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(name);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const avail = el.clientWidth;
      if (!avail) return;

      // Reserve the suffix's footprint (its width + its left margin) so the name
      // truncates to leave room for it.
      let reserve = 0;
      const sfx = suffixRef.current;
      if (sfx) {
        const scs = getComputedStyle(sfx);
        reserve = sfx.offsetWidth + (parseFloat(scs.marginLeft) || 0);
      }
      const usable = Math.max(0, avail - reserve);

      const cs = getComputedStyle(el);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

      if (textWidth(name, font) <= usable) {
        setDisplay((d) => (d !== name ? name : d));
        return;
      }

      const dot = name.lastIndexOf('.');
      const hasExt = dot > 0 && dot < name.length - 1;
      const base = hasExt ? name.slice(0, dot) : name;
      const suf = hasExt ? '...' + name.slice(dot + 1) : '...';

      let lo = 0;
      let hi = base.length;
      let best = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (textWidth(base.slice(0, mid) + suf, font) <= usable) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      const next = base.slice(0, best) + suf;
      setDisplay((d) => (d !== next ? next : d));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [name, suffix]);

  return (
    <span
      ref={ref}
      className={cn('block overflow-hidden whitespace-nowrap', className)}
      title={name}
    >
      {display}
      {suffix != null && (
        <span ref={suffixRef} className={cn('whitespace-nowrap', suffixClassName)}>
          {suffix}
        </span>
      )}
    </span>
  );
};

export default TruncatedFilename;
