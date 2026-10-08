import * as React from 'react';
import { cn } from '@/lib/utils';

// NC-Channel Product Admin 인풋 규격 (.inp) — 높이 34 · 라운드 6 · 테두리 var(--line2).
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-[34px] w-full rounded-[6px] border border-[var(--line2)] bg-white px-[10px] text-[13px] text-[var(--ink)] transition-colors',
        'placeholder:text-[var(--ink3)]',
        'focus-visible:border-[var(--ac)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ac)]/25',
        'disabled:cursor-not-allowed disabled:bg-[var(--th)] disabled:text-[var(--ink3)]',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
