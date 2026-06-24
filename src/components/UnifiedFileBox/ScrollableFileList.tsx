import React, { useLayoutEffect, useRef, useState } from 'react';

interface Props {
  // Visible row count (a collapsed folder counts as one row; an expanded folder as
  // its revealed descendants). Only used to re-measure the 10-row cap when the row
  // set changes — the box height itself follows the live content, not this number.
  count: number;
  // Changes when the visible layout changes (folder expand/collapse) so the cap is
  // re-measured against the current rows.
  recomputeKey?: string | number;
  // Accepted for backwards-compat; no longer used (the box follows real content, so
  // no per-folder chrome needs reserving).
  expandableFolders?: number;
  children: React.ReactNode;
}

const ROW_GAP = 8; // matches space-y-2 between top-level rows

// The box sizes to the *currently visible* content: a collapsed folder occupies a
// single row, an expanded folder its revealed children. Because the box has no fixed
// height (only a max), its height is `auto` and tracks the content in real time — so
// as the folder Collapsible animates its rows open/closed, the box grows and shrinks
// in lockstep, immediately and smoothly, with no pre-reserved space. Past 10 rows the
// box is capped and the rest scrolls. The cap is derived from the first top-level
// row, whose height is stable across expand/collapse, and re-measured on resize.
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
      // Height of 10 rows (9 gaps); the box never grows past this and scrolls instead.
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
