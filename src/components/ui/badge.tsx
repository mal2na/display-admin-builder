import * as React from 'react';
import { cn } from '@/lib/utils';

// BSS 디자인 시스템 배지 — mapped 토큰(badge-*) 기반.
type BadgeVariant =
  | 'default' | 'emphasis' | 'info' | 'success' | 'warning' | 'highlight'
  | 'negative' | 'destructive' | 'neutral' | 'secondary' | 'outline';

const variants: Record<BadgeVariant, string> = {
  default: 'bg-badge-bg-emphasis text-badge-text-emphasis',
  emphasis: 'bg-badge-bg-emphasis text-badge-text-emphasis',
  info: 'bg-badge-bg-info text-badge-text-info',
  success: 'bg-badge-bg-success text-badge-text-success',
  warning: 'bg-badge-bg-warning text-badge-text-warning',
  highlight: 'bg-badge-bg-highlight text-badge-text-highlight',
  negative: 'bg-badge-bg-negative text-badge-text-negative',
  destructive: 'bg-badge-bg-negative text-badge-text-negative',
  neutral: 'bg-badge-bg-neutral text-badge-text-neutral',
  secondary: 'bg-badge-bg-neutral text-badge-text-neutral',
  outline: 'border border-border text-foreground',
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-badge-radius-text px-2 py-0.5 text-[11px] font-semibold',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
