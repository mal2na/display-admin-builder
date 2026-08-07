import * as React from 'react';
import { cn } from '@/lib/utils';

// BSS 디자인 시스템 인풋 — input-* 토큰 기반 (기본/포커스/에러/비활성 상태).
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-text-field-radius border border-input-border-default bg-input-bg-default px-3.5 text-sm text-input-text-input-default transition-colors',
        'placeholder:text-input-text-placeholder-default',
        'focus-visible:border-input-border-typing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
        'disabled:cursor-not-allowed disabled:border-input-border-inactive disabled:bg-input-bg-disabled disabled:text-input-text-input-disabled',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
