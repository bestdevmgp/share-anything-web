import React, { useLayoutEffect, useRef, useState } from 'react';

interface Props {
  count: number;
  children: React.ReactNode;
}

// Shows all rows (box grows) up to 10 files; caps at the height of exactly 10
// rows and scrolls internally beyond that. Measures real rows so the threshold
// stays exact regardless of row height (PC and mobile).
const ScrollableFileList: React.FC<Props> = ({ count, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const rows = el.children;
      if (count > 10 && rows.length >= 10) {
        const first = (rows[0] as HTMLElement).getBoundingClientRect();
        const tenth = (rows[9] as HTMLElement).getBoundingClientRect();
        const h = Math.ceil(tenth.bottom - first.top);
        setMaxHeight((prev) => (prev !== h ? h : prev));
      } else {
        setMaxHeight((prev) => (prev !== undefined ? undefined : prev));
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [count]);
  return (
    <div
      ref={ref}
      className="space-y-2 pr-0.5"
      style={maxHeight !== undefined ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      {children}
    </div>
  );
};

export default ScrollableFileList;
