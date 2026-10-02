import { cn } from '@/lib/utils';

/**
 * 공통 페이지 헤더 — 모든 페이지에서 제목·탭 위치를 동일하게 맞추기 위한 단일 규격(2026-10-01 사용자 요청).
 * 목록 페이지(App 스플래시·버전·위젯·배너 등)와 1:1 동일: '홈 › …' 브레드크럼(12px) → 22px 볼드 타이틀.
 * 하단 구분선 없음. 컨테이너 패딩(px-8 py-6)은 페이지가 제공한다.
 */
export function PageHeader({
  trail,
  title,
  subtitle,
  action,
  className,
}: {
  trail: string[]; // 현재 페이지까지의 경로(앞에 '홈' 자동)
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-4', className)}>
      <nav aria-label="breadcrumb" className="mb-1 flex flex-wrap items-center gap-1 text-[12px] text-slate-400">
        <span>홈</span>
        {trail.map((t, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="opacity-60">›</span>
            <span>{t}</span>
          </span>
        ))}
      </nav>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
