import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface Props {
  children: React.ReactNode;
  className?: string;
  // The box height transitions (300ms) ONLY when this key changes — i.e. a logical view
  // switch (mode/state). For same-view content growth (a folder Collapsible expanding),
  // the key is unchanged, so the box follows the live content height INSTANTLY and stays
  // in lockstep with the Collapsible — instead of chasing it with a second 300ms
  // transition, which made the box grow only after the folder animation had finished.
  transitionKey?: string | number;
}

const AnimatedHeight: React.FC<Props> = ({ children, className, transitionKey }) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const firstRun = useRef(true);

  // On a view switch, enable the height transition for the resulting (instant) content
  // swap, then disable it again so subsequent in-view growth follows in lockstep.
  useLayoutEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setAnimating(true);
    const id = window.setTimeout(() => setAnimating(false), 320);
    return () => window.clearTimeout(id);
  }, [transitionKey]);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className={cn(
        'overflow-hidden motion-reduce:transition-none',
        animating && 'transition-[height] duration-300 ease-out',
        className
      )}
      style={{ height: height ?? undefined }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
};

export default AnimatedHeight;
