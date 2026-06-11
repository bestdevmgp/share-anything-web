import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface Props {
  children: React.ReactNode;
  className?: string;
}

const AnimatedHeight: React.FC<Props> = ({ children, className }) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

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
        'overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none',
        className
      )}
      style={{ height: height ?? undefined }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
};

export default AnimatedHeight;
