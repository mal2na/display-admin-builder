import * as React from 'react';
import { cn } from '@/lib/utils';
import { TONES, type Tone } from '@/components/ops-ui';

// 상태 칩 공식 규격 (ops-ui StatusPill 과 동일) — 라운드 6 · 높이 26 · 12px/600 · 테두리 없음.
type BadgeVariant =
  | 'default' | 'emphasis' | 'info' | 'success' | 'warning' | 'highlight'
  | 'negative' | 'destructive' | 'neutral' | 'secondary' | 'outline';

const VARIANT_TONE: Record<BadgeVariant, Tone> = {
  default: 'indigo', emphasis: 'indigo', highlight: 'indigo',
  info: 'blue',
  success: 'green',
  warning: 'amber',
  negative: 'red', destructive: 'red',
  neutral: 'neutral', secondary: 'neutral', outline: 'neutral',
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex h-[26px] items-center whitespace-nowrap rounded-[6px] px-2.5 text-[12px] font-semibold',
        TONES[VARIANT_TONE[variant]],
        className,
      )}
      {...props}
    />
  );
}
