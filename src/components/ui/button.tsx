import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground can-hover:hover:bg-primary/90 active:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground can-hover:hover:bg-destructive/90 active:bg-destructive/90',
        outline: 'border border-input bg-background can-hover:hover:bg-accent can-hover:hover:text-accent-foreground active:bg-accent active:text-accent-foreground',
        secondary: 'border border-input bg-background text-foreground can-hover:hover:bg-accent can-hover:hover:text-accent-foreground active:bg-accent active:text-accent-foreground',
        ghost: 'can-hover:hover:bg-accent can-hover:hover:text-accent-foreground active:bg-accent active:text-accent-foreground',
        link: 'text-primary underline-offset-4 can-hover:hover:underline active:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-6',
        xl: 'h-12 px-5 md:px-5 rounded-xl text-sm md:text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
