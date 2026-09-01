'use client';

import { usePathname } from 'next/navigation';

/**
 * 관리자 콘텐츠 셸. 참고 화면(번호이동 관리) 기준: LNB·GNB는 라벤더 크롬, 콘텐츠는 그 위에 뜬 흰 라운드 패널.
 * 라벤더 여백(p-3)이 LNB와 콘텐츠 사이에 보이고, 흰 패널의 라운드 코너가 그 경계를 만든다.
 * 빌더(/builder)와 전시화면(/containers)은 자체 풀높이 레이아웃이라 그대로 렌더.
 */
export function AdminMain({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? '';
  // 프로모션 목록(/admin/events)은 코너유형처럼 흰 패널에 담고, 그 하위(빌더·미리보기·새 프로모션)만 풀블리드
  const fullBleed = path.includes('/builder') || path.startsWith('/admin/containers') || (path.startsWith('/admin/events') && path !== '/admin/events');

  if (fullBleed) {
    // 컨테이너 영역은 자체 레이아웃에서 라벤더+라운드를 처리 → 여백 없이 그대로.
    if (path.startsWith('/admin/containers')) {
      return <main className="min-h-0 flex-1 overflow-hidden bg-background">{children}</main>;
    }
    // 빌더·새 프로모션: 라벤더 여백 위에 자식(루트 div)이 라운드 패널로 뜬다.
    return <main className="min-h-0 flex-1 overflow-hidden bg-[#ebeef6] p-3">{children}</main>;
  }
  // 라벤더 여백 위에 흰 라운드 패널 — LNB와 콘텐츠 사이에 라운드가 생긴다.
  return (
    <main className="min-h-0 flex-1 overflow-hidden bg-[#ebeef6] p-3">
      <div className="h-full overflow-y-auto rounded-2xl border bg-card shadow-sm">{children}</div>
    </main>
  );
}
