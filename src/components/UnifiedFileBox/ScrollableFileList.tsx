import React, { useLayoutEffect, useRef, useState } from 'react';

interface Props {
  // Anticipated row count assuming every folder is expanded — the box reserves
  // this many rows up-front so opening a folder fills the space instead of
  // growing the box.
  count: number;
  // Changes when row layout changes (folder expand/collapse) so the reserved
  // height is re-measured against the current rows.
  recomputeKey?: string | number;
  // Number of top-level folders. Each one, when expanded, adds wrapper chrome
  // (border-top + padding) around its rows that the per-row estimate can't see;
  // reserve a little extra per folder so opening a sparse folder doesn't grow
  // the box. Only matters for count <= 10 (past that the box is capped + scrolls).
  expandableFolders?: number;
  children: React.ReactNode;
}

const ROW_GAP = 8; // matches space-y-2 between top-level rows
const FOLDER_CHROME = 16; // ~border-top + pt-2.5 + pb-3 around an expanded folder

// Reserves the height of up to 10 rows up-front and scrolls past that. The
// per-row size is estimated from the first top-level row (whose height is stable
// across expand/collapse), so the box is pre-sized to the fully expanded content
// and does not jump when a folder opens. Measures real rows so the estimate
// stays right on PC and mobile.
const ScrollableFileList: React.FC<Props> = ({ count, recomputeKey, expandableFolders = 0, children }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ minHeight?: number; maxHeight?: number }>({});

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () => {
      const flat = content.querySelectorAll('[data-row]');
      const rows: ArrayLike<Element> = flat.length ? flat : content.children;
      if (rows.length === 0) {
        setBox((p) => (p.minHeight === undefined && p.maxHeight === undefined ? p : {}));
        return;
      }
      const target = Math.min(count, 10);
      const firstH = (rows[0] as HTMLElement).getBoundingClientRect().height;
      const reserved = Math.ceil((firstH + ROW_GAP) * (target - 1) + firstH);
      // Past 10 rows the box is fixed and scrolls (no per-folder chrome needed);
      // at or below, pre-size with a small allowance per folder so a sparse
      // folder's wrapper chrome doesn't push the box past minHeight when opened.
      const next =
        count > 10
          ? { minHeight: reserved, maxHeight: reserved }
          : { minHeight: reserved + expandableFolders * FOLDER_CHROME };
      setBox((p) => (p.minHeight === next.minHeight && p.maxHeight === next.maxHeight ? p : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(content);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [count, recomputeKey, expandableFolders]);

  return (
    <div className="pr-0.5" style={{ ...box, overflowY: box.maxHeight !== undefined ? 'auto' : undefined }}>
      <div ref={contentRef} className="space-y-2">
        {children}
      </div>
    </div>
  );
};

export default ScrollableFileList;
