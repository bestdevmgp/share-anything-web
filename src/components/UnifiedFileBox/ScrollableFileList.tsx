import React, { useLayoutEffect, useRef, useState } from 'react';

interface Props {
  count: number;
  // Signal that changes when row heights change (e.g. a folder expands/collapses)
  // so the 10-row height cap is re-measured against the current layout.
  recomputeKey?: string | number;
  children: React.ReactNode;
}

// Shows all rows (box grows) up to 10 files; caps at the height of exactly 10
// rows and scrolls internally beyond that. Measures real rows so the threshold
// stays exact regardless of row height (PC and mobile).
const ScrollableFileList: React.FC<Props> = ({ count, recomputeKey, children }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () => {
      // Prefer explicit [data-row] markers so nested folder contents count as
      // individual rows; fall back to direct children for flat lists.
      const flat = content.querySelectorAll('[data-row]');
      const rows: ArrayLike<Element> = flat.length ? flat : content.children;
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
    // Re-measure as content settles (the inner div is unconstrained, so its
    // height tracks expanding/collapsing folders even while the outer box is
    // capped) and on viewport changes.
    const ro = new ResizeObserver(measure);
    ro.observe(content);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [count, recomputeKey]);

  return (
    <div
      className="pr-0.5"
      style={maxHeight !== undefined ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      <div ref={contentRef} className="space-y-2">
        {children}
      </div>
    </div>
  );
};

export default ScrollableFileList;
