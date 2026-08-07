import * as React from 'react';
import { cn } from '@/lib/utils';

// BSS 디자인 시스템 버튼 — mapped 토큰(button-*) 기반. 상태(hover/active/disabled)까지 토큰으로.
type Variant = 'default' | 'primary' | 'tblue' | 'outline' | 'secondary' | 'ghost' | 'destructive';
type Size = 'default' | 'lg' | 'sm' | 'icon';

const variants: Record<Variant, string> = {
  // primary = 브랜드 채움 (t-blue)
  default: 'bg-button-primary-bg-enable text-button-primary-text-on hover:bg-button-primary-bg-hover active:bg-button-primary-bg-press disabled:bg-button-primary-bg-disable disabled:text-button-primary-text-disable',
  primary: 'bg-button-primary-bg-enable text-button-primary-text-on hover:bg-button-primary-bg-hover active:bg-button-primary-bg-press disabled:bg-button-primary-bg-disable disabled:text-button-primary-text-disable',
  // tblue = 브랜드 아웃라인(토널)
  tblue: 'border border-button-tblue-border-default text-button-tblue-text-on bg-transparent hover:bg-button-tblue-bg-hover active:bg-button-tblue-bg-press disabled:border-button-tblue-border-disable disabled:text-button-tblue-text-disable',
  // outline = 중립 아웃라인
  outline: 'border border-button-outline-border-enable bg-button-outline-bg-enable text-button-outline-text-on hover:border-button-outline-border-hover hover:bg-button-outline-bg-hover active:bg-button-outline-bg-press disabled:border-button-outline-border-disable disabled:bg-button-outline-bg-disable disabled:text-button-outline-text-disable',
  secondary: 'border border-button-outline-border-enable bg-button-outline-bg-enable text-button-outline-text-on hover:border-button-outline-border-hover hover:bg-button-outline-bg-hover active:bg-button-outline-bg-press disabled:text-button-outline-text-disable',
  // ghost = 배경/테두리 없음
  ghost: 'text-button-ghost-text-on hover:bg-button-ghost-bg-hover active:bg-button-ghost-bg-press disabled:text-button-ghost-text-disable',
  // destructive = 위험(빨강)
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50',
};

const sizes: Record<Size, string> = {
  lg: 'h-11 gap-2 rounded-button-radius-large px-6 text-[15px]',
  default: 'h-10 gap-1.5 rounded-button-radius-medium px-4 text-sm',
  sm: 'h-8 gap-1 rounded-button-radius-medium px-4 text-[13px]',
  icon: 'h-9 w-9 rounded-button-radius-medium',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
