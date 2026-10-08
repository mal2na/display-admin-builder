import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * 버튼 — Figma [BO-AX] BO 공통 `Button` (node 2580:3590) 실값.
 *
 * 크기 (spacing/button/*)
 *   cta     inset 12/28 · radius full   · control/16 semibold · 그림자 0 8 16 #1b0b6629
 *   lg      inset 11/24 · radius 10     · control/16 semibold · gap 8
 *   default inset  9/16 · radius  6     · body/14    semibold · gap 4   → 높이 38
 *   sm      inset  6/12 · radius  6     · control/14 medium            → 높이 32
 *   pill    inset  6/12 · radius full   · body/12   medium  (secondary)
 *
 * 색 (color/button/*)
 *   primary bg #3617ce · hover #502dfb · press #2f15b2 · disable #d0d2ff / text #fff
 *   outline bg #fff · border #c4c9cf · text #1a1a1a · hover bg #dce0e5 · press bg #c4c9cf
 *   t-blue  text·border #3617ce · hover bg #f1f2ff · press bg #b4b7ff
 *   ghost   text·border #1a1a1a
 *   red     text·border #ed3b3e · hover bg #ffe9e9 · press bg #fcb9b9
 */
type Variant = 'default' | 'primary' | 'cta' | 'tblue' | 'outline' | 'secondary' | 'ghost' | 'destructive';
type Size = 'default' | 'cta' | 'lg' | 'sm' | 'pill' | 'icon';

const variants: Record<Variant, string> = {
  default:
    'bg-[#3617ce] border border-[#3617ce] text-white hover:bg-[#502dfb] hover:border-[#502dfb] active:bg-[#2f15b2] disabled:bg-[#d0d2ff] disabled:border-[#d0d2ff] disabled:text-[#f1f2ff]',
  primary:
    'bg-[#3617ce] border border-[#3617ce] text-white hover:bg-[#502dfb] hover:border-[#502dfb] active:bg-[#2f15b2] disabled:bg-[#d0d2ff] disabled:border-[#d0d2ff] disabled:text-[#f1f2ff]',
  cta:
    'bg-[#3617ce] border border-[#3617ce] text-white shadow-[0_8px_16px_0_#1b0b6629] hover:bg-[#502dfb] active:bg-[#2f15b2] disabled:bg-[#d0d2ff] disabled:text-[#f1f2ff]',
  tblue:
    'border border-[#3617ce] bg-white text-[#3617ce] hover:bg-[#f1f2ff] active:bg-[#b4b7ff] disabled:border-[#b4b7ff] disabled:text-[#b4b7ff]',
  outline:
    'border border-[#c4c9cf] bg-white text-[#1a1a1a] hover:bg-[#dce0e5] active:bg-[#c4c9cf] active:border-[#b3b9c0] disabled:border-[#dce0e5] disabled:text-[#b3b9c0] disabled:bg-white',
  secondary:
    'border border-[#c4c9cf] bg-white text-[#697582] hover:bg-[#dce0e5] active:bg-[#c4c9cf] disabled:border-[#dce0e5] disabled:text-[#b3b9c0]',
  ghost:
    'border border-transparent bg-transparent text-[#1a1a1a] hover:bg-[#6c7b8e33] active:bg-[#5161714d] disabled:text-[#b3b9c0]',
  destructive:
    'border border-[#ed3b3e] bg-white text-[#ed3b3e] hover:bg-[#ffe9e9] active:bg-[#fcb9b9] disabled:border-[#fcb9b9] disabled:text-[#fcb9b9]',
};

const sizes: Record<Size, string> = {
  cta:     'gap-2 rounded-full px-7 py-3 text-[16px] font-semibold leading-[24px]',
  lg:      'gap-2 rounded-[10px] px-6 py-[11px] text-[16px] font-semibold leading-[24px]',
  default: 'gap-1 rounded-[6px] px-4 py-[9px] text-[14px] font-semibold leading-[20px]',
  sm:      'gap-1 rounded-[6px] px-3 py-[6px] text-[14px] font-medium leading-[20px]',
  pill:    'gap-0 rounded-full px-3 py-[6px] text-[12px] font-medium leading-[18px]',
  icon:    'h-9 w-9 rounded-[6px]',
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
        'inline-flex items-center justify-center whitespace-nowrap tracking-[-0.2px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3617ce]/40 disabled:pointer-events-none disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
