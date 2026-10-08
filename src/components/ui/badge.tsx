import * as React from 'react';
import { cn } from '@/lib/utils';
import { TONES, type Tone } from '@/components/ops-ui';
import { CHIP_BASE } from '@/lib/display-taxonomy';

// 상태 칩 공식 규격 — [BO-AX] COMPNT Lib v1.8. 색은 5종뿐(보라 없음).
type BadgeVariant =
  | 'default' | 'emphasis' | 'info' | 'success' | 'warning' | 'highlight'
  | 'negative' | 'destructive' | 'neutral' | 'secondary' | 'outline';

const VARIANT_TONE: Record<BadgeVariant, Tone> = {
  default: 'info', emphasis: 'info', highlight: 'info', info: 'info',
  success: 'success',
  warning: 'warning',
  negative: 'negative', destructive: 'negative',
  neutral: 'neutral', secondary: 'neutral', outline: 'neutral',
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={cn(CHIP_BASE, TONES[VARIANT_TONE[variant]], className)} {...props} />;
}
