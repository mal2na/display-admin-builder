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
  divider = true,
  titlePrefix,
  back,
}: {
  trail: string[]; // 현재 페이지까지의 경로(앞에 '홈' 자동)
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** 제목 아래 구분선. 바로 밑에 탭이 오는 화면은 false (탭이 자기 선을 갖는다) */
  divider?: boolean;
  /** 제목 왼쪽에 붙는 노드(코너 유형 칩 등) */
  titlePrefix?: React.ReactNode;
  /** 제목 위 '← 돌아가기' 링크 */
  back?: React.ReactNode;
}) {
  return (
    <header className={cn('mb-0', className)}>
      <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--ink3)]">
        <span>홈</span>
        {trail.map((t, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="opacity-60">›</span>
            <span>{t}</span>
          </span>
        ))}
      </nav>
      <div className={cn('flex items-end justify-between gap-4 pt-2', divider ? 'border-b border-[var(--line)] pb-5' : 'pb-1')}>
        <div className="min-w-0">
          {back && <div className="mb-1.5">{back}</div>}
          <div className="flex flex-wrap items-center gap-2.5">
            {titlePrefix}
            <h1 className="m-0 text-[22px] font-bold tracking-[-0.4px] text-[var(--ink)]">{title}</h1>
          </div>
          {subtitle && <p className="mt-1.5 text-[13px] text-[var(--ink2)]">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
