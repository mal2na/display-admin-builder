import * as React from 'react';
import { cn } from '@/lib/utils';

// NC-Channel Product Admin 버튼 규격 (.btn / .btn.pri / .btn.dng).
// 높이 36 · 라운드 7 · 테두리 var(--line2) · 굵기 600. variant API는 기존 그대로 유지한다.
type Variant = 'default' | 'primary' | 'tblue' | 'outline' | 'secondary' | 'ghost' | 'destructive';
type Size = 'default' | 'lg' | 'sm' | 'icon';

const variants: Record<Variant, string> = {
  // 브랜드 채움
  default:
    'bg-[var(--ac)] border border-[var(--ac)] text-white hover:bg-[var(--ac-h)] hover:border-[var(--ac-h)] disabled:opacity-40',
  primary:
    'bg-[var(--ac)] border border-[var(--ac)] text-white hover:bg-[var(--ac-h)] hover:border-[var(--ac-h)] disabled:opacity-40',
  // 브랜드 아웃라인(토널)
  tblue:
    'border border-[var(--ac3)] bg-[var(--ac2)] text-[var(--ac)] hover:bg-[var(--ac3)] disabled:opacity-40',
  // 기본 아웃라인 — 참고 디자인의 .btn
  outline:
    'border border-[var(--line2)] bg-white text-[var(--ink)] hover:bg-[#f7f7fa] disabled:opacity-40',
  secondary:
    'border border-[var(--line2)] bg-white text-[var(--ink)] hover:bg-[#f7f7fa] disabled:opacity-40',
  // 테두리 없음
  ghost:
    'border border-transparent bg-transparent text-[var(--ink2)] hover:bg-[var(--th)] hover:text-[var(--ink)] disabled:opacity-40',
  // 위험 — 참고 디자인의 .btn.dng (아웃라인 레드)
  destructive:
    'border border-[var(--badln)] bg-white text-[var(--bad)] hover:bg-[var(--badbg)] disabled:opacity-40',
};

const sizes: Record<Size, string> = {
  lg: 'h-[46px] min-w-[78px] gap-1.5 rounded-[8px] px-5 text-[15px]',
  default: 'h-9 gap-1.5 rounded-[7px] px-[15px] text-[13px]',
  sm: 'h-8 gap-1 rounded-[7px] px-3 text-[12.5px]',
  icon: 'h-9 w-9 rounded-[7px]',
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
        'inline-flex items-center justify-center whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ac)]/40 disabled:pointer-events-none disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
