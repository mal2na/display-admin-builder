import * as React from 'react';
import { cn } from '@/lib/utils';

// 네이티브 checkbox 기반. accent-color로 primary 인디고 반영.
export const Checkbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      'h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Checkbox.displayName = 'Checkbox';
