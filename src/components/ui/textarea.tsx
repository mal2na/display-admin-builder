import * as React from 'react';
import { cn } from '@/lib/utils';

// NC-Channel Product Admin 텍스트영역 규격 (textarea.inp).
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[72px] w-full resize-y rounded-[6px] border border-[var(--line2)] bg-white px-[10px] py-2 text-[13px] text-[var(--ink)] transition-colors',
      'placeholder:text-[var(--ink3)]',
      'focus-visible:border-[var(--ac)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ac)]/25',
      'disabled:cursor-not-allowed disabled:bg-[var(--th)] disabled:text-[var(--ink3)]',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
