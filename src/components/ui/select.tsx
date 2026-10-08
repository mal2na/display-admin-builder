import * as React from 'react';
import { cn } from '@/lib/utils';

// NC-Channel Product Admin 셀렉트 규격 (.sel) — 네이티브 select + 커스텀 쉐브론.
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'sel flex h-[34px] w-full cursor-pointer rounded-[6px] border border-[var(--line2)] text-[13px] text-[var(--ink)] transition-colors',
      'focus-visible:border-[var(--ac)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ac)]/25',
      'disabled:cursor-not-allowed disabled:bg-[var(--th)] disabled:text-[var(--ink3)]',
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';
