import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 공통 페이지 헤더 — 참고 화면(번호이동 관리) 기준.
 * 구조: 브레드크럼(홈 아이콘 + 경로) → 큰 타이틀(+선택 부제) / 우측 액션 → 하단 구분선.
 * 모든 목록 페이지가 동일한 헤더를 갖도록 이 컴포넌트를 사용한다.
 */
export function PageHeader({
  trail,
  title,
  subtitle,
  action,
  className,
}: {
  trail: string[]; // 홈 아이콘 뒤 경로. 마지막 항목 = 현재 페이지
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('border-b pb-4', className)}>
      <nav aria-label="breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Home className="h-3.5 w-3.5" />
        {trail.map((t, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 opacity-50" />
            <span className={i === trail.length - 1 ? 'font-medium text-foreground' : undefined}>{t}</span>
          </span>
        ))}
      </nav>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
