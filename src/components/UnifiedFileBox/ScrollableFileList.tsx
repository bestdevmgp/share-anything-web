import React, { useLayoutEffect, useRef, useState } from 'react';

interface Props {
  count: number;
  recomputeKey?: string | number;
  children: React.ReactNode;
}

const ROW_GAP = 8;

const ScrollableFileList: React.FC<Props> = ({ count, recomputeKey, children }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () => {
      const flat = content.querySelectorAll('[data-row]');
      const rows: ArrayLike<Element> = flat.length ? flat : content.children;
      if (rows.length === 0) {
        setMaxHeight((p) => (p === undefined ? p : undefined));
        return;
      }
      const firstH = (rows[0] as HTMLElement).getBoundingClientRect().height;
      const cap = Math.ceil((firstH + ROW_GAP) * 9 + firstH);
      setMaxHeight((p) => (p === cap ? p : cap));
    };
    measure();
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
      style={{ maxHeight, overflowY: maxHeight !== undefined ? 'auto' : undefined }}
    >
      <div ref={contentRef} className="space-y-2">
        {children}
      </div>
    </div>
  );
};

export default ScrollableFileList;
