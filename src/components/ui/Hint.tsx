import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip';

interface Props {
  // The hint text shown in the custom tooltip (replaces the browser's native `title`).
  label: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  // A single element (button/link/etc.). Rendered as the tooltip trigger via Radix
  // `asChild`, so NO extra DOM wrapper is added — the child stays in place (layout-safe).
  // The child should carry its own `aria-label` for screen readers (the tooltip is only a
  // visual hint), since the native `title` it replaces also provided the accessible name.
  children: React.ReactElement;
}

// Project-wide custom button hint: hover-and-hold shows the same styled tooltip used
// across the app instead of the browser's default `title` bubble.
export const Hint: React.FC<Props> = ({ label, side = 'top', children }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side={side}>{label}</TooltipContent>
  </Tooltip>
);

export default Hint;
