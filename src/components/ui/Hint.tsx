import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip';

interface Props {
  label: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactElement;
}

export const Hint: React.FC<Props> = ({ label, side = 'top', children }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side={side}>{label}</TooltipContent>
  </Tooltip>
);

export default Hint;
