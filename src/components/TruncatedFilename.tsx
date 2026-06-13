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
}

/**
 * Renders a filename, truncating the base to fit the available width while
 * ALWAYS keeping the extension visible: "verylongname...png" (literal "...",
 * no space, extension's own dot absorbed). Measures the real rendered width so
 * it adapts to the container on every device.
 */
const TruncatedFilename: React.FC<Props> = ({ name, className }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(name);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const avail = el.clientWidth;
      if (!avail) return;
      const cs = getComputedStyle(el);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

      if (textWidth(name, font) <= avail) {
        setDisplay((d) => (d !== name ? name : d));
        return;
      }

      const dot = name.lastIndexOf('.');
      const hasExt = dot > 0 && dot < name.length - 1;
      const base = hasExt ? name.slice(0, dot) : name;
      const suffix = hasExt ? '...' + name.slice(dot + 1) : '...';

      let lo = 0;
      let hi = base.length;
      let best = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (textWidth(base.slice(0, mid) + suffix, font) <= avail) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      const next = base.slice(0, best) + suffix;
      setDisplay((d) => (d !== next ? next : d));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [name]);

  return (
    <span
      ref={ref}
      className={cn('block overflow-hidden whitespace-nowrap', className)}
      title={name}
    >
      {display}
    </span>
  );
};

export default TruncatedFilename;
