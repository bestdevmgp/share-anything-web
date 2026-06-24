import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

interface Props {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}

// Expands/collapses by animating grid-template-rows 0fr<->1fr. Nested Collapsibles
// compose without a domino: opening a deep folder animates only its own row, and
// every already-open ancestor (at 1fr = content height) grows in real time to
// follow it — one coherent motion, not a sequence of per-level animations.
//
// Children mount when opened and stay mounted through the close animation, then
// unmount — so a collapsed subtree doesn't eagerly render (and load thumbnails for)
// folders the user hasn't opened.
const COLLAPSE_MS = 300;

const Collapsible: React.FC<Props> = ({ open, children, className }) => {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const id = setTimeout(() => setMounted(false), COLLAPSE_MS);
    return () => clearTimeout(id);
  }, [open]);

  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        className
      )}
    >
      <div className="overflow-hidden min-h-0">{open || mounted ? children : null}</div>
    </div>
  );
};

export default Collapsible;
